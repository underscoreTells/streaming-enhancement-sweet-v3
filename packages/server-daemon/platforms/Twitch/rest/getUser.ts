import type { RestClient } from './RestClient';
import type { TwitchUsersResponse, TwitchUser } from './types';

export async function getUser(
  restClient: RestClient,
  username: string
): Promise<TwitchUser | null> {
  const response = await restClient.get('/users', { login: username }) as TwitchUsersResponse;
  
  if (response.data && response.data.length > 0) {
    return response.data[0];
  }
  
  return null;
}

export async function getUsers(
  restClient: RestClient,
  usernames: string[]
): Promise<TwitchUser[]> {
  if (usernames.length === 0) return [];
  
  // Twitch API accepts multiple login params: ?login=user1&login=user2
  const params = usernames.reduce<Record<string, string>>((acc, name, index) => {
    acc[`login[${index}]`] = name;
    return acc;
  }, {});
  
  const response = await restClient.get('/users', params) as TwitchUsersResponse;
  return response.data || [];
}

export async function getUsersById(
  restClient: RestClient,
  userIds: string[]
): Promise<TwitchUser[]> {
  if (userIds.length === 0) return [];
  
  // Twitch API accepts multiple id params: ?id=id1&id=id2
  const params = userIds.reduce<Record<string, string>>((acc, id, index) => {
    acc[`id[${index}]`] = id;
    return acc;
  }, {});
  
  const response = await restClient.get('/users', params) as TwitchUsersResponse;
  return response.data || [];
}
