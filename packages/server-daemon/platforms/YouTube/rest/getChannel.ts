import type { RestClient } from './RestClient';
import type { YouTubeChannel, YouTubeApiResponse } from './types';

export async function getChannel(
  client: RestClient,
  identifier: string
): Promise<YouTubeChannel | null> {
  try {
    const params: Record<string, string> = {
      part: 'snippet,statistics',
    };

    if (identifier.startsWith('@')) {
      params.forHandle = identifier;
    } else if (/^UC[A-Za-z0-9_-]{22}$/.test(identifier)) {
      // Channel ID format: UC prefix + 22 alphanumeric/underscore/hyphen chars
      params.id = identifier;
    } else if (/^[A-Za-z0-9_.-]{3,30}$/.test(identifier)) {
      // Legacy username format: 3-30 chars, allows dots, preserve case
      params.forUsername = identifier;
    } else {
      // Fallback to ID for other formats
      params.id = identifier;
    }

    const response = await client.get('/channels', params) as YouTubeApiResponse<YouTubeChannel>;
    
    if (!response.items || response.items.length === 0) {
      return null;
    }

    return response.items[0];
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Failed to get channel for ${identifier}:`, error.message);
    }
    return null;
  }
}
