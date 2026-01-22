import { describe, it, expect } from 'vitest';
import type { StreamStats } from '../src/StreamStats';

describe('StreamStats', () => {
  describe('Twitch/Kick stats', () => {
    it('accepts valid stats with null subscriberCount', () => {
      const stats: StreamStats = {
        streamId: '1234567890',
        viewerCount: 14250,
        followerCount: 52300,
        subscriberCount: null,
        uptime: 1800,
        timestamp: new Date('2024-01-15T10:30:00Z')
      };

      expect(stats.streamId).toBe('1234567890');
      expect(stats.viewerCount).toBe(14250);
      expect(stats.followerCount).toBe(52300);
      expect(stats.subscriberCount).toBeNull();
      expect(stats.uptime).toBe(1800);
    });

    it('accepts stats with null uptime (temporary state)', () => {
      const stats: StreamStats = {
        streamId: '1234567890',
        viewerCount: 14250,
        followerCount: 52300,
        subscriberCount: null,
        uptime: null,
        timestamp: new Date()
      };

      expect(stats.uptime).toBeNull();
    });

    it('validates all fields are present', () => {
      const timestamp = new Date('2024-01-15T10:30:00Z');
      const stats: StreamStats = {
        streamId: '1234567890',
        viewerCount: 14250,
        followerCount: 52300,
        subscriberCount: null,
        uptime: 1800,
        timestamp
      };

      expect(stats).toBeDefined();
      expect(timestamp).toBeInstanceOf(Date);
    });
  });

  describe('YouTube stats', () => {
    it('accepts valid stats with subscriberCount and zero followers', () => {
      const stats: StreamStats = {
        streamId: 'abc123',
        viewerCount: 8900,
        followerCount: 0,
        subscriberCount: 125000,
        uptime: 2400,
        timestamp: new Date('2024-01-15T10:30:00Z')
      };

      expect(stats.followerCount).toBe(0);
      expect(stats.subscriberCount).toBe(125000);
    });
  });

  describe('type safety', () => {
    it('enforces timestamp is Date object', () => {
      const date = new Date('2024-01-15T10:30:00Z');
      const stats: StreamStats = {
        streamId: 'test',
        viewerCount: 100,
        followerCount: 1000,
        subscriberCount: null,
        uptime: 0,
        timestamp: date
      };

      expect(stats.timestamp.getTime()).toBe(date.getTime());
    });

    it('enforces numeric types for counts', () => {
      const stats: StreamStats = {
        streamId: 'test',
        viewerCount: 100,
        followerCount: 1000,
        subscriberCount: null,
        uptime: 0,
        timestamp: new Date()
      };

      expect(typeof stats.viewerCount).toBe('number');
      expect(typeof stats.followerCount).toBe('number');
      expect(typeof stats.uptime).toBe('number');
    });

    it('allows number for subscriberCount (YouTube)', () => {
      const stats: StreamStats = {
        streamId: 'test',
        viewerCount: 100,
        followerCount: 0,
        subscriberCount: 5000,
        uptime: 0,
        timestamp: new Date()
      };

      expect(typeof stats.subscriberCount).toBe('number');
    });
  });

  describe('edge cases', () => {
    it('allows zero viewer count', () => {
      const stats: StreamStats = {
        streamId: 'test',
        viewerCount: 0,
        followerCount: 1000,
        subscriberCount: null,
        uptime: 0,
        timestamp: new Date()
      };

      expect(stats.viewerCount).toBe(0);
    });

    it('allows zero follower count (YouTube)', () => {
      const stats: StreamStats = {
        streamId: 'test',
        viewerCount: 100,
        followerCount: 0,
        subscriberCount: 5000,
        uptime: 0,
        timestamp: new Date()
      };

      expect(stats.followerCount).toBe(0);
    });

    it('handles large viewer counts', () => {
      const stats: StreamStats = {
        streamId: 'test',
        viewerCount: 9999999,
        followerCount: 5000000,
        subscriberCount: null,
        uptime: 7200,
        timestamp: new Date()
      };

      expect(stats.viewerCount).toBe(9999999);
      expect(stats.followerCount).toBe(5000000);
    });

    it('handles null subscriberCount for Twitch/Kick', () => {
      const stats: StreamStats = {
        streamId: 'test',
        viewerCount: 100,
        followerCount: 1000,
        subscriberCount: null,
        uptime: 0,
        timestamp: new Date()
      };

      expect(stats.subscriberCount).toBeNull();
    });

    it('handles null uptime for temporary state', () => {
      const stats: StreamStats = {
        streamId: 'test',
        viewerCount: 100,
        followerCount: 1000,
        subscriberCount: null,
        uptime: null,
        timestamp: new Date()
      };

      expect(stats.uptime).toBeNull();
    });
  });

  describe('timestamp tracking', () => {
    it('captures timestamp when created', () => {
      const before = new Date();
      const stats: StreamStats = {
        streamId: 'test',
        viewerCount: 100,
        followerCount: 1000,
        subscriberCount: null,
        uptime: 0,
        timestamp: new Date()
      };
      const after = new Date();

      expect(stats.timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(stats.timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('allows custom timestamp', () => {
      const customTime = new Date('2024-01-15T10:30:00Z');
      const stats: StreamStats = {
        streamId: 'test',
        viewerCount: 100,
        followerCount: 1000,
        subscriberCount: null,
        uptime: 0,
        timestamp: customTime
      };

      expect(stats.timestamp.getTime()).toBe(customTime.getTime());
    });
  });
});
