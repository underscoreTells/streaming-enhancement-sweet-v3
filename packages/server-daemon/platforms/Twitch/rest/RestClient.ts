import { Logger } from 'winston';

export interface RestClientOptions {
  clientId: string;
  getAccessToken: () => Promise<string>;
}

export class RestClient {
  private readonly baseUrl = 'https://api.twitch.tv/helix';
  private rateLimit: {
    remaining: number;
    reset: number;
  } = {
    remaining: 800,
    reset: Date.now() + 60 * 1000, // 1 minute from now
  };

  constructor(
    private logger: Logger,
    private options: RestClientOptions
  ) {}

  private async getHeaders(): Promise<Record<string, string>> {
    return {
      'Client-ID': this.options.clientId,
      'Authorization': `Bearer ${await this.options.getAccessToken()}`,
      'Content-Type': 'application/json',
    };
  }

  async get(endpoint: string, params?: Record<string, string | number | boolean | (string | number)[]>): Promise<unknown> {
    await this.waitForRateLimit();

    const url = new URL(`${this.baseUrl}${endpoint}`);
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          value.forEach(v => url.searchParams.append(key, String(v)));
        } else {
          url.searchParams.append(key, String(value));
        }
      });
    }

    return this.request(url.toString(), 'GET');
  }

  async post(endpoint: string, data?: unknown): Promise<unknown> {
    await this.waitForRateLimit();

    return this.request(`${this.baseUrl}${endpoint}`, 'POST', data);
  }

  async put(endpoint: string, data?: unknown): Promise<unknown> {
    await this.waitForRateLimit();

    return this.request(`${this.baseUrl}${endpoint}`, 'PUT', data);
  }

  async delete(endpoint: string): Promise<unknown> {
    await this.waitForRateLimit();

    return this.request(`${this.baseUrl}${endpoint}`, 'DELETE');
  }

  private async request(url: string, method: string, body?: unknown): Promise<unknown> {
    const maxRetries = 3;
    let attempt = 0;

    while (attempt < maxRetries) {
      const headers = await this.getHeaders();
      
      try {
        const response = await fetch(url, {
          method,
          headers,
          body: body ? JSON.stringify(body) : undefined,
        });

        this.updateRateLimit(response);

        if (response.ok) {
          return response.json();
        }

        const isRetryable = response.status === 429 || response.status >= 500;

        if (isRetryable && attempt < maxRetries - 1) {
          const delay = this.getBackoffDelay(attempt, response.status);
          this.logger.warn(`Request failed with ${response.status}, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
          await this.sleep(delay);
          attempt++;
          continue;
        }

        const errorText = await response.text();
        throw new Error(`Request failed: ${response.status} - ${errorText}`);
      } catch (error) {
        if (error instanceof Error) {
          if (attempt < maxRetries - 1) {
            const delay = this.getBackoffDelay(attempt, 500);
            this.logger.warn(`Request error, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`, { error: error.message });
            await this.sleep(delay);
            attempt++;
            continue;
          }
        }
        throw error;
      }
    }

    throw new Error('Max retries reached');
  }

  private updateRateLimit(response: Response) {
    const limit = response.headers.get('Ratelimit-Limit');
    const remaining = response.headers.get('Ratelimit-Remaining');
    const reset = response.headers.get('Ratelimit-Reset');

    if (limit && remaining && reset) {
      this.rateLimit.remaining = parseInt(remaining, 10);
      this.rateLimit.reset = parseInt(reset, 10) * 1000;
    }
  }

  private async waitForRateLimit(): Promise<void> {
    if (this.rateLimit.remaining <= 0) {
      const now = Date.now();
      const resetTime = this.rateLimit.reset;

      if (resetTime > now) {
        const waitTime = resetTime - now;
        this.logger.debug(`Rate limit reached, waiting ${waitTime}ms`);
        await this.sleep(waitTime);
      }
    }
  }

  private getBackoffDelay(attempt: number, statusCode: number): number {
    if (statusCode === 429) {
      const now = Date.now();
      const resetTime = this.rateLimit.reset;
      const waitTime = Math.max(resetTime - now, 0);
      return waitTime + 1000; // Add 1 second buffer
    }

    // Exponential backoff for 5xx errors
    return Math.pow(2, attempt) * 1000 + Math.random() * 1000;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
