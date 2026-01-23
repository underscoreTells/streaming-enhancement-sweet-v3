import type { PlatformUser } from '../User';
import { TwitchUserAdapter } from '../adapters/TwitchUserAdapter';
import { KickUserAdapter } from '../adapters/KickUserAdapter';
import { YouTubeUserAdapter } from '../adapters/YouTubeUserAdapter';
import type { UserAdapter } from '../adapters/UserAdapter';
import { TwitchConverter } from '../converters/TwitchConverter';
import { KickConverter } from '../converters/KickConverter';
import { YouTubeConverter } from '../converters/YouTubeConverter';

/**
 * Creates a UserAdapter instance from a normalized PlatformUser type.
 *
 * @param platformUser - The platform-specific user data
 * @returns A UserAdapter implementation for the given platform
 *
 * @example
 * ```typescript
 * const user = createUserAdapter(twitchUser);
 * console.log(user.getPlatform()); // 'twitch'
 * console.log(user.getUsername()); // 'ninja'
 * ```
 */
export function createUserAdapter(
  platformUser: PlatformUser
): UserAdapter {
  switch (platformUser.platform) {
    case 'twitch':
      return new TwitchUserAdapter(platformUser);
    case 'kick':
      return new KickUserAdapter(platformUser);
    case 'youtube':
      return new YouTubeUserAdapter(platformUser);
    default:
      const _exhaustiveCheck: never = platformUser;
      throw new Error(`Unsupported platform: ${String(_exhaustiveCheck)}`);
  }
}

/**
 * Creates a UserAdapter directly from a raw API response.
 * This is a convenience function that combines conversion and adapter creation.
 *
 * @param rawApiData - The raw API response from a streaming platform
 * @param platform - The platform the data is from ('twitch', 'kick', or 'youtube')
 * @returns A UserAdapter implementation
 *
 * @example
 * ```typescript
 * // From Twitch API response
 * const twitchResponse = await twitchApi.getUser(userId);
 * const user = createUserAdapterFromRaw(twitchResponse, 'twitch');
 * ```
 */
export function createUserAdapterFromRaw(
  rawApiData: unknown,
  platform: 'twitch' | 'kick' | 'youtube'
): UserAdapter {
  let platformUser: PlatformUser;

  switch (platform) {
    case 'twitch':
      platformUser = TwitchConverter.convertUser(rawApiData);
      break;
    case 'kick':
      platformUser = KickConverter.convertUser(rawApiData);
      break;
    case 'youtube':
      platformUser = YouTubeConverter.convertUser(rawApiData);
      break;
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }

  return createUserAdapter(platformUser);
}
