import { RestClient } from './RestClient';
import type { KickChannelData, KickLivestreamData } from './types';

export interface UserResult {
  id: string;
  username: string;
  displayName: string | null;
}

export interface UserError extends Error {
  code?: string;
}

export async function getUser(restClient: RestClient, username: string): Promise<UserResult | null> {
  try {
    const data = await restClient.get(`/api/v2/channels/${username}`) as KickChannelData;

    if (!data || !data.id) {
      return null;
    }

    return {
      id: String(data.id),
      username: data.username,
      displayName: data.display_name || null,
    };
  } catch (error) {
    if (error instanceof Error && error.message.includes('404')) {
      return null;
    }
    throw error;
  }
}

export async function getChannelLivestream(restClient: RestClient, channelId: string): Promise<KickLivestreamData | null> {
  try {
    const data = await restClient.get(`/api/v2/channels/${channelId}/livestream`) as KickLivestreamData;
    return data;
  } catch (error) {
    if (error instanceof Error && error.message.includes('404')) {
      return null;
    }
    throw error;
  }
}

export async function getUsersByUsername(restClient: RestClient, usernames: string[]): Promise<UserResult[]> {
  const results: UserResult[] = [];

  for (const username of usernames) {
    try {
      const user = await getUser(restClient, username);
      if (user) {
        results.push(user);
      }
    } catch (error) {
      console.error(`Failed to fetch user ${username}:`, error);
    }
  }

  return results;
}
