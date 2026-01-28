import type { RestClient } from './RestClient';
import type { YouTubeVideo, YouTubeApiResponse } from './types';

export async function getVideo(
  client: RestClient,
  videoId: string
): Promise<YouTubeVideo | null> {
  try {
    const response = await client.get('/videos', {
      id: videoId,
      part: 'snippet,contentDetails,statistics,liveStreamingDetails',
    }) as YouTubeApiResponse<YouTubeVideo>;

    if (!response.items || response.items.length === 0) {
      return null;
    }

    return response.items[0];
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Failed to get video ${videoId}:`, error.message);
    }
    return null;
  }
}

export async function getVideoByChannel(
  client: RestClient,
  channelId: string,
  eventType: string = 'live'
): Promise<YouTubeVideo | null> {
  try {
    const response = await client.get('/search', {
      channelId,
      part: 'snippet',
      eventType,
      type: 'video',
      maxResults: 1,
    }) as YouTubeApiResponse<any>;

    if (!response.items || response.items.length === 0) {
      return null;
    }

    const video = await getVideo(client, response.items[0].id.videoId);
    return video;
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Failed to get video for channel ${channelId}:`, error.message);
    }
    return null;
  }
}
