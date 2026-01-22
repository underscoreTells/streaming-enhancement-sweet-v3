import { beforeEach, describe, it, expect, vi } from 'vitest';
import { TwitchUserAdapter } from '../../src/adapters/TwitchUserAdapter';
import type { TwitchUser } from '../../src/User';

describe('TwitchUserAdapter', () => {
  let twitchUser: TwitchUser;
  let adapter: TwitchUserAdapter;

  beforeEach(() => {
    twitchUser = {
      platform: 'twitch',
      twitchId: '123456',
      username: 'ninja',
      displayName: 'Ninja',
      profileImageUrl: 'https://example.com/avatar.jpg',
      bio: 'Professional gamer',
      createdAt: new Date('2016-01-01T00:00:00Z')
    };
    adapter = new TwitchUserAdapter(twitchUser);
  });

  it('returns correct platform', () => {
    expect(adapter.getPlatform()).toBe('twitch');
  });

  it('returns correct ID', () => {
    expect(adapter.getId()).toBe('123456');
  });

  it('returns correct username', () => {
    expect(adapter.getUsername()).toBe('ninja');
  });

  it('returns display name or fallback to username', () => {
    expect(adapter.getDisplayName()).toBe('Ninja');
  });

  it('falls back to username when display name is null', () => {
    const userWithNullDisplayName = {
      ...twitchUser,
      displayName: null
    };
    const adapterWithNull = new TwitchUserAdapter(userWithNullDisplayName);
    expect(adapterWithNull.getDisplayName()).toBe('ninja');
  });

  it('returns correct avatar', () => {
    expect(adapter.getAvatar()).toBe('https://example.com/avatar.jpg');
  });

  it('returns null for missing avatar', () => {
    const userNoAvatar = {
      ...twitchUser,
      profileImageUrl: null
    };
    const adapterNoAvatar = new TwitchUserAdapter(userNoAvatar);
    expect(adapterNoAvatar.getAvatar()).toBeNull();
  });

  it('returns correct bio', () => {
    expect(adapter.getBio()).toBe('Professional gamer');
  });

  it('returns null for missing bio', () => {
    const userNoBio = {
      ...twitchUser,
      bio: null
    };
    const adapterNoBio = new TwitchUserAdapter(userNoBio);
    expect(adapterNoBio.getBio()).toBeNull();
  });

  it('returns correct createdAt', () => {
    expect(adapter.getCreatedAt()).toEqual(new Date('2016-01-01T00:00:00Z'));
  });

  it('returns null for missing createdAt', () => {
    const userNoCreated = {
      ...twitchUser,
      createdAt: null
    };
    const adapterNoCreated = new TwitchUserAdapter(userNoCreated);
    expect(adapterNoCreated.getCreatedAt()).toBeNull();
  });

  it('has no platform-specific features', () => {
    expect(adapter.hasFeature('anything')).toBe(false);
  });

  it('returns null for all features', () => {
    expect(adapter.getFeature('anything')).toBeNull();
  });

  it('returns raw user data from toStorage', () => {
    expect(adapter.toStorage()).toBe(twitchUser);
  });
});
