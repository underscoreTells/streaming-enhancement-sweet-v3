import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { createLogger } from 'winston';
import { RestClient } from '../../../platforms/Kick/rest/RestClient';
import { getUser, getChannelLivestream, getUsersByUsername } from '../../../platforms/Kick/rest/getUser';

describe('getUser', () => {
  let logger: ReturnType<typeof createLogger>;
  let mockRestClient: RestClient;

  beforeEach(() => {
    logger = createLogger({ silent: true });
    mockRestClient = {
      get: vi.fn(),
    } as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getUser', () => {
    it('should return user data for valid channel', async () => {
      const mockChannelData = {
        id: 12345,
        username: 'testuser',
        display_name: 'Test User',
      };

      vi.spyOn(mockRestClient, 'get').mockResolvedValue(mockChannelData);

      const result = await getUser(mockRestClient, 'testuser');

      expect(result).toEqual({
        id: '12345',
        username: 'testuser',
        displayName: 'Test User',
      });

      expect(mockRestClient.get).toHaveBeenCalledWith('/api/v2/channels/testuser');
    });

    it('should return null for 404 error', async () => {
      vi.spyOn(mockRestClient, 'get').mockRejectedValue(new Error('Request failed: 404 Not Found'));

      const result = await getUser(mockRestClient, 'nonexistent');

      expect(result).toBeNull();
    });

    it('should return null for missing data.id', async () => {
      const invalidData = {
        username: 'testuser',
      };

      vi.spyOn(mockRestClient, 'get').mockResolvedValue(invalidData);

      const result = await getUser(mockRestClient, 'testuser');

      expect(result).toBeNull();
    });

    it('should return null for null response', async () => {
      vi.spyOn(mockRestClient, 'get').mockResolvedValue(null);

      const result = await getUser(mockRestClient, 'testuser');

      expect(result).toBeNull();
    });

    it('should return null for undefined response', async () => {
      vi.spyOn(mockRestClient, 'get').mockResolvedValue(undefined);

      const result = await getUser(mockRestClient, 'testuser');

      expect(result).toBeNull();
    });

    it('should handle missing display_name', async () => {
      const mockChannelData = {
        id: 12345,
        username: 'testuser',
      };

      vi.spyOn(mockRestClient, 'get').mockResolvedValue(mockChannelData);

      const result = await getUser(mockRestClient, 'testuser');

      expect(result).toEqual({
        id: '12345',
        username: 'testuser',
        displayName: null,
      });
    });

    it('should throw non-404 errors', async () => {
      vi.spyOn(mockRestClient, 'get').mockRejectedValue(new Error('Network error'));

      await expect(getUser(mockRestClient, 'testuser')).rejects.toThrow('Network error');
    });

    it('should convert id to string', async () => {
      const mockChannelData = {
        id: 99999,
        username: 'testuser',
        display_name: 'Test User',
      };

      vi.spyOn(mockRestClient, 'get').mockResolvedValue(mockChannelData);

      const result = await getUser(mockRestClient, 'testuser');

      expect(result?.id).toBe('99999');
      expect(typeof result?.id).toBe('string');
    });

    it('should preserve original username case', async () => {
      const mockChannelData = {
        id: 12345,
        username: 'TestUser',
        display_name: 'Test User',
      };

      vi.spyOn(mockRestClient, 'get').mockResolvedValue(mockChannelData);

      const result = await getUser(mockRestClient, 'testuser');

      expect(result?.username).toBe('TestUser');
    });
  });

  describe('getChannelLivestream', () => {
    it('should return livestream data for active stream', async () => {
      const mockLivestreamData = {
        id: 'stream123',
        session_title: 'Test Stream',
        viewer_count: 1000,
        is_live: true,
      };

      vi.spyOn(mockRestClient, 'get').mockResolvedValue(mockLivestreamData);

      const result = await getChannelLivestream(mockRestClient, '12345');

      expect(result).toEqual(mockLivestreamData);
      expect(mockRestClient.get).toHaveBeenCalledWith('/api/v2/channels/12345/livestream');
    });

    it('should return null for 404 error', async () => {
      vi.spyOn(mockRestClient, 'get').mockRejectedValue(new Error('Request failed: 404 Not Found'));

      const result = await getChannelLivestream(mockRestClient, '12345');

      expect(result).toBeNull();
    });

    it('should return null when channel is not streaming', async () => {
      vi.spyOn(mockRestClient, 'get').mockResolvedValue(null);

      const result = await getChannelLivestream(mockRestClient, '12345');

      expect(result).toBeNull();
    });

    it('should throw non-404 errors', async () => {
      vi.spyOn(mockRestClient, 'get').mockRejectedValue(new Error('Network error'));

      await expect(getChannelLivestream(mockRestClient, '12345')).rejects.toThrow('Network error');
    });
  });

  describe('getUsersByUsername', () => {
    it('should return array of users for valid usernames', async () => {
      const mockUsers = [
        { id: 12345, username: 'user1', display_name: 'User One' },
        { id: 67890, username: 'user2', display_name: 'User Two' },
      ];

      vi.spyOn(mockRestClient, 'get')
        .mockResolvedValueOnce(mockUsers[0])
        .mockResolvedValueOnce(mockUsers[1]);

      const result = await getUsersByUsername(mockRestClient, ['user1', 'user2'], logger);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: '12345',
        username: 'user1',
        displayName: 'User One',
      });
      expect(result[1]).toEqual({
        id: '67890',
        username: 'user2',
        displayName: 'User Two',
      });
    });

    it('should handle 404 for non-existent users', async () => {
      vi.spyOn(mockRestClient, 'get')
        .mockResolvedValueOnce({ id: 12345, username: 'user1', display_name: 'User One' })
        .mockRejectedValueOnce(new Error('Request failed: 404 - Not Found'));

      const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {});

      const result = await getUsersByUsername(mockRestClient, ['user1', 'nonexistent'], logger);

      expect(result).toHaveLength(1);
      expect(result[0].username).toBe('user1');

      warnSpy.mockRestore();
    });

    it('should return empty array for no usernames', async () => {
      const result = await getUsersByUsername(mockRestClient, [], logger);

      expect(result).toHaveLength(0);
      expect(mockRestClient.get).not.toHaveBeenCalled();
    });

    it('should handle network errors and continue with remaining users', async () => {
      const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {});

      vi.spyOn(mockRestClient, 'get')
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ id: 67890, username: 'user2', display_name: 'User Two' });

      const result = await getUsersByUsername(mockRestClient, ['user1', 'user2'], logger);

      expect(result).toHaveLength(1);
      expect(result[0].username).toBe('user2');
      expect(warnSpy).toHaveBeenCalledTimes(1);

      warnSpy.mockRestore();
    });

    it('should work without logger parameter', async () => {
      vi.spyOn(mockRestClient, 'get').mockRejectedValueOnce(new Error('404 Not Found'));

      const result = await getUsersByUsername(mockRestClient, ['nonexistent']);

      expect(result).toHaveLength(0);
    });

    it('should preserve user order in result array', async () => {
      const mockUsers = [
        { id: 11111, username: 'user1', display_name: 'User One' },
        { id: 22222, username: 'user2', display_name: 'User Two' },
        { id: 33333, username: 'user3', display_name: 'User Three' },
      ];

      vi.spyOn(mockRestClient, 'get')
        .mockResolvedValueOnce(mockUsers[0])
        .mockResolvedValueOnce(mockUsers[1])
        .mockResolvedValueOnce(mockUsers[2]);

      const result = await getUsersByUsername(mockRestClient, ['user1', 'user2', 'user3'], logger);

      expect(result).toHaveLength(3);
      expect(result[0].username).toBe('user1');
      expect(result[1].username).toBe('user2');
      expect(result[2].username).toBe('user3');
    });
  });

  describe('Integration', () => {
    it('should handle mixed success and failure results', async () => {
      const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {});

      vi.spyOn(mockRestClient, 'get')
        .mockResolvedValueOnce({ id: 12345, username: 'user1', display_name: 'User One' })
        .mockRejectedValueOnce(new Error('Request failed: 404 - Not Found'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ id: 67890, username: 'user4', display_name: 'User Four' });

      const result = await getUsersByUsername(mockRestClient, ['user1', 'user2', 'user3', 'user4'], logger);

      expect(result).toHaveLength(2);
      expect(result[0].username).toBe('user1');
      expect(result[1].username).toBe('user4');
      expect(warnSpy).toHaveBeenCalledTimes(1);

      warnSpy.mockRestore();
    });
  });
});
