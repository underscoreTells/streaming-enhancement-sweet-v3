/**
 * Interface for platform REST API integration
 * Handles GET, POST, PUT requests to platform REST APIs
 */
export interface PlatformRestStrategy {
  /** Platform identifier (e.g., 'twitch', 'kick', 'youtube') */
  readonly platform: string;

  /**
   * GET request to platform REST API
   */
  get(endpoint: string, params?: Record<string, string | number | boolean>): Promise<unknown>;

  /**
   * POST request to platform REST API
   */
  post(endpoint: string, data?: unknown): Promise<unknown>;

  /**
   * PUT request to platform REST API
   */
  put(endpoint: string, data?: unknown): Promise<unknown>;

  /**
   * DELETE request to platform REST API
   */
  delete(endpoint: string): Promise<unknown>;
}
