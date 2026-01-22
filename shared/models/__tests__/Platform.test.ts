import { describe, it, expect } from 'vitest';
import { PLATFORM_VALUES, isValidPlatform, getPlatformName } from '../src/Platform';

describe('Platform', () => {
  describe('isValidPlatform', () => {
    it('returns true for valid platforms', () => {
      expect(isValidPlatform('twitch')).toBe(true);
      expect(isValidPlatform('kick')).toBe(true);
      expect(isValidPlatform('youtube')).toBe(true);
    });

    it('returns false for invalid values', () => {
      expect(isValidPlatform(null)).toBe(false);
      expect(isValidPlatform(undefined)).toBe(false);
      expect(isValidPlatform('twitter')).toBe(false);
      expect(isValidPlatform('TWITCH')).toBe(false);
      expect(isValidPlatform('')).toBe(false);
      expect(isValidPlatform(123)).toBe(false);
      expect(isValidPlatform({})).toBe(false);
    });

    it('narrows type correctly', () => {
      const value: unknown = 'twitch';
      if (isValidPlatform(value)) {
        expect(getPlatformName(value)).toBe('Twitch');
      }
    });
  });

  describe('getPlatformName', () => {
    it('returns correct human-readable names', () => {
      expect(getPlatformName('twitch')).toBe('Twitch');
      expect(getPlatformName('kick')).toBe('Kick');
      expect(getPlatformName('youtube')).toBe('YouTube');
    });
  });

  describe('PLATFORM_VALUES const', () => {
    it('has correct values', () => {
      expect(PLATFORM_VALUES.Twitch).toBe('twitch');
      expect(PLATFORM_VALUES.Kick).toBe('kick');
      expect(PLATFORM_VALUES.YouTube).toBe('youtube');
    });
  });
});
