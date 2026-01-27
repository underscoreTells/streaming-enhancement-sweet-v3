import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createLogger } from 'winston';
import { RestClient } from '../../../../platforms/Twitch/rest/RestClient';
import { getUser, getUsers, getUsersById } from '../../../../platforms/Twitch/rest/getUser';

describe('getUser', () => {
  let logger: ReturnType<typeof createLogger>;
  let restClient: RestClient;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    logger = createLogger({ silent: true });

    restClient = new RestClient(logger, {
      clientId: 'test_client_id',
      getAccessToken: vi.fn().mockResolvedValue('test_token'),
    });

    mockFetch = vi.fn();
    global.fetch = mockFetch;

    vi.spyOn(restClient, 'get').mockImplementation(async (endpoint, params) => {
      return {
        data: [
          {
            id: '123456',
            login: 'testuser',
            display_name: 'TestUser',
            type: '',
            broadcaster_type: '',
            description: '',
            profile_image_url: '',
            offline_image_url: '',
            view_count: 0,
            created_at: '2024-01-01T00:00:00Z',
          },
        ],
      };
    });
  });

  describe('getUser', () => {
    it('should return user data for valid username', async () => {
      const user = await getUser(restClient, 'testuser');

      expect(user).not.toBeNull();
      expect(user?.id).toBe('123456');
      expect(user?.login).toBe('testuser');
      expect(user?.display_name).toBe('TestUser');
    });

    it('should call restClient.get with correct parameters', async () => {
      const getSpy = vi.spyOn(restClient, 'get');

      await getUser(restClient, 'testuser');

      expect(getSpy).toHaveBeenCalledWith('/users', { login: 'testuser' });
    });

    it('should return null for non-existent user', async () => {
      vi.spyOn(restClient, 'get').mockResolvedValueOnce({ data: [] });

      const user = await getUser(restClient, 'nonexistent');

      expect(user).toBeNull();
    });

    it('should handle usernames with special characters', async () => {
      vi.spyOn(restClient, 'get').mockResolvedValueOnce({
        data: [{ id: '789', login: 'user_with_underscore', display_name: 'User_With_Underscore' }],
      });

      const user = await getUser(restClient, 'user_with_underscore');

      expect(user).not.toBeNull();
      expect(user?.login).toBe('user_with_underscore');
    });

    it('should handle API errors gracefully', async () => {
      vi.spyOn(restClient, 'get').mockRejectedValueOnce(new Error('API Error'));

      await expect(getUser(restClient, 'testuser')).rejects.toThrow('API Error');
    });
  });

  describe('getUsers', () => {
    it('should return array of users', async () => {
      vi.spyOn(restClient, 'get').mockResolvedValueOnce({
        data: [
          { id: '1', login: 'user1', display_name: 'User1', type: '', broadcaster_type: '', description: '', profile_image_url: '', offline_image_url: '', view_count: 0, created_at: '2024-01-01T00:00:00Z' },
          { id: '2', login: 'user2', display_name: 'User2', type: '', broadcaster_type: '', description: '', profile_image_url: '', offline_image_url: '', view_count: 0, created_at: '2024-01-01T00:00:00Z' },
        ],
      });

      const users = await getUsers(restClient, ['user1', 'user2']);

      expect(users).toHaveLength(2);
      expect(users[0].login).toBe('user1');
      expect(users[1].login).toBe('user2');
    });

    it('should pass login array', async () => {
      const getSpy = vi.spyOn(restClient, 'get');

      await getUsers(restClient, ['user1', 'user2', 'user3']);

      expect(getSpy).toHaveBeenCalledWith('/users', { login: ['user1', 'user2', 'user3'] });
    });

    it('should return empty array for empty usernames input', async () => {
      const getSpy = vi.spyOn(restClient, 'get');

      const users = await getUsers(restClient, []);

      expect(users).toEqual([]);
      expect(getSpy).not.toHaveBeenCalled();
    });

    it('should handle single username', async () => {
      vi.spyOn(restClient, 'get').mockResolvedValueOnce({
        data: [{ id: '1', login: 'singleuser', display_name: 'SingleUser', type: '', broadcaster_type: '', description: '', profile_image_url: '', offline_image_url: '', view_count: 0, created_at: '2024-01-01T00:00:00Z' }],
      });

      const users = await getUsers(restClient, ['singleuser']);

      expect(users).toHaveLength(1);
      expect(users[0].login).toBe('singleuser');
    });

    it('should return empty array when API returns no data', async () => {
      vi.spyOn(restClient, 'get').mockResolvedValueOnce({ data: [] });

      const users = await getUsers(restClient, ['user1', 'user2']);

      expect(users).toEqual([]);
    });

    it('should handle partial results', async () => {
      vi.spyOn(restClient, 'get').mockResolvedValueOnce({
        data: [
          { id: '1', login: 'user1', display_name: 'User1', type: '', broadcaster_type: '', description: '', profile_image_url: '', offline_image_url: '', view_count: 0, created_at: '2024-01-01T00:00:00Z' },
        ],
      });

      const users = await getUsers(restClient, ['user1', 'user2']);

      expect(users).toHaveLength(1);
      expect(users[0].login).toBe('user1');
    });
  });

  describe('getUsersById', () => {
    it('should return array of users by IDs', async () => {
      vi.spyOn(restClient, 'get').mockResolvedValueOnce({
        data: [
          { id: '123456', login: 'user1', display_name: 'User1', type: '', broadcaster_type: '', description: '', profile_image_url: '', offline_image_url: '', view_count: 0, created_at: '2024-01-01T00:00:00Z' },
          { id: '789012', login: 'user2', display_name: 'User2', type: '', broadcaster_type: '', description: '', profile_image_url: '', offline_image_url: '', view_count: 0, created_at: '2024-01-01T00:00:00Z' },
        ],
      });

      const users = await getUsersById(restClient, ['123456', '789012']);

      expect(users).toHaveLength(2);
      expect(users[0].id).toBe('123456');
      expect(users[1].id).toBe('789012');
    });

    it('should pass id array', async () => {
      const getSpy = vi.spyOn(restClient, 'get');

      await getUsersById(restClient, ['111', '222', '333']);

      expect(getSpy).toHaveBeenCalledWith('/users', { id: ['111', '222', '333'] });
    });

    it('should return empty array for empty IDs input', async () => {
      const getSpy = vi.spyOn(restClient, 'get');

      const users = await getUsersById(restClient, []);

      expect(users).toEqual([]);
      expect(getSpy).not.toHaveBeenCalled();
    });

    it('should handle single ID', async () => {
      vi.spyOn(restClient, 'get').mockResolvedValueOnce({
        data: [{ id: '123456', login: 'singleuser', display_name: 'SingleUser', type: '', broadcaster_type: '', description: '', profile_image_url: '', offline_image_url: '', view_count: 0, created_at: '2024-01-01T00:00:00Z' }],
      });

      const users = await getUsersById(restClient, ['123456']);

      expect(users).toHaveLength(1);
      expect(users[0].id).toBe('123456');
    });

    it('should return empty array when API returns no data', async () => {
      vi.spyOn(restClient, 'get').mockResolvedValueOnce({ data: [] });

      const users = await getUsersById(restClient, ['123456', '789012']);

      expect(users).toEqual([]);
    });

    it('should handle mixed valid and invalid IDs', async () => {
      vi.spyOn(restClient, 'get').mockResolvedValueOnce({
        data: [
          { id: '123456', login: 'user1', display_name: 'User1', type: '', broadcaster_type: '', description: '', profile_image_url: '', offline_image_url: '', view_count: 0, created_at: '2024-01-01T00:00:00Z' },
        ],
      });

      const users = await getUsersById(restClient, ['123456', 'invalid']);

      expect(users).toHaveLength(1);
      expect(users[0].id).toBe('123456');
    });
  });

  describe('Error Handling', () => {
    it('should propagate errors from restClient', async () => {
      vi.spyOn(restClient, 'get').mockRejectedValueOnce(new Error('Network error'));

      await expect(getUser(restClient, 'testuser')).rejects.toThrow('Network error');
    });

    it('should handle API returning undefined data', async () => {
      vi.spyOn(restClient, 'get').mockResolvedValueOnce({ data: undefined });

      const user = await getUser(restClient, 'testuser');

      expect(user).toBeNull();
    });

    it('should handle API returning null data', async () => {
      vi.spyOn(restClient, 'get').mockResolvedValueOnce({ data: null });

      const user = await getUser(restClient, 'testuser');

      expect(user).toBeNull();
    });
  });

  describe('Response Structure', () => {
    it('should preserve all user fields', async () => {
      vi.spyOn(restClient, 'get').mockResolvedValueOnce({
        data: [
          {
            id: '123456',
            login: 'testuser',
            display_name: 'TestUser',
            type: 'admin',
            broadcaster_type: 'partner',
            description: 'Test description',
            profile_image_url: 'https://example.com/profile.jpg',
            offline_image_url: 'https://example.com/offline.jpg',
            view_count: 1000000,
            created_at: '2020-01-01T00:00:00Z',
          },
        ],
      });

      const user = await getUser(restClient, 'testuser');

      expect(user).toMatchObject({
        id: '123456',
        login: 'testuser',
        display_name: 'TestUser',
        type: 'admin',
        broadcaster_type: 'partner',
        description: 'Test description',
        profile_image_url: 'https://example.com/profile.jpg',
        offline_image_url: 'https://example.com/offline.jpg',
        view_count: 1000000,
        created_at: '2020-01-01T00:00:00Z',
      });
    });
  });
});
