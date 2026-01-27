import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createLogger } from 'winston';
import { EventSubSubscriptionManager } from '../../../../platforms/Twitch/eventsub/EventSubSubscription';
import type { SubscriptionData } from '../../../../platforms/Twitch/eventsub/types';

describe('EventSubSubscriptionManager', () => {
  let logger: ReturnType<typeof createLogger>;
  let manager: EventSubSubscriptionManager;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    logger = createLogger({ silent: true });
    manager = new EventSubSubscriptionManager(logger, {
      clientId: 'test_client_id',
      accessToken: 'test_access_token',
    });

    mockFetch = vi.fn();
    global.fetch = mockFetch;
  });

  describe('create', () => {
    it('should create EventSub subscription', async () => {
      const mockSubscription: SubscriptionData = {
        id: 'sub123',
        status: 'enabled',
        type: 'channel.follow',
        version: '2',
        condition: { broadcaster_user_id: '12345' },
        created_at: '2024-01-01T00:00:00Z',
        cost: 0,
        transport: {
          method: 'websocket',
          session_id: 'sess456',
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [mockSubscription] }),
      });

      const subscription = await manager.create('channel.follow', '2', { broadcaster_user_id: '12345' }, 'sess456');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.twitch.tv/helix/eventsub/subscriptions',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Client-ID': 'test_client_id',
            'Authorization': 'Bearer test_access_token',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'channel.follow',
            version: '2',
            condition: { broadcaster_user_id: '12345' },
            transport: {
              method: 'websocket',
              session_id: 'sess456',
            },
          }),
        })
      );

      expect(subscription).toEqual(mockSubscription);
    });

    it('should throw error on failed creation', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        text: async () => 'Forbidden',
      });

      await expect(
        manager.create('channel.follow', '2', { broadcaster_user_id: '12345' }, 'sess456')
      ).rejects.toThrow('Failed to create subscription: 403 Forbidden');
    });

    it('should throw error on 409 conflict', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 409,
        text: async () => 'Conflict: subscription already exists',
      });

      await expect(
        manager.create('channel.follow', '2', { broadcaster_user_id: '12345' }, 'sess456')
      ).rejects.toThrow('Failed to create subscription: 409 Conflict: subscription already exists');
    });

    it('should throw error on 400 bad request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => 'Bad Request: invalid condition',
      });

      await expect(
        manager.create('invalid.type', '1', { invalid: 'condition' }, 'sess456')
      ).rejects.toThrow('Failed to create subscription: 400 Bad Request: invalid condition');
    });
  });

  describe('delete', () => {
    it('should delete EventSub subscription', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => '',
      });

      await manager.delete('sub123');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.twitch.tv/helix/eventsub/subscriptions?id=sub123',
        expect.objectContaining({
          method: 'DELETE',
          headers: {
            'Client-ID': 'test_client_id',
            'Authorization': 'Bearer test_access_token',
          },
        })
      );
    });

    it('should throw error on failed deletion', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () => 'Not Found',
      });

      await expect(manager.delete('sub123')).rejects.toThrow('Failed to delete subscription: 404 Not Found');
    });

    it('should throw error on 403 forbidden', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        text: async () => 'Forbidden',
      });

      await expect(manager.delete('sub123')).rejects.toThrow('Failed to delete subscription: 403 Forbidden');
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors during create', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(
        manager.create('channel.follow', '2', { broadcaster_user_id: '12345' }, 'sess456')
      ).rejects.toThrow('Network error');
    });

    it('should handle network errors during delete', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(manager.delete('sub123')).rejects.toThrow('Network error');
    });

    it('should handle empty response data', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] }),
      });

      await expect(
        manager.create('channel.follow', '2', { broadcaster_user_id: '12345' }, 'sess456')
      ).rejects.toThrow();
    });
  });

  describe('Headers', () => {
    it('should include correct headers for create', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [{ id: 'sub1' }] }),
      });

      await manager.create('channel.follow', '2', { broadcaster_user_id: '12345' }, 'sess456');

      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[1].headers).toHaveProperty('Client-ID', 'test_client_id');
      expect(callArgs[1].headers).toHaveProperty('Authorization', 'Bearer test_access_token');
      expect(callArgs[1].headers).toHaveProperty('Content-Type', 'application/json');
    });

    it('should include correct headers for delete', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => '',
      });

      await manager.delete('sub123');

      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[1].headers).toHaveProperty('Client-ID', 'test_client_id');
      expect(callArgs[1].headers).toHaveProperty('Authorization', 'Bearer test_access_token');
      expect(callArgs[1].headers).not.toHaveProperty('Content-Type');
    });
  });
});
