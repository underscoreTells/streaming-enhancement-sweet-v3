import { beforeEach, describe, it, expect, vi } from 'vitest';
import { TwitchStreamAdapter } from '../../src/adapters/TwitchStreamAdapter';
import type { TwitchStream } from '../../src/Stream';
import type { CategoryCache } from '../../src/cache/CategoryCache';

describe('TwitchStreamAdapter', () => {
  const mockCategoryCache: CategoryCache = {
    getCategory: vi.fn().mockResolvedValue('Fortnite'),
    clear: vi.fn(),
  };

  let twitchStream: TwitchStream;
  let adapter: TwitchStreamAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    twitchStream = {
      platform: 'twitch',
      twitchId: '1234567890',
      username: 'ninja',
      title: 'SOLO Q TO CONQUER! !prime',
      categoryId: '493057',
      tags: ['English', 'Fortnite'],
      isMature: false,
      language: 'en',
      thumbnailUrl: 'https://static-cdn.jtvnw.net/previews-ttv/live_user_ninja-{width}x{height}.jpg',
      channelPoints: 1000
    };
    adapter = new TwitchStreamAdapter(twitchStream, mockCategoryCache);
  });

  it('returns correct platform', () => {
    expect(adapter.getPlatform()).toBe('twitch');
  });

  it('returns correct ID', () => {
    expect(adapter.getId()).toBe('1234567890');
  });

  it('returns correct title', () => {
    expect(adapter.getTitle()).toBe('SOLO Q TO CONQUER! !prime');
  });

  it('resolves category from cache', async () => {
    const category = await adapter.getCategory();
    expect(category).toBe('Fortnite');
    expect(mockCategoryCache.getCategory).toHaveBeenCalledWith('493057', 'twitch');
  });

  it('returns No Category for empty categoryId', async () => {
    const emptyStream = {
      ...twitchStream,
      categoryId: ''
    };
    const emptyAdapter = new TwitchStreamAdapter(emptyStream, mockCategoryCache);
    const category = await emptyAdapter.getCategory();
    expect(category).toBe('No Category');
    expect(mockCategoryCache.getCategory).not.toHaveBeenCalled();
  });

  it('returns correct thumbnail', () => {
    expect(adapter.getThumbnail()).toBe('https://static-cdn.jtvnw.net/previews-ttv/live_user_ninja-{width}x{height}.jpg');
  });

  it('returns null for missing thumbnail', () => {
    const noThumbStream = {
      ...twitchStream,
      thumbnailUrl: null
    };
    const noThumbAdapter = new TwitchStreamAdapter(noThumbStream, mockCategoryCache);
    expect(noThumbAdapter.getThumbnail()).toBeNull();
  });

  it('returns correct tags', () => {
    expect(adapter.getTags()).toEqual(['English', 'Fortnite']);
  });

  it('has twitchChannelPoints feature', () => {
    expect(adapter.hasFeature('twitchChannelPoints')).toBe(true);
  });

  it('does not have unlisted features', () => {
    expect(adapter.hasFeature('kickTips')).toBe(false);
  });

  it('returns channel points feature', () => {
    const feature = adapter.getFeature('twitchChannelPoints');
    expect(feature).toEqual({ current: 1000 });
  });

  it('returns null for unknown features', () => {
    expect(adapter.getFeature('unknown')).toBeNull();
  });

  it('returns raw stream data from toStorage', () => {
    expect(adapter.toStorage()).toBe(twitchStream);
  });
});
