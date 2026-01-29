import { Logger } from 'winston';
import type { YouTubeError } from './types';

export interface RestClientConfig {
  baseUrl?: string;
  timeout?: number;
  rateLimitMs?: number;
  username?: string;
}

export class RestClient {
  private baseUrl: string;
  private timeout: number;
  private rateLimitMs: number;
  private username: string | null;
  private lastRequestTime = 0;
  private tokenValue: string | null = null;
  private tokenRefreshCallback: ((username: string) => Promise<string>) | null = null;

  constructor(
    private logger: Logger,
    private config: RestClientConfig = {}
  ) {
    this.baseUrl = config.baseUrl || 'https://www.googleapis.com/youtube/v3';
    this.timeout = config.timeout || 30000;
    this.rateLimitMs = config.rateLimitMs || 1000;
    this.username = config.username ?? null;
  }

  setUsername(username: string): void {
    this.username = username;
  }

  setToken(token: string): void {
    this.tokenValue = token;
  }

  setTokenRefreshCallback(callback: (username: string) => Promise<string>): void {
    this.tokenRefreshCallback = callback;
  }

  async get(endpoint: string, params?: Record<string, string | number | boolean>): Promise<unknown> {
    await this.checkRateLimit();

    const url = this.buildUrl(endpoint, params);
    return this.request(url, 'GET');
  }

  async post(endpoint: string, data?: unknown): Promise<unknown> {
    await this.checkRateLimit();

    const url = this.buildUrl(endpoint);
    return this.request(url, 'POST', data);
  }

  async put(endpoint: string, data?: unknown): Promise<unknown> {
    await this.checkRateLimit();

    const url = this.buildUrl(endpoint);
    return this.request(url, 'PUT', data);
  }

  async delete(endpoint: string): Promise<unknown> {
    await this.checkRateLimit();

    const url = this.buildUrl(endpoint);
    return this.request(url, 'DELETE');
  }

  private async request(url: string, method: string, data?: unknown): Promise<unknown> {
    let attempts = 0;
    const maxAttempts = 4;

    while (attempts < maxAttempts) {
      attempts++;

      try {
        const response = await this.makeRequest(url, method, data);

        if (response.status === 401 && this.username && this.tokenRefreshCallback) {
          if (attempts >= maxAttempts) {
            throw new Error(`Authentication failed after ${attempts}/${maxAttempts} attempts`);
          }
          this.logger.debug('Token expired (401), attempting refresh');
          try {
            const newToken = await this.tokenRefreshCallback(this.username);
            this.tokenValue = newToken;
            this.logger.info('Token refreshed successfully');
            await this.sleep(100);
            continue;
          } catch (refreshError) {
            this.logger.error('Failed to refresh token:', refreshError);
            throw new Error('Authentication failed and token refresh failed');
          }
        }

        if (response.status === 429) {
          if (attempts >= maxAttempts) {
            throw new Error(`Rate limited (429) after ${attempts}/${maxAttempts} attempts`);
          }
          const resetTime = this.parseRetryAfter(response);
          const waitTime = Math.max(resetTime, 5000);
          this.logger.warn(`Rate limited (429), waiting ${waitTime}ms before retry (attempt ${attempts}/${maxAttempts})`);
          await this.sleep(waitTime);
          continue;
        }

        if (response.status >= 500) {
          if (attempts < maxAttempts - 1) {
            const backoffTime = Math.min(1000 * Math.pow(2, attempts), 8000);
            this.logger.warn(`Server error (${response.status}), retrying in ${backoffTime}ms (attempt ${attempts}/${maxAttempts})`);
            await this.sleep(backoffTime);
            continue;
          }
        }

        if (!response.ok) {
          const errorData = await this.safeJson<YouTubeError>(response);
          const errorMessage = errorData?.error?.message || errorData?.error?.errors?.[0]?.message || response.statusText;
          throw new Error(`Request failed: ${response.status} - ${errorMessage}`);
        }

        return await response.json();
      } catch (error) {
        if (error instanceof Error && attempts < maxAttempts - 1) {
          const backoffTime = Math.min(1000 * Math.pow(2, attempts - 1), 8000);
          this.logger.warn(`Request failed: ${error.message}, retrying in ${backoffTime}ms (attempt ${attempts}/${maxAttempts})`);
          await this.sleep(backoffTime);
          continue;
        }
        throw error;
      }
    }

    throw new Error('Request failed after maximum retry attempts');
  }

  private async makeRequest(url: string, method: string, data?: unknown): Promise<Response> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'streaming-daemon/1.0',
    };

    if (this.tokenValue) {
      headers['Authorization'] = `Bearer ${this.tokenValue}`;
    }

    const options: RequestInit = {
      method,
      headers,
    };

    if (data && (method === 'POST' || method === 'PUT')) {
      options.body = JSON.stringify(data);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private buildUrl(endpoint: string, params?: Record<string, string | number | boolean>): string {
    let url = `${this.baseUrl}${endpoint}`;

    if (params && Object.keys(params).length > 0) {
      const searchParams = new URLSearchParams();
      for (const [key, value] of Object.entries(params)) {
        searchParams.append(key, String(value));
      }
      url += `?${searchParams.toString()}`;    }

    return url;
  }

  private async checkRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.rateLimitMs) {
      const waitTime = this.rateLimitMs - timeSinceLastRequest;
      this.logger.debug(`Rate limit: waiting ${waitTime}ms`);
      await this.sleep(waitTime);
    }

    this.lastRequestTime = Date.now();
  }

  private parseRetryAfter(response: Response): number {
    const retryAfter = response.headers.get('Retry-After');
    if (retryAfter) {
      const seconds = parseInt(retryAfter, 10);
      if (!isNaN(seconds)) {
        return seconds * 1000;
      }
    }
    return 5000;
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async safeJson<T>(response: Response): Promise<T | null> {
    try {
      return (await response.json()) as T;
    } catch {
      return null;
    }
  }
}
