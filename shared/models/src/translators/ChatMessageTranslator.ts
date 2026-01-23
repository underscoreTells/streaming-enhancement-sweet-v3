import type { PlatformChatMessage } from '../ChatMessage';
import type { ChatMessageAdapter } from '../adapters/ChatMessageAdapter';
import { TwitchChatMessageAdapter } from '../adapters/TwitchChatMessageAdapter';
import { KickChatMessageAdapter } from '../adapters/KickChatMessageAdapter';
import { YouTubeChatMessageAdapter } from '../adapters/YouTubeChatMessageAdapter';

/**
 * Creates a ChatMessageAdapter instance from a normalized PlatformChatMessage type.
 *
 * @param platformChatMessage - The platform-specific chat message data
 * @returns A ChatMessageAdapter implementation for the given platform
 *
 * @example
 * ```typescript
 * const message = createChatMessageAdapter(twitchChatMessage);
 * console.log(message.getPlatform()); // 'twitch'
 * console.log(message.getMessage()); // 'Hello chat!'
 * console.log(message.getBadges()); // Normalized badges array
 * ```
 */
export function createChatMessageAdapter(
  platformChatMessage: PlatformChatMessage
): ChatMessageAdapter {
  switch (platformChatMessage.platform) {
    case 'twitch':
      return new TwitchChatMessageAdapter(platformChatMessage);
    case 'kick':
      return new KickChatMessageAdapter(platformChatMessage);
    case 'youtube':
      return new YouTubeChatMessageAdapter(platformChatMessage);
    default:
      const _exhaustiveCheck: never = platformChatMessage;
      throw new Error(`Unsupported platform: ${String(_exhaustiveCheck)}`);
  }
}

/**
 * Creates a ChatMessageAdapter directly from a raw API response.
 * This is a convenience function that combines conversion and adapter creation.
 *
 * @param rawApiData - The raw API response from a streaming platform
 * @param platform - The platform the data is from ('twitch', 'kick', or 'youtube')
 * @returns A ChatMessageAdapter implementation
 *
 * @example
 * ```typescript
 * // From Twitch chat WebSocket message
 * const twitchMessage = { ...rawTwitchMessage };
 * const message = createChatMessageAdapterFromRaw(twitchMessage, 'twitch');
 * ```
 */
export function createChatMessageAdapterFromRaw(
  rawApiData: unknown,
  platform: 'twitch' | 'kick' | 'youtube'
): ChatMessageAdapter {
  let platformChatMessage: PlatformChatMessage;

  switch (platform) {
    case 'twitch':
      platformChatMessage = TwitchConverter.convertChatMessage(rawApiData);
      break;
    case 'kick':
      platformChatMessage = KickConverter.convertChatMessage(rawApiData);
      break;
    case 'youtube':
      platformChatMessage = YouTubeConverter.convertChatMessage(rawApiData);
      break;
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }

  return createChatMessageAdapter(platformChatMessage);
}

import { TwitchConverter } from '../converters/TwitchConverter';
import { KickConverter } from '../converters/KickConverter';
import { YouTubeConverter } from '../converters/YouTubeConverter';
