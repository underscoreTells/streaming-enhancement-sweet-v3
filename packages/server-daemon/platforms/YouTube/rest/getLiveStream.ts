import type { RestClient } from './RestClient';
import type { YouTubeLiveStream, YouTubeApiResponse } from './types';

export async function getLiveStream(
  client: RestClient,
  streamId: string
): Promise<YouTubeLiveStream | null> {
  try {
    const response = await client.get('/liveStreams', {
      id: streamId,
      part: 'snippet,cdn,status,contentDetails',
    }) as YouTubeApiResponse<YouTubeLiveStream>;

    if (!response.items || response.items.length === 0) {
      return null;
    }

    return response.items[0];
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Failed to get live stream ${streamId}:`, error.message);
    }
    return null;
  }
}

export async function getLiveStreamByChannel(
  client: RestClient,
  channelId: string
): Promise<YouTubeLiveStream | null> {
  try {
    const response = await client.get('/liveStreams', {
      channelId,
      part: 'snippet,cdn,status,contentDetails',
    }) as YouTubeApiResponse<YouTubeLiveStream>;

    if (!response.items || response.items.length === 0) {
      return null;
    }

    return response.items[0];
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Failed to get live stream for channel ${channelId}:`, error.message);
    }
    return null;
  }
}
