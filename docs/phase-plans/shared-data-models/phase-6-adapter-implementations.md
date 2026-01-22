# Phase Plan: Shared Data Models - Phase 6 - Adapter Implementations

---

## Phase Overview

**Phase:** 6 of 13
**Title:** Adapter Implementations
**Estimated Time:** 12-15 hours
**Status:** Complete

## Objective

Implement concrete adapter classes for each platform (Twitch, Kick, YouTube) that wrap platform-specific data types (TwitchStream, KickStream, YouTubeStream, etc.) and implement the adapter interfaces defined in Phase 5. Also create the unified Stream and User wrapper types that enable cross-platform scenarios.

Additionally, define the missing supporting types: Badge, Emote, PlatformChatMessage, PlatformEvent, ReplyParent, SuperChatDetails - which are referenced by ChatMessageAdapter and EventAdapter but haven't been defined yet.

**Key Deliverables:**
- 3 StreamAdapter implementations (Twitch, Kick, YouTube)
- 3 UserAdapter implementations (Twitch, Kick, YouTube)
- 3 ChatMessageAdapter implementations (Twitch, Kick, YouTube)
- 3 EventAdapter implementations (Twitch, Kick, YouTube)
- Unified Stream wrapper type (multi-platform support)
- Unified User wrapper type (cross-platform linking)
- Supporting types: Badge, Emote, ChatMessage types, Event types

---

## Configuration

- **Files to create:**
  - `Badge.ts` - Badge type + BadgeType enum
  - `Emote.ts` - Emote type + EmoteType enum
  - `ChatMessage.ts` - PlatformChatMessage types (TwitchChatMessage, KickChatMessage, YouTubeChatMessage)
  - `Event.ts` - PlatformEvent types + EventType enums
  - `adapters/TwitchStreamAdapter.ts`
  - `adapters/KickStreamAdapter.ts`
  - `adapters/YouTubeStreamAdapter.ts`
  - `adapters/TwitchUserAdapter.ts`
  - `adapters/KickUserAdapter.ts`
  - `adapters/YouTubeUserAdapter.ts`
  - `adapters/TwitchChatMessageAdapter.ts`
  - `adapters/KickChatMessageAdapter.ts`
  - `adapters/YouTubeChatMessageAdapter.ts`
  - `adapters/TwitchEventAdapter.ts`
  - `adapters/KickEventAdapter.ts`
  - `adapters/YouTubeEventAdapter.ts`
  - `Stream.ts` - Updated with unified Stream wrapper
  - `User.ts` - Updated with unified User wrapper
- **Location:** `shared/models/src/` + `shared/models/src/adapters/`
- **Dependencies:** Phase 2 (Base Types), Phase 3 (StreamStats), Phase 4 (Converters), Phase 5 (Adapter Interfaces)
- **Followed by:** Phase 7 (Translator Layer)

---

## Dependencies

**Before starting this phase, ensure:**
- ✅ Phase 2 complete (Platform types: TwitchStream, KickStream, YouTubeStream, TwitchUser, KickUser, YouTubeUser)
- ✅ Phase 3 complete (StreamStats type)
- ✅ Phase 4 complete (Converters: TwitchConverter, KickConverter, YouTubeConverter)
- ✅ Phase 5 complete (Adapter interfaces: StreamAdapter, UserAdapter, ChatMessageAdapter, EventAdapter, CategoryCache)

**This phase depends on:**
- Platform types from Phase 2 (adapters wrap these types)
- Adapter interfaces from Phase 5 (implementations implement these)
- Converters from Phase 4 (translators will use converters later)

---

## Tasks Breakdown

### Task 6.1: Create Badge.ts (45 minutes)

Define Badge type for chat user badges.

**File:** `shared/models/src/Badge.ts`

**BadgeType enum:**

```typescript
/**
 * Badge types
 * Categorizes badges for UI rendering and filtering
 */
export enum BadgeType {
  Global = 'global',
  Channel = 'channel',
  Subscription = 'subscription',
  Moderator = 'moderator',
  VIP = 'vip',
  Owner = 'owner',
  Bits = 'bits',
  Other = 'other',
}
```

**Badge interface:**

```typescript
/**
 * Chat badge
 * Represents a user badge displayed next to their name in chat
 */
export interface Badge {
  /** Badge ID (platform-specific) */
  id: string;

  /** Badge name (e.g., 'moderator', 'subscriber', 'subscriber-12') */
  name: string;

  /** Badge image URL, or null if not available */
  url: string | null;

  /** Badge type for UI categorization */
  type: BadgeType;

  /** Badge version (e.g., subscription months in Twitch), optional */
  version?: string;
}
```

### Task 6.2: Create Emote.ts (45 minutes)

Define Emote type for chat emotes.

**File:** `shared/models/src/Emote.ts`

**EmoteType enum:**

```typescript
/**
 * Emote types
 * Categorizes emotes for UI rendering and filtering
 */
export enum EmoteType {
  Twitch = 'twitch',
  Kick = 'kick',
  YouTube = 'youtube',
  BTTV = 'bttv',
  FFZ = 'ffz',
  SevenTV = '7tv',
  Custom = 'custom',
}
```

**Emote interface:**

```typescript
/**
 * Chat emote
 * Represents an emote in a chat message
 */
export interface Emote {
  /** Emote ID (platform-specific) */
  id: string;

  /** Emote text/name (e.g., 'Kappa', 'LULW') */
  name: string;

  /** Emote image URL, or null if not available */
  url: string | null;

  /** Character positions in message [start, end] */
  positions: [number, number][];

  /** Emote type for UI categorization */
  type?: EmoteType;
}
```

### Task 6.3: Create ChatMessage Platform Types (2 hours)

Define platform-specific chat message types.

**File:** `shared/models/src/ChatMessage.ts`

**ReplyParent interface (Twitch only):**

```typescript
/**
 * Reply parent info (Twitch only)
 * Details about the message this message replies to
 */
export interface ReplyParent {
  /** Parent message ID */
  messageId: string;

  /** Parent message user ID */
  userId: string;

  /** Parent message username */
  username: string;

  /** Parent message text (truncated) */
  text: string;
}
```

**TwitchChatMessage:**

```typescript
import type { Platform } from './Platform';
import type { Badge } from './Badge';
import type { Emote } from './Emote';
import type { ReplyParent } from './ChatMessage';

/**
 * Twitch chat message
 * Field mappings from @docs/research/API-RESEARCH.md lines 272-375
 * From Twitch IRC WebSocket protocol
 */
export interface TwitchChatMessage {
  platform: Platform.Twitch;

  /** Message ID (IRC message.tags.id) */
  messageId: string;

  /** User ID (IRC message.tags['user-id']) */
  userId: string;

  /** Username (IRC message.login or message.tags['display-name']) */
  username: string;

  /** Display name (IRC message.tags['display-name'], null if not set) */
  displayName: string | null;

  /** Username color (hex color from IRC message.tags.color, null if not set) */
  color: string | null;

  /** Message content (IRC message) */
  message: string;

  /** Message timestamp (current time or IRC message.tags['tmi-sent-ts']) */
  timestamp: Date;

  /** Room/channel ID (IRC message.tags['room-id']) */
  roomId: string;

  /** User badges (from IRC message.tags.badges, parsed as Badge[]) */
  badges: Badge[];

  /** Emotes (from IRC message.tags.emotes, parsed as Emote[]) */
  emotes: Emote[];

  /** Bits amount (if cheer message, from IRC message.tags.bits) */
  bits?: number;

  /** Reply parent info (if reply, from IRC message.tags['reply-parent-...']) */
  replyParent?: ReplyParent;
}
```

**KickChatMessage:**

```typescript
/**
 * Kick chat message
 * Field mappings from @docs/research/API-RESEARCH.md lines 775-863
 * From Kick WebSocket/Webhook protocol
 */
export interface KickChatMessage {
  platform: Platform.Kick;

  /** Message ID (from message.id) */
  messageId: string;

  /** User ID (from message.sender.user_id) */
  userId: string;

  /** Username (from message.sender.username) */
  username: string;

  /** Display name (from message.sender.identity.badges display name, null if not set) */
  displayName: string | null;

  /** Username color (hex color from message.identity.color, null if not set) */
  color: string | null;

  /** Message content (from message.content) */
  message: string;

  /** Message timestamp (from message.created_at) */
  timestamp: Date;

  /** Room/channel ID (from message.channel_id) */
  roomId: string;

  /** Badges (from message.sender.identity.badges, parsed as Badge[]) */
  badges: Badge[];

  /** Emotes (from message.emotes, parsed as Emote[]) */
  emotes: Emote[];
}
```

**YouTubeChatMessage:**

```typescript
/**
 * YouTube chat message
 * Field mappings from @docs/research/API-RESEARCH.md lines 1220-1360
 * From YouTube liveChatMessages.streamList (Server-Sent HTTP/gRPC)
 */
export interface YouTubeChatMessage {
  platform: Platform.YouTube;

  /** Message ID (from liveChatMessage.id) */
  messageId: string;

  /** Author channel ID (from authorDetails.channelId) */
  channelId: string;

  /** Author display name (from authorDetails.displayName) */
  displayName: string;

  /** Author profile image URL (from authorDetails.profileImageUrl, null if not set) */
  profileImageUrl: string | null;

  /** Message content (from snippet.textMessageDetails.messageText, empty string if not set) */
  message: string;

  /** Message timestamp (from snippet.publishedAt) */
  timestamp: Date;

  /** Live chat ID (from snippet.liveChatId) */
  liveChatId: string;

  /** Badges (inferred from authorDetails.isChatOwner, isChatModerator, isChatSponsor, parsed as Badge[]) */
  badges: Badge[];

  /** Super Chat details (present if Super Chat message) */
  superChatDetails?: SuperChatDetails;
}
```

**SuperChatDetails:**

```typescript
/**
 * Super Chat details (YouTube only)
 */
export interface SuperChatDetails {
  /** Amount in local currency */
  amountDisplayString: string;

  /** Amount in micros (1/1,000,000 of currency unit) */
  amountMicros: number;

  /** Currency code (e.g., 'USD', 'EUR') */
  currency: string;

  /** Comment from donor */
  userComment: string;

  /** Tier (1-6, affects visual presentation) */
  tier: number;
}
```

**PlatformChatMessage union:**

```typescript
export type PlatformChatMessage = TwitchChatMessage | KickChatMessage | YouTubeChatMessage;
```

### Task 6.4: Create Event Platform Types (1.5 hours)

Define platform-specific event types.

**File:** `shared/models/src/Event.ts`

**TwitchEventType enum:**

```typescript
/**
 * Twitch-specific event types
 * Mapped from Twitch EventSub event types
 */
export enum TwitchEventType {
  Follow = 'channel.follow',
  Subscribe = 'channel.subscribe',
  Resubscribe = 'channel.subscription.message',
  SubscriptionGift = 'channel.subscription.gift',
  Cheer = 'channel.cheer',
  Raid = 'channel.raid',
  PointRedemption = 'channel.channel_points_custom_reward_redemption.add',
}
```

**KickEventType enum:**

```typescript
/**
 * Kick-specific event types
 * Mapped from Kick webhook event types
 */
export enum KickEventType {
  Follow = 'followed',
  Subscribe = 'subscribed',
  SubscriptionGift = 'subscription_gift',
  Raid = 'raid',
  Tip = 'tip',
}
```

**YouTubeEventType enum:**

```typescript
/**
 * YouTube-specific event types
 * Mapped from YouTube event types (limites real-time events)
 */
export enum YouTubeEventType {
  SuperChat = 'superChatEvent',
  SuperSticker = 'superStickerEvent',
  Membership = 'membershipGifting',
}
```

**TwitchEventData:**

```typescript
/**
 * Twitch event data
 * Structure varies by event type (follow, subscription, cheer, etc.)
 */
export type TwitchEventData =
  | { type: TwitchEventType.Follow; userId: string; username: string; followedAt: Date }
  | { type: TwitchEventType.Subscribe | TwitchEventType.Resubscribe; userId: string; username: string; tier: string; cumulativeMonths?: number; streakMonths?: number; message: string; }
  | { type: TwitchEventType.SubscriptionGift; userId: string; username: string; recipientUserId: string; recipientUsername: string; tier: string; count: number; }
  | { type: TwitchEventType.Cheer; userId: string; username: string; bits: number; message: string; }
  | { type: TwitchEventType.Raid; userId: string; username: string; viewerCount: number; }
  | { type: TwitchEventType.PointRedemption; userId: string; username: string; rewardId: string; rewardTitle: string; rewardCost: number; userInput: string; };
```

**KickEventData:**

```typescript
/**
 * Kick event data
 */
export type KickEventData =
  | { type: KickEventType.Follow; userId: string; username: string; followedAt: Date }
  | { type: KickEventType.Subscribe; userId: string; username: string; months: number; }
  | { type: KickEventType.SubscriptionGift; userId: string; username: string; recipientUserId: string; recipientUsername: string; count: number; }
  | { type: KickEventType.Raid; userId: string; username: string; viewerCount: number; }
  | { type: KickEventType.Tip; userId: string; username: string; amount: number; currency: string; message: string; };
```

**YouTubeEventData:**

```typescript
/**
 * YouTube event data
 */
export type YouTubeEventData =
  | { type: YouTubeEventType.SuperChat; amountDisplayString: string; amountMicros: number; currency: string; userComment: string; tier: number; }
  | { type: YouTubeEventType.SuperSticker; amountDisplayString: string; amountMicros: number; currency: string; tier: number; }
  | { type: YouTubeEventType.Membership; membershipLevel: string; years: number; months: number; };
```

**TwitchEvent:**

```typescript
import type { Platform } from './Platform';

export interface TwitchEvent {
  platform: Platform.Twitch;

  /** Event ID (from EventSub event id) */
  eventId: string;

  /** Twitch-specific event type */
  type: TwitchEventType;

  /** Event timestamp */
  timestamp: Date;

  /** User ID who triggered the event */
  userId: string;

  /** Username who triggered the event */
  username: string;

  /** Display name (null if not available) */
  displayName: string | null;

  /** Channel ID (event destination) */
  channelId: string;

  /** Event-specific data */
  data: TwitchEventData;
}
```

**KickEvent:**

```typescript
export interface KickEvent {
  platform: Platform.Kick;

  /** Event ID (from webhook event id) */
  eventId: string;

  /** Kick-specific event type */
  type: KickEventType;

  /** Event timestamp */
  timestamp: Date;

  /** User ID who triggered the event */
  userId: string;

  /** Username who triggered the event */
  username: string;

  /** Display name (null if not available) */
  displayName: string | null;

  /** Channel ID (event destination) */
  channelId: string;

  /** Event-specific data */
  data: KickEventData;
}
```

**YouTubeEvent:**

```typescript
export interface YouTubeEvent {
  platform: Platform.YouTube;

  /** Event ID (from liveChatMessage.id) */
  eventId: string;

  /** YouTube-specific event type */
  type: YouTubeEventType;

  /** Event timestamp */
  timestamp: Date;

  /** Channel ID (where event occurred) */
  channelId: string;

  /** Channel title */
  channelTitle: string;

  /** Event-specific data */
  data: YouTubeEventData;
}
```

**PlatformEvent union:**

```typescript
export type PlatformEvent = TwitchEvent | KickEvent | YouTubeEvent;
```

### Task 6.5: Implement TwitchStreamAdapter (1 hour)

Create TwitchStreamAdapter implementation.

**File:** `shared/models/src/adapters/TwitchStreamAdapter.ts`

```typescript
import type { Platform } from '../Platform';
import type { StreamAdapter } from './StreamAdapter';
import type { CategoryCache } from '../cache/CategoryCache';
import type { TwitchStream } from '../Stream';
import type { FeatureData } from '../interface';

/**
 * Twitch stream adapter
 * Wraps TwitchStream and implements StreamAdapter interface
 */
export class TwitchStreamAdapter implements StreamAdapter {
  constructor(
    private readonly data: TwitchStream,
    private readonly categoryCache: CategoryCache
  ) {}

  getPlatform(): Platform.Twitch {
    return Platform.Twitch;
  }

  getId(): string {
    return this.data.twitchId;
  }

  getTitle(): string {
    return this.data.title;
  }

  async getCategory(): Promise<string> {
    if (!this.data.categoryId) {
      return 'No Category';
    }
    return await this.categoryCache.getCategory(this.data.categoryId, this.getPlatform());
  }

  getThumbnail(): string | null {
    return this.data.thumbnailUrl;
  }

  getTags(): string[] {
    return this.data.tags;
  }

  hasFeature(feature: string): boolean {
    return feature === 'twitchChannelPoints';
  }

  getFeature(feature: string): FeatureData | null {
    if (feature === 'twitchChannelPoints') {
      return { current: this.data.channelPoints };
    }
    return null;
  }

  toStorage(): object {
    return this.data;
  }
}
```

### Task 6.6: Implement KickStreamAdapter (45 minutes)

**File:** `shared/models/src/adapters/KickStreamAdapter.ts`

```typescript
import type { Platform } from '../Platform';
import type { StreamAdapter } from './StreamAdapter';
import type { CategoryCache } from '../cache/CategoryCache';
import type { KickStream } from '../Stream';
import type { FeatureData } from '../interface';

export class KickStreamAdapter implements StreamAdapter {
  constructor(
    private readonly data: KickStream,
    private readonly categoryCache: CategoryCache
  ) {}

  getPlatform(): Platform.Kick {
    return Platform.Kick;
  }

  getId(): string {
    return this.data.kickId;
  }

  getTitle(): string {
    return this.data.title;
  }

  async getCategory(): Promise<string> {
    if (!this.data.categorySlug) {
      return 'No Category';
    }
    return await this.categoryCache.getCategory(this.data.categorySlug, this.getPlatform());
  }

  getThumbnail(): string | null {
    return this.data.thumbnailUrl;
  }

  getTags(): string[] {
    return this.data.tags;
  }

  hasFeature(feature: string): boolean {
    return feature === 'kickTips';
  }

  getFeature(feature: string): FeatureData | null {
    if (feature === 'kickTips') {
      return { value: this.data.totalTipsUsd, currency: 'USD' };
    }
    return null;
  }

  toStorage(): object {
    return this.data;
  }
}
```

### Task 6.7: Implement YouTubeStreamAdapter (1 hour)

**File:** `shared/models/src/adapters/YouTubeStreamAdapter.ts`

```typescript
import type { Platform } from '../Platform';
import type { StreamAdapter } from './StreamAdapter';
import type { CategoryCache } from '../cache/CategoryCache';
import type { YouTubeStream } from '../Stream';
import type { FeatureData } from '../interface';

export class YouTubeStreamAdapter implements StreamAdapter {
  constructor(
    private readonly data: YouTubeStream,
    private readonly categoryCache: CategoryCache
  ) {}

  getPlatform(): Platform.YouTube {
    return Platform.YouTube;
  }

  getId(): string {
    return this.data.videoId;
  }

  getTitle(): string {
    return this.data.title;
  }

  async getCategory(): Promise<string> {
    try {
      const productId = parseInt(this.data.categoryId, 10);
      if (productId === 0) {
        return 'No Category';
      }
      return await this.categoryCache.getCategory(this.data.categoryId, this.getPlatform());
    } catch {
      return 'No Category';
    }
  }

  getThumbnail(): string | null {
    return this.data.thumbnailUrl;
  }

  getTags(): string[] {
    return this.data.tags;
  }

  hasFeature(feature: string): boolean {
    return feature === 'subscriberCount' || feature === 'youtubeSuperChat';
  }

  getFeature(feature: string): FeatureData | null {
    if (feature === 'subscriberCount') {
      return { total: this.data.subscriberCount };
    }
    if (feature === 'youtubeSuperChat') {
      return { value: this.data.superChatTotal, currency: 'USD' };
    }
    return null;
  }

  toStorage(): object {
    return this.data;
  }
}
```

### Task 6.8: Implement TwitchUserAdapter (45 minutes)

**File:** `shared/models/src/adapters/TwitchUserAdapter.ts`

```typescript
import type { Platform } from '../Platform';
import type { UserAdapter } from './UserAdapter';
import type { TwitchUser } from '../User';
import type { FeatureData } from '../interface';

export class TwitchUserAdapter implements UserAdapter {
  constructor(private readonly data: TwitchUser) {}

  getPlatform(): Platform.Twitch {
    return Platform.Twitch;
  }

  getId(): string {
    return this.data.twitchId;
  }

  getUsername(): string {
    return this.data.username;
  }

  getDisplayName(): string {
    return this.data.displayName || this.data.username;
  }

  getAvatar(): string | null {
    return this.data.profileImageUrl;
  }

  getBio(): string | null {
    return this.data.bio;
  }

  getCreatedAt(): Date | null {
    return this.data.createdAt;
  }

  hasFeature(_feature: string): boolean {
    return false;
  }

  getFeature(_feature: string): FeatureData | null {
    return null;
  }

  toStorage(): object {
    return this.data;
  }
}
```

### Task 6.9: Implement KickUserAdapter (45 minutes)

**File:** `shared/models/src/adapters/KickUserAdapter.ts`

```typescript
import type { Platform } from '../Platform';
import type { UserAdapter } from './UserAdapter';
import type { KickUser } from '../User';
import type { FeatureData } from '../interface';

export class KickUserAdapter implements UserAdapter {
  constructor(private readonly data: KickUser) {}

  getPlatform(): Platform.Kick {
    return Platform.Kick;
  }

  getId(): string {
    return this.data.kickId;
  }

  getUsername(): string {
    return this.data.username;
  }

  getDisplayName(): string {
    return this.data.displayName || this.data.username;
  }

  getAvatar(): string | null {
    return this.data.avatarUrl;
  }

  getBio(): string | null {
    return this.data.bio;
  }

  getCreatedAt(): Date | null {
    return this.data.createdAt;
  }

  hasFeature(feature: string): boolean {
    return feature === 'isVerified';
  }

  getFeature(feature: string): FeatureData | null {
    if (feature === 'isVerified') {
      return this.data.isVerified;
    }
    return null;
  }

  toStorage(): object {
    return this.data;
  }
}
```

### Task 6.10: Implement YouTubeUserAdapter (45 minutes)

**File:** `shared/models/src/adapters/YouTubeUserAdapter.ts`

```typescript
import type { Platform } from '../Platform';
import type { UserAdapter } from './UserAdapter';
import type { YouTubeUser } from '../User';
import type { FeatureData } from '../interface';

export class YouTubeUserAdapter implements UserAdapter {
  constructor(private readonly data: YouTubeUser) {}

  getPlatform(): Platform.YouTube {
    return Platform.YouTube;
  }

  getId(): string {
    return this.data.channelId;
  }

  getUsername(): string {
    return this.data.customUrl || this.data.channelTitle;
  }

  getDisplayName(): string {
    return this.data.channelTitle;
  }

  getAvatar(): string | null {
    return this.data.thumbnailUrl;
  }

  getBio(): string | null {
    return this.data.description;
  }

  getCreatedAt(): Date | null {
    return this.data.createdAt;
  }

  hasFeature(feature: string): boolean {
    return feature === 'subscriberCount' || feature === 'videoCount' || feature === 'viewCount';
  }

  getFeature(feature: string): FeatureData | null {
    if (feature === 'subscriberCount') {
      return { total: this.data.subscriberCount };
    }
    if (feature === 'videoCount') {
      return { total: this.data.videoCount };
    }
    if (feature === 'viewCount') {
      return { total: this.data.viewCount };
    }
    return null;
  }

  toStorage(): object {
    return this.data;
  }
}
```

### Task 6.11: Create Unified Stream Wrapper Type (1 hour)

**File:** `shared/models/src/Stream.ts` (update - add unified wrapper after PlatformStream types)

```typescript
import type { Platform } from './Platform';
import type { StreamAdapter } from './adapters/StreamAdapter';

/**
 * Unified stream wrapper
 * Every stream (single or multi-platform) wraps platform data in this type
 *
 * **Lifecycle:**
 * - Created on OBS stream start (generated UUID commonId)
 * - Platforms added as they come online (WebSocket events, etc.)
 * - Updated when platform adapter changes
 * - Closed on OBS stream stop (set obsEndTime)
 *
 * **Source of Truth:**
 * OBS is the source of truth for stream lifecycle (obsStartTime/obsEndTime)
 */
export interface Stream {
  /**
   * Common ID (UUID)
   * Generated when OBS stream starts
   * Groups all platform streams from the same live session
   */
  commonId: string;

  /**
   * OBS stream start time
   * Source of truth for stream lifecycle
   */
  obsStartTime: Date;

  /**
   * OBS stream end time
   * Set when OBS stream stops
   */
  obsEndTime: Date | null;

  /**
   * Platform-specific stream adapters
   * Map of platform → adapter
   * May be empty initially (OBS started, platforms not yet live)
   */
  streams: Map<Platform, StreamAdapter>;
}
```

### Task 6.12: Create Unified User Wrapper Type (1 hour)

**File:** `shared/models/src/User.ts` (update - add unified wrapper after PlatformUser types)

```typescript
import type { Platform } from './Platform';
import type { UserAdapter } from './adapters/UserAdapter';

/**
 * Unified user wrapper
 * Enables cross-referencing same person across multiple platforms
 *
 * **Cross-Platform Linking Logic:**
 *
 * **App user (streamer):**
 * - Manually assigned commonId via UI during setup
 * - One User object represents the app user across all their platforms
 *
 * **Chatters:**
 * - Automatic detection via fuzzy matching (algorithm TBD - complex, figure out later)
 * - Real-time linking for obvious matches (exact username or high-confidence matches)
 * - Periodic batch processing for fuzzy/marginal matches
 * - Matching thresholds configurable
 *
 * **Data Flow:**
 * 1. Chat arrives from a platform with PlatformUser data
 * 2. UserMatcher (Phase 10) attempts to find existing User by commonId
 * 3. If found, add platform adapter to existing User
 * 4. If not found, create new User with generated commonId (or defer matching)
 * 5. UI displays user with unified view across all linked platforms
 */
export interface User {
  /**
   * Common ID (UUID)
   * Generated for cross-platform linking
   * Unique identifier for this person across all platforms
   */
  commonId: string;

  /**
   * Primary user ID
   * For app user: their username
   * For chatters: chatter identifier from primary platform
   */
  userId: string;

  /**
   * Primary username
   * For app user: their username
   * For chatters: best-match username across platforms
   */
  username: string;

  /**
   * Platform-specific user adapters
   * Map of platform → adapter
   * May contain 1-3 adapters depending on cross-platform linking
   */
  platforms: Map<Platform, UserAdapter>;
}
```

### Task 6.13: Implement ChatMessage Adapters (2 hours)

Implement TwitchChatMessageAdapter, KickChatMessageAdapter, YouTubeChatMessageAdapter.

**File:** `shared/models/src/adapters/TwitchChatMessageAdapter.ts`

```typescript
import type { Platform } from '../Platform';
import type { ChatMessageAdapter } from './ChatMessageAdapter';
import type { TwitchChatMessage } from '../ChatMessage';
import type { FeatureData } from '../interface';

export class TwitchChatMessageAdapter implements ChatMessageAdapter {
  constructor(private readonly data: TwitchChatMessage) {}

  getPlatform(): Platform.Twitch {
    return Platform.Twitch;
  }

  getId(): string {
    return this.data.messageId;
  }

  getUserId(): string {
    return this.data.userId;
  }

  getUsername(): string {
    return this.data.username;
  }

  getDisplayName(): string {
    return this.data.displayName || this.data.username;
  }

  getColor(): string | null {
    return this.data.color;
  }

  getMessage(): string {
    return this.data.message;
  }

  getTimestamp(): Date {
    return this.data.timestamp;
  }

  getRoomId(): string {
    return this.data.roomId;
  }

  getBadges() {
    return this.data.badges;
  }

  getEmotes() {
    return this.data.emotes;
  }

  hasReplyParent(): boolean {
    return !!this.data.replyParent;
  }

  getFeature(feature: string): FeatureData | null {
    if (feature === 'bits' && this.data.bits) {
      return { value: this.data.bits };
    }
    return null;
  }

  toStorage(): object {
    return this.data;
  }
}
```

Similar implementations for KickChatMessageAdapter and YouTubeChatMessageAdapter.

### Task 6.14: Implement Event Adapters (2 hours)

Implement TwitchEventAdapter, KickEventAdapter, YouTubeEventAdapter.

**File:** `shared/models/src/adapters/TwitchEventAdapter.ts`

```typescript
import type { Platform } from '../Platform';
import type { EventAdapter, EventType, EventData } from './EventAdapter';
import type { TwitchEvent } from '../Event';

export class TwitchEventAdapter implements EventAdapter {
  constructor(private readonly data: TwitchEvent) {}

  getPlatform(): Platform.Twitch {
    return Platform.Twitch;
  }

  getId(): string {
    return this.data.eventId;
  }

  getType(): EventType {
    return this.mapTwitchEventType(this.data.type);
  }

  getTimestamp(): Date {
    return this.data.timestamp;
  }

  getUserId(): string | null {
    return this.data.userId;
  }

  getUsername(): string | null {
    return this.data.username;
  }

  getDisplayName(): string | null {
    return this.data.displayName;
  }

  getData(): EventData {
    return this.data.data as EventData;
  }

  toStorage(): object {
    return this.data;
  }

  private mapTwitchEventType(twitchType: string): EventType {
    const mapping: Record<string, EventType> = {
      'channel.follow': 'follow',
      'channel.subscribe': 'subscription',
      'channel.subscription.message': 'resubscribe',
      'channel.subscription.gift': 'subscription_gift',
      'channel.cheer': 'cheer',
      'channel.raid': 'raid',
      'channel.channel_points_custom_reward_redemption.add': 'point_redemption',
    };
    return mapping[twitchType] || 'follow';
  }
}
```

### Task 6.15: Update Barrel Exports/Imports (15 minutes)

Update all barrel files to export new types and implementations.

### Task 6.16: Write Unit Tests (3-4 hours)

Create comprehensive unit tests for all adapter implementations targeting 95%+ coverage.

### Task 6.17: Run Build and Tests (15 minutes)

```bash
cd shared/models
pnpm build
pnpm test
```

---

## File-by-File Breakdown

| File | Lines (approx) | Description |
|------|----------------|-------------|
| `src/Badge.ts` | 30-40 | Badge interface + BadgeType enum |
| `src/Emote.ts` | 30-40 | Emote interface + EmoteType enum |
| `src/ChatMessage.ts` | 180-220 | PlatformChatMessage types + ReplyParent + SuperChatDetails |
| `src/Event.ts` | 200-240 | PlatformEvent types + EventType enums + EventData unions |
| `adapters/TwitchStreamAdapter.ts` | 70-80 | TwitchStreamAdapter implementation |
| `adapters/KickStreamAdapter.ts` | 50-60 | KickStreamAdapter implementation |
| `adapters/YouTubeStreamAdapter.ts` | 70-80 | YouTubeStreamAdapter implementation |
| `adapters/TwitchUserAdapter.ts` | 50-60 | TwitchUserAdapter implementation |
| `adapters/KickUserAdapter.ts` | 55-65 | KickUserAdapter implementation |
| `adapters/YouTubeUserAdapter.ts` | 65-75 | YouTubeUserAdapter implementation |
| `adapters/TwitchChatMessageAdapter.ts` | 70-80 | TwitchChatMessageAdapter |
| `adapters/KickChatMessageAdapter.ts` | 60-70 | KickChatMessageAdapter |
| `adapters/YouTubeChatMessageAdapter.ts` | 65-75 | YouTubeChatMessageAdapter |
| `adapters/TwitchEventAdapter.ts` | 75-85 | TwitchEventAdapter |
| `adapters/KickEventAdapter.ts` | 70-80 | KickEventAdapter |
| `adapters/YouTubeEventAdapter.ts` | 65-75 | YouTubeEventAdapter |
| `src/Stream.ts` (updated) | 30-40 | Add unified Stream wrapper |
| `src/User.ts` (updated) | 35-45 | Add unified User wrapper |
| Test files | 800-1000 | Comprehensive adapter tests |
| **Total** | **2100-2600 lines** | |

---

## Code Examples

### Example: unified Stream wrapper usage

```typescript
import { Stream, TwitchStreamAdapter, KickStreamAdapter } from '@streaming-enhancement/shared-models';

// Create multi-platform stream
const stream: Stream = {
  commonId: 'uuid-123-456',
  obsStartTime: new Date('2024-01-15T10:00:00Z'),
  obsEndTime: null,
  streams: new Map([
    ['twitch', twitchAdapter],
    ['kick', kickAdapter],
  ])
};

// Access platform-specific data via adapters (no platform switching!)
for (const [platform, adapter] of stream.streams) {
  console.log(`${platform}: ${adapter.getTitle()}`);

  // Handle platform-specific features
  if (adapter.hasFeature('twitchChannelPoints')) {
    const feature = adapter.getFeature('twitchChannelPoints');
    if (feature && 'current' in feature) {
      console.log(`Channel points: ${feature.current}`);
    }
  }
}
```

### Example: unified User wrapper usage

```typescript
import { User, TwitchUserAdapter, KickUserAdapter } from '@streaming-enhancement/shared-models';

// User linked across Twitch and Kick
const user: User = {
  commonId: 'uuid-user-123',
  userId: 'app-user-id',
  username: 'streamer',
  platforms: new Map([
    ['twitch', twitchUserAdapter],
    ['kick', kickUserAdapter],
  ])
};

// Access unified view (never switch on platform!)
for (const [platform, adapter] of user.platforms) {
  console.log(`${platform}: @${adapter.getUsername()}`);
  console.log(`Avatar: ${adapter.getAvatar()}`);
  console.log(`Bio: ${adapter.getBio()}`);
}
```

---

## Design Decisions

### Decision 1: CategoryCache Injection in StreamAdapter Constructors

**Approach:** StreamAdapter constructors receive CategoryCache as dependency injection parameter.

**Rationale:**
- Async `getCategory()` method needs cache instance
- Dependency injection allows swapping cache implementations (in-memory, database)
- Mock cache easy to inject in tests
- Adapters don't instantiate cache themselves (better separation of concerns)

### Decision 2: getDisplayName() Fallback to Username

**Approach:** User adapters return `data.displayName || data.username` from `getDisplayName()`.

**Rationale:**
- Kick: displayName can be null
- Always show something to user
- Fallback to username is semantically correct

### Decision 3: Event Adapter Type Mapping

**Approach:** Event adapters map platform-specific event types to unified EventType enum.

**Rationale:**
- Downstream code works with unified types (follow, subscription, etc.)
- Platform-specific event names (e.g., 'channel.follow') hidden behind adapters
- Mapping logic encapsulated in adapter implementation

### Decision 4: Unified Stream Wrapper Uses Map<Platform, StreamAdapter>

**Approach:** `Stream.streams` is a `Map<Platform, StreamAdapter>`.

**Rationale:**
- O(1) lookup by platform key
- Can iterate over all platforms
- Type-safe key (Platform enum) ensures only valid platforms
- May be empty initially (OBS started, platforms not live yet)

### Decision 5: Unified User Wrapper Similar Map Structure

**Approach:** `User.platforms` is a `Map<Platform, UserAdapter>`.

**Rationale:**
- Same benefits as Stream wrapper
- Can represent single-platform user (1 entry) or multi-platform (2-3 entries)
- Future user matching (Phase 10) will add to this Map

### Decision 6: toStorage() Returns Raw Platform Object

**Approach:** Wrapper adapters' `toStorage()` returns raw platform type (TwitchStream, etc.).

**Rationale:**
- Database wants raw platform data for serialization
- Avoids adapter wrapper overhead in storage layer
- Consistent with Phase 5 interface contract
- Data transformation (JSON.stringify) happens in database layer

---

## Edge Cases to Handle

### 1. Empty Category ID in YouTube
**Issue:** YouTube categoryId may be "0" (placeholder) or missing.
**Resolution:** YouTubeStreamAdapter checks for `0` or empty string, returns "No Category".

### 2. Category Fetch Failure
**Issue:** CategoryCache.fetchCategoryName() may throw error (API down, network issue).
**Resolution:** CategoryCache implementations (Phase 8) handle errors and return fallback ("Unknown Category").

### 3. Missing Display Name on Kick
**Issue:** Kick channels may not have display_name.
**Resolution:** Adapter implementation returns username as fallback.

### 4. Empty Stream Map
**Issue:** Stream.wrapperCreated() may have empty platforms Map (OBS just started).
**Resolution:** Stream wrapper allows empty Map throughout its lifecycle (platforms can be added later).

### 5. Reply Parent Null Checks
**Issue:** Twitch replyParent may be missing (not all messages are replies).
**Resolution:** `hasReplyParent()` checks for existence of replyParent field.

### 6. YouTube Chat Messages Without Emotes
**Issue:** YouTube uses stickers, not traditional emotes.
**Resolution:** Convert stickers to Emote type with EmoteType.Custom or EmoteType.YouTube.

---

## Success Criteria

### Code Quality
- [ ] Badge.ts created with Badge interface and BadgeType enum
- [ ] Emote.ts created with Emote interface and EmoteType enum
- [ ] ChatMessage.ts created with all platform-specific message types
- [ ] Event.ts created with all platform-specific event types and EventType mappings
- [ ] All 3 StreamAdapter implementations created (Twitch, Kick, YouTube)
- [ ] All 3 UserAdapter implementations created (Twitch, Kick, YouTube)
- [ ] All 3 ChatMessageAdapter implementations created (Twitch, Kick, YouTube)
- [ ] All 3 EventAdapter implementations created (Twitch, Kick, YouTube)
- [ ] Unified Stream wrapper type created
- [ ] Unified User wrapper type created
- [ ] All barrel exports updated

### Testing
- [ ] Unit tests with 95%+ coverage for all adapters
- [ ] Tests with mock CategoryCache (stub implementations)
- [ ] Tests verify platform-specific features
- [ ] Tests verify async getCategory() behavior
- [ ] Tests verify toStorage() returns raw platform data
- [ ] Tests verify unified wrapper Map operations

### Build Verification
- [ ] `pnpm build` succeeds with no TypeScript errors
- [ ] All type declarations generated correctly
- [ ] No circular dependencies
- [ ] `pnpm test` passes all tests with 95%+ coverage

---

## Deliverables

1. **Supporting types:**
   - `shared/models/src/Badge.ts`
   - `shared/models/src/Emote.ts`
   - `shared/models/src/ChatMessage.ts`
   - `shared/models/src/Event.ts`

2. **Adapter implementations:**
   - `shared/models/src/adapters/TwitchStreamAdapter.ts`
   - `shared/models/src/adapters/KickStreamAdapter.ts`
   - `shared/models/src/adapters/YouTubeStreamAdapter.ts`
   - `shared/models/src/adapters/TwitchUserAdapter.ts`
   - `shared/models/src/adapters/KickUserAdapter.ts`
   - `shared/models/src/adapters/YouTubeUserAdapter.ts`
   - `shared/models/src/adapters/TwitchChatMessageAdapter.ts`
   - `shared/models/src/adapters/KickChatMessageAdapter.ts`
   - `shared/models/src/adapters/YouTubeChatMessageAdapter.ts`
   - `shared/models/src/adapters/TwitchEventAdapter.ts`
   - `shared/models/src/adapters/KickEventAdapter.ts`
   - `shared/models/src/adapters/YouTubeEventAdapter.ts`

3. **Unified wrappers:**
   - `shared/models/src/Stream.ts` (updated with unified Stream type)
   - `shared/models/src/User.ts` (updated with unified User type)

4. **Test coverage:**
   - 14+ test files with comprehensive coverage

5. **Build artifacts:**
   - Type declarations for all new files

---

## Notes

- **Large phase:** 12-15 hours is a significant chunk. Focus on core adapters (Stream/User) first, then ChatMessage/Event if time permits.
- **CategoryCache stub:** CategoryCache will be implemented in Phase 8. For this phase's tests, create mock/stub CategoryCache.
- **Type guards:** Use TypeScript type guards in Event adapters for discriminated unions (EventData).
- **Async getCategory():** Tests for StreamAdapter must handle async `getCategory()` method.
- **Unified wrappers:** Stream and User wrappers are Map-based. This enables flexible multi-platform scenarios.
- **User wrapper future work:** Cross-platform user matching (Phase 10) will add adapters to existing User.platforms Map.
- **ChatMessage/Event complexity:** These adapters have more complex data structures (nested types, discriminated unions).
- **Testing approach:** Mock CategoryCache with promise-returning `getCategory()` method. Use fake timers for time-based tests.

---

## Next Steps After This Phase

Once Phase 6 is complete:

1. **Phase 7: Translator Layer**
   - Create StreamTranslator: stream → adapters using converters
   - CreateUserTranslator: user → adapters using converters
   - Create chat/message translators

2. **Phase 8: Category Cache**
   - Implement CategoryCache interface (used by StreamAdapter)
   - Create InMemoryCategoryCache
   - Create DatabaseCategoryCache

3. **Phase 9: Stream Matcher**
   - Implement stream matching for late data reconstruction

---

## Status

**Ready for implementation**

**Estimated Effort:** 12-15 hours
**Dependencies:** Phase 2, 3, 4, 5 complete
**Followed by:** Phase 7 - Translator Layer

---
