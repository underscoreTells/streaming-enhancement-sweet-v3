import type { RestClient } from './RestClient';
import type { YouTubeLiveBroadcast, YouTubeApiResponse } from './types';

export async function getLiveBroadcast(
  client: RestClient,
  broadcastId: string
): Promise<YouTubeLiveBroadcast | null> {
  try {
    const response = await client.get('/liveBroadcasts', {
      id: broadcastId,
      part: 'snippet,status,contentDetails,statistics',
    }) as YouTubeApiResponse<YouTubeLiveBroadcast>;

    if (!response.items || response.items.length === 0) {
      return null;
    }

    return response.items[0];
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Failed to get live broadcast ${broadcastId}:`, error.message);
    }
    return null;
  }
}

export async function getLiveBroadcastByChannel(
  client: RestClient,
  channelId: string,
  broadcastStatus?: string
): Promise<YouTubeLiveBroadcast | null> {
  try {
    const params: Record<string, string> = {
      channelId,
      part: 'snippet,status,contentDetails,statistics',
    };

    if (broadcastStatus) {
      params.broadcastStatus = broadcastStatus;
    }

    const response = await client.get('/liveBroadcasts', params) as YouTubeApiResponse<YouTubeLiveBroadcast>;

    if (!response.items || response.items.length === 0) {
      return null;
    }

    return response.items[0];
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Failed to get live broadcast for channel ${channelId}:`, error.message);
    }
    return null;
  }
}
