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
    } else {
      const lowerIdentifier = identifier.toLowerCase();
      if (/^[a-z0-9_-]{3,24}$/.test(lowerIdentifier)) {
        params.forUsername = identifier;
      } else {
        params.id = identifier;
      }
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
