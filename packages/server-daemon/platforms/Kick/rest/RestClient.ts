import { Logger } from 'winston';
import type { KickChannelData, KickLivestreamData, KickErrorResponse } from './types';

interface RestClientConfig {
  baseUrl?: string;
  timeout?: number;
}

export class RestClient {
  private baseUrl: string;
  private timeout: number;
  private lastRequestTime = 0;
  private minRequestInterval = 1000;
  private rateLimitQueue: Array<() => void> = [];
  private isProcessingQueue = false;

  constructor(private logger: Logger, config: RestClientConfig = {}) {
    this.baseUrl = config.baseUrl || 'https://kick.com';
    this.timeout = config.timeout || 30000;
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

        if (response.status === 429) {
          this.logger.warn(`Rate limited (429), waiting 5 seconds before retry (attempt ${attempts}/${maxAttempts})`);
          await this.sleep(5000);
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
          const errorData = await this.safeJson<KickErrorResponse>(response);
          throw new Error(`Request failed: ${response.status} ${errorData?.message || response.statusText}`);
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
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'streaming-daemon/1.0',
      },
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
      url += `?${searchParams.toString()}`;
    }

    return url;
  }

  private async checkRateLimit(): Promise<void> {
    return new Promise<void>((resolve) => {
      this.rateLimitQueue.push(() => {
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;

        if (timeSinceLastRequest < this.minRequestInterval) {
          const waitTime = this.minRequestInterval - timeSinceLastRequest;
          this.logger.debug(`Rate limit: waiting ${waitTime}ms`);
          (async () => {
            await this.sleep(waitTime);
            this.lastRequestTime = Date.now();
            this.processQueue();
            resolve();
          })();
        } else {
          this.lastRequestTime = Date.now();
          this.processQueue();
          resolve();
        }
      });

      this.processQueue();
    });
  }

  private processQueue(): void {
    if (this.isProcessingQueue || this.rateLimitQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;
    const nextTask = this.rateLimitQueue.shift();
    if (nextTask) {
      nextTask();
    }
    this.isProcessingQueue = false;
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
