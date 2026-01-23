import type { PlatformStream } from '../Stream';
import { TwitchStreamAdapter } from '../adapters/TwitchStreamAdapter';
import { KickStreamAdapter } from '../adapters/KickStreamAdapter';
import { YouTubeStreamAdapter } from '../adapters/YouTubeStreamAdapter';
import type { StreamAdapter } from '../adapters/StreamAdapter';
import type { CategoryCache } from '../cache/CategoryCache';
import { TwitchConverter } from '../converters/TwitchConverter';
import { KickConverter } from '../converters/KickConverter';
import { YouTubeConverter } from '../converters/YouTubeConverter';

/**
 * Creates a StreamAdapter instance from a normalized PlatformStream type.
 *
 * @param platformStream - The platform-specific stream data
 * @param cache - Optional category cache for resolving category IDs to names
 * @returns A StreamAdapter implementation for the given platform
 *
 * @example
 * ```typescript
 * const stream = createStreamAdapter(twitchStream, cache);
 * console.log(stream.getPlatform()); // 'twitch'
 * console.log(stream.getTitle()); // 'My Awesome Stream'
 * ```
 */
export function createStreamAdapter(
  platformStream: PlatformStream,
  cache?: CategoryCache
): StreamAdapter {
  switch (platformStream.platform) {
    case 'twitch':
      return new TwitchStreamAdapter(platformStream, cache);
    case 'kick':
      return new KickStreamAdapter(platformStream, cache);
    case 'youtube':
      return new YouTubeStreamAdapter(platformStream, cache);
    default:
      const _exhaustiveCheck: never = platformStream;
      throw new Error(`Unsupported platform: ${String(_exhaustiveCheck)}`);
  }
}

/**
 * Creates a StreamAdapter directly from a raw API response.
 * This is a convenience function that combines conversion and adapter creation.
 *
 * @param rawApiData - The raw API response from a streaming platform
 * @param platform - The platform the data is from ('twitch', 'kick', or 'youtube')
 * @param cache - Optional category cache
 * @returns A StreamAdapter implementation
 *
 * @example
 * ```typescript
 * // From Twitch API response
 * const twitchResponse = await twitchApi.getStream(userId);
 * const stream = createStreamAdapterFromRaw(twitchResponse, 'twitch', cache);
 * ```
 */
export function createStreamAdapterFromRaw(
  rawApiData: unknown,
  platform: 'twitch' | 'kick' | 'youtube',
  cache?: CategoryCache
): StreamAdapter {
  let platformStream: PlatformStream;

  switch (platform) {
    case 'twitch':
      platformStream = TwitchConverter.convertStream(rawApiData);
      break;
    case 'kick':
      platformStream = KickConverter.convertStream(rawApiData);
      break;
    case 'youtube':
      platformStream = YouTubeConverter.convertStream(rawApiData);
      break;
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }

  return createStreamAdapter(platformStream, cache);
}

/**
 * Helper function to create a PlatformStreamRecord from platform stream data.
 *
 * NOTE: This function is dependent on Phase 11 implementation.
 * The PlatformStreamRecord type will be defined in the new Stream module.
 *
 * @param commonId - The common stream ID linking multiple platforms
 * @param platformStream - The platform-specific stream data
 * @returns A PlatformStreamRecord instance for database storage
 *
 * @example
 * ```typescript
 * const record = createPlatformStreamRecord('stream-123', twitchStream);
 * await streamService.createPlatformStream(record);
 * ```
 */
export function createPlatformStreamRecord(
  commonId: string,
  platformStream: PlatformStream
): PlatformStreamRecord {
  return {
    id: crypto.randomUUID(),
    commonId,
    platform: platformStream.platform,
    data: platformStream,
    createdAt: new Date()
  };
}

/**
 * Type for platform stream records stored in the database.
 * This will be fully defined in Phase 11 when the new Stream module is created.
 */
export interface PlatformStreamRecord {
  id: string;
  commonId: string;
  platform: 'twitch' | 'kick' | 'youtube';
  data: PlatformStream;
  createdAt: Date;
}
