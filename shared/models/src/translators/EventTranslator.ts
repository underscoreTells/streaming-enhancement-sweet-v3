import type { PlatformEvent } from '../Event';
import type { EventAdapter } from '../adapters/EventAdapter';
import { TwitchEventAdapter } from '../adapters/TwitchEventAdapter';
import { KickEventAdapter } from '../adapters/KickEventAdapter';
import { YouTubeEventAdapter } from '../adapters/YouTubeEventAdapter';
import { TwitchConverter } from '../converters/TwitchConverter';
import { KickConverter } from '../converters/KickConverter';
import { YouTubeConverter } from '../converters/YouTubeConverter';

/**
 * Creates an EventAdapter instance from a normalized PlatformEvent type.
 *
 * @param platformEvent - The platform-specific event data
 * @returns An EventAdapter implementation for the given platform
 *
 * @example
 * ```typescript
 * const event = createEventAdapter(twitchEvent);
 * console.log(event.getPlatform()); // 'twitch'
 * console.log(event.getType()); // 'follow'
 * console.log(event.getData()); // Normalized event data
 * ```
 */
export function createEventAdapter(
  platformEvent: PlatformEvent
): EventAdapter {
  switch (platformEvent.platform) {
    case 'twitch':
      return new TwitchEventAdapter(platformEvent);
    case 'kick':
      return new KickEventAdapter(platformEvent);
    case 'youtube':
      return new YouTubeEventAdapter(platformEvent);
    default:
      const _exhaustiveCheck: never = platformEvent;
      throw new Error(`Unsupported platform: ${String(_exhaustiveCheck)}`);
  }
}

/**
 * Creates an EventAdapter directly from a raw API response.
 * This is a convenience function that combines conversion and adapter creation.
 *
 * @param rawApiData - The raw API response from a streaming platform
 * @param platform - The platform the data is from ('twitch', 'kick', or 'youtube')
 * @returns An EventAdapter implementation
 *
 * @example
 * ```typescript
 * // From Twitch EventSub notification
 * const twitchEvent = { ...rawTwitchEvent };
 * const event = createEventAdapterFromRaw(twitchEvent, 'twitch');
 * ```
 */
export function createEventAdapterFromRaw(
  rawApiData: unknown,
  platform: 'twitch' | 'kick' | 'youtube'
): EventAdapter {
  let platformEvent: PlatformEvent;

  switch (platform) {
    case 'twitch':
      platformEvent = TwitchConverter.convertEvent(rawApiData);
      break;
    case 'kick':
      platformEvent = KickConverter.convertEvent(rawApiData);
      break;
    case 'youtube':
      platformEvent = YouTubeConverter.convertEvent(rawApiData);
      break;
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }

  return createEventAdapter(platformEvent);
}
