import { describe, it, expect } from 'vitest';
import {
  serializeTokenSet,
  deserializeTokenSet,
  calculateRefreshTimes,
  isTokenValid,
  shouldRefreshToken,
  type TokenSet,
} from '../../platforms/types';

describe('TokenSet', () => {
  describe('serializeTokenSet', () => {
    it('should serialize TokenSet to JSON string', () => {
      const tokenSet: TokenSet = {
        access_token: 'test_access_token',
        refresh_token: 'test_refresh_token',
        expires_at: new Date('2025-01-19T12:00:00Z'),
        refresh_at: new Date('2025-01-19T11:55:00Z'),
        scope: ['read', 'write'],
      };

      const serialized = serializeTokenSet(tokenSet);
      const parsed = JSON.parse(serialized);

      expect(parsed.access_token).toBe('test_access_token');
      expect(parsed.refresh_token).toBe('test_refresh_token');
      expect(parsed.expires_at).toBe('2025-01-19T12:00:00.000Z');
      expect(parsed.refresh_at).toBe('2025-01-19T11:55:00.000Z');
      expect(parsed.scope).toEqual(['read', 'write']);
    });

    it('should handle missing refresh_token', () => {
      const tokenSet: TokenSet = {
        access_token: 'test_access_token',
        expires_at: new Date('2025-01-19T12:00:00Z'),
        refresh_at: new Date('2025-01-19T11:55:00Z'),
        scope: ['read'],
      };

      const serialized = serializeTokenSet(tokenSet);
      const parsed = JSON.parse(serialized);

      expect(parsed.refresh_token).toBeUndefined();
    });
  });

  describe('deserializeTokenSet', () => {
    it('should deserialize JSON string to TokenSet', () => {
      const json = JSON.stringify({
        access_token: 'test_access_token',
        refresh_token: 'test_refresh_token',
        expires_at: '2025-01-19T12:00:00.000Z',
        refresh_at: '2025-01-19T11:55:00.000Z',
        scope: ['read', 'write'],
      });

      const deserialized = deserializeTokenSet(json);

      expect(deserialized.access_token).toBe('test_access_token');
      expect(deserialized.refresh_token).toBe('test_refresh_token');
      expect(deserialized.expires_at).toEqual(new Date('2025-01-19T12:00:00.000Z'));
      expect(deserialized.refresh_at).toEqual(new Date('2025-01-19T11:55:00.000Z'));
      expect(deserialized.scope).toEqual(['read', 'write']);
    });

    it('should handle missing refresh_token', () => {
      const json = JSON.stringify({
        access_token: 'test_access_token',
        expires_at: '2025-01-19T12:00:00.000Z',
        refresh_at: '2025-01-19T11:55:00.000Z',
        scope: ['read'],
      });

      const deserialized = deserializeTokenSet(json);

      expect(deserialized.refresh_token).toBeUndefined();
    });
  });

  describe('calculateRefreshTimes', () => {
    it('should calculate expires_at and refresh_at with default buffer', () => {
      const expiresAt = new Date('2025-01-19T12:00:00.000Z');
      const times = calculateRefreshTimes(expiresAt);

      expect(times.expires_at).toEqual(expiresAt);
      expect(times.refresh_at).toEqual(new Date('2025-01-19T11:55:00.000Z'));
    });

    it('should calculate refresh_at with custom buffer', () => {
      const expiresAt = new Date('2025-01-19T12:00:00.000Z');
      const times = calculateRefreshTimes(expiresAt, 10);

      expect(times.expires_at).toEqual(expiresAt);
      expect(times.refresh_at).toEqual(new Date('2025-01-19T11:50:00.000Z'));
    });

    it('should not modify the original expiresAt date', () => {
      const expiresAt = new Date('2025-01-19T12:00:00.000Z');
      calculateRefreshTimes(expiresAt);

      expect(expiresAt).toEqual(new Date('2025-01-19T12:00:00.000Z'));
    });
  });

  describe('isTokenValid', () => {
    it('should return true for token that has not expired', () => {
      const tokenSet: TokenSet = {
        access_token: 'test_token',
        expires_at: new Date(Date.now() + 3600000),
        refresh_at: new Date(Date.now() + 300000),
        scope: ['read'],
      };

      expect(isTokenValid(tokenSet)).toBe(true);
    });

    it('should return false for expired token', () => {
      const tokenSet: TokenSet = {
        access_token: 'test_token',
        expires_at: new Date(Date.now() - 1000),
        refresh_at: new Date(Date.now() - 3600000),
        scope: ['read'],
      };

      expect(isTokenValid(tokenSet)).toBe(false);
    });

    it('should return false for token that expires now', () => {
      const tokenSet: TokenSet = {
        access_token: 'test_token',
        expires_at: new Date(),
        refresh_at: new Date(Date.now() - 300000),
        scope: ['read'],
      };

      expect(isTokenValid(tokenSet)).toBe(false);
    });
  });

  describe('shouldRefreshToken', () => {
    it('should return true for token that needs refresh', () => {
      const tokenSet: TokenSet = {
        access_token: 'test_token',
        expires_at: new Date(Date.now() + 3600000),
        refresh_at: new Date(Date.now() - 1000),
        scope: ['read'],
      };

      expect(shouldRefreshToken(tokenSet)).toBe(true);
    });

    it('should return false for token that does not need refresh', () => {
      const tokenSet: TokenSet = {
        access_token: 'test_token',
        expires_at: new Date(Date.now() + 3600000),
        refresh_at: new Date(Date.now() + 300000),
        scope: ['read'],
      };

      expect(shouldRefreshToken(tokenSet)).toBe(false);
    });

    it('should return true for token that needs refresh now', () => {
      const tokenSet: TokenSet = {
        access_token: 'test_token',
        expires_at: new Date(Date.now() + 3600000),
        refresh_at: new Date(),
        scope: ['read'],
      };

      expect(shouldRefreshToken(tokenSet)).toBe(true);
    });
  });
});
