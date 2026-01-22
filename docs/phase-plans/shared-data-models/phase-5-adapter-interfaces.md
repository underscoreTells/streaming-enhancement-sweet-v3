# Phase Plan: Shared Data Models - Phase 5 - Adapter Interfaces

---

## Phase Overview

**Phase:** 5 of 13
**Title:** Adapter Interfaces
**Estimated Time:** 3-4 hours
**Status:** Not Started

## Objective

Define the adapter interface contracts that normalize platform-specific data (TwitchStream, KickStream, YouTubeStream, etc.) into a unified API. This is the foundation of the adapter pattern that hides platform complexity from downstream code - external services will only interact with these adapters, never switching on platform types.

**Key Principle:** Downstream code NEVER switches on platform. All platform-specific variations are accessed via dynamic feature methods (`hasFeature()`, `getFeature()`).

---

## Configuration

- **Files to create:**
  - `adapters/StreamAdapter.ts` - Interface definition
  - `adapters/UserAdapter.ts` - Interface definition
  - `adapters/ChatMessageAdapter.ts` - Interface definition
  - `adapters/EventAdapter.ts` - Interface definition
  - `adapters/index.ts` - Barrel export
- **Location:** `shared/models/src/adapters/`
- **Dependencies:** Phase 2 (Platform-Specific Base Types) complete, Phase 3 (StreamStats) complete
- **Followed by:** Phase 6 (Adapter Implementations)

---

## Dependencies

**Before starting this phase, ensure:**
- ✅ Phase 2 complete (Platform types: TwitchStream, KickStream, YouTubeStream, PlatformUser, PlatformChatMessage, PlatformEvent)
- ✅ Phase 3 complete (StreamStats type)
- ✅ Category cache interface reference (will be defined in this phase, implemented in Phase 8)

**This phase has no dependencies on other Shared Data Models phases** - it defines the adapter interface contracts.

---

## Tasks Breakdown

### Task 5.1: Create interface.ts - Common Interfaces (45 minutes)

Define common helper types used across adapters.

**File:** `shared/models/src/interface.ts`

**Types to define:**

```typescript
/**
 * Feature data type for dynamic feature access
 * Adapters store platform-specific features and return them via getFeature()
 */
export type FeatureData =
  | { current: number }           // Current value (e.g., channel points, tips, Super Chat)
  | { total: number }             // Total value (e.g., subscriber count, view count)
  | { value: number; currency: string; normalizedMicros?: number }  // Monetary amounts
  | { count: number; tier?: number }  // Counts with optional tier (e.g., gift subs)
  | object;                       // Generic object for custom features
```

### Task 5.2: Create StreamAdapter.ts (60 minutes)

Define the StreamAdapter interface that normalizes stream data from all platforms.

**File:** `shared/models/src/adapters/StreamAdapter.ts`

**Interface specification:**

```typescript
import type { Platform } from '../Platform';
import type { CategoryCache } from '../cache/CategoryCache';
import type { FeatureData } from '../interface';

/**
 * Stream adapter interface
 * Normalizes platform-specific stream data (TwitchStream, KickStream, YouTubeStream)
 * into a unified API that hides platform differences from downstream code
 */
export interface StreamAdapter {
  /**
   * Gets the platform this adapter wraps
   */
  getPlatform(): Platform;

  /**
   * Gets the platform-specific stream ID
   * This is the ID from the original platform (twitchId, kickId, videoId)
   */
  getId(): string;

  /**
   * Gets the stream title
   */
  getTitle(): string;

  /**
   * Gets the normalized category name
   * Uses injected CategoryCache to resolve categoryId/categorySlug to human-readable name
   */
  getCategory(): Promise<string>;

  /**
   * Gets the stream thumbnail URL, or null if unavailable
   */
  getThumbnail(): string | null;

  /**
   * Gets the stream tags
   */
  getTags(): string[];

  /**
   * Checks if the adapter has a specific platform-specific feature
   * @param feature - The feature name to check
   * @returns True if the feature is available for this platform
   */
  hasFeature(feature: string): boolean;

  /**
   * Gets a platform-specific feature value
   * @param feature - The feature name to retrieve
   * @returns The feature data, or null if feature not available
   *
   * Supported features:
   * - 'twitchChannelPoints': { current: number } - Twitch channel points
   * - 'kickTips': { value: number; currency: 'USD' } - Kick tips total
   * - 'youtubeSuperChat': { value: number; currency: string } - YouTube Super Chat total
   * - 'subscriberCount': { total: number } - YouTube subscriber count (not available on Twitch/Kick)
   *
   * Additional features can be added per platform convention
   */
  getFeature(feature: 'twitchChannelPoints' | 'kickTips' | 'youtubeSuperChat' | 'subscriberCount' | string): FeatureData | null;

  /**
   * Serializes the adapter to raw platform data for database storage
   * @returns Platform-specific stream object (TwitchStream, KickStream, or YouTubeStream)
   */
  toStorage(): object;
}
```

**Design rationales:**

1. **CategoryCache dependency injection**: Resolving category IDs to names requires API calls. CategoryCache interface defined now, implementation in Phase 8.

2. **Async getCategory()**: Category lookup requires async API calls to fetch category names by ID.

3. **Dynamic feature access**: Instead of optional fields like `channelPoints?: number`, use `hasFeature()` and `getFeature()` pattern. This prevents "optional field soup" and makes platform-specific features explicit.

4. **toStorage()**: Returns raw platform type for database storage without serialization overhead.

### Task 5.3: Create UserAdapter.ts (45 minutes)

Define the UserAdapter interface that normalizes user data from all platforms.

**File:** `shared/models/src/adapters/UserAdapter.ts`

**Interface specification:**

```typescript
import type { Platform } from '../Platform';
import type { FeatureData } from '../interface';

/**
 * User adapter interface
 * Normalizes platform-specific user data (TwitchUser, KickUser, YouTubeUser)
 * into a unified API that hides platform differences from downstream code
 */
export interface UserAdapter {
  /**
   * Gets the platform this adapter wraps
   */
  getPlatform(): Platform;

  /**
   * Gets the platform-specific user ID
   * This is the ID from the original platform (twitchId, kickId, channelId)
   */
  getId(): string;

  /**
   * Gets the username (login/handle)
   * Twitch: login, Kick: username, YouTube: customUrl or channelTitle fallback
   */
  getUsername(): string;

  /**
   * Gets the display name
   * May be null if not available (e.g., Kick channels without display_name)
   */
  getDisplayName(): string;

  /**
   * Gets the avatar/profile image URL, or null if unavailable
   */
  getAvatar(): string | null;

  /**
   * Gets the user bio/description, or null if unavailable
   */
  getBio(): string | null;

  /**
   * Gets the account creation date, or null if unavailable
   */
  getCreatedAt(): Date | null;

  /**
   * Checks if the adapter has a specific platform-specific feature
   */
  hasFeature(feature: string): boolean;

  /**
   * Gets a platform-specific feature value
   * @param feature - The feature name to retrieve
   * @returns The feature data, or null if feature not available
   *
   * Supported features:
   * - 'isVerified': boolean - Verification status (Kick only)
   * - 'subscriberCount': { total: number } - YouTube subscriber count
   * - 'videoCount': { total: number } - YouTube video count
   * - 'viewCount': { total: number } - YouTube lifetime view count
   */
  getFeature(feature: 'isVerified' | 'subscriberCount' | 'videoCount' | 'viewCount' | string): FeatureData | null;

  /**
   * Serializes the adapter to raw platform data for database storage
   * @returns Platform-specific user object (TwitchUser, KickUser, or YouTubeUser)
   */
  toStorage(): object;
}
```

### Task 5.4: Create ChatMessageAdapter.ts (45 minutes)

Define the ChatMessageAdapter interface (note: ChatMessage types not yet defined - will reference interface that doesn't exist yet, implement in Phase 6).

**File:** `shared/models/src/adapters/ChatMessageAdapter.ts`

**Interface specification:**

```typescript
import type { Platform } from '../Platform';
import type { Badge, Emote } from '../Badge'; // Phase 2 defined
import type { FeatureData } from '../interface';

/**
 * Chat message adapter interface
 * Normalizes platform-specific chat message data (TwitchChatMessage, KickChatMessage, YouTubeChatMessage)
 * into a unified API that hides platform differences from downstream code
 */
export interface ChatMessageAdapter {
  /**
   * Gets the platform this adapter wraps
   */
  getPlatform(): Platform;

  /**
   * Gets the message ID (platform-specific)
   */
  getId(): string;

  /**
   * Gets the sender's user ID (platform-specific)
   */
  getUserId(): string;

  /**
   * Gets the sender's username
   */
  getUsername(): string;

  /**
   * Gets the sender's display name
   */
  getDisplayName(): string;

  /**
   * Gets the username color (hex color code), or null if not available
   */
  getColor(): string | null;

  /**
   * Gets the message content
   */
  getMessage(): string;

  /**
   * Gets the message timestamp
   */
  getTimestamp(): Date;

  /**
   * Gets the room/channel ID (platform-specific)
   */
  getRoomId(): string;

  /**
   * Gets the user's badges
   */
  getBadges(): Badge[];

  /**
   * Gets the emotes in the message
   */
  getEmotes(): Emote[];

  /**
   * Checks if the message is a reply to another message
   * Twitch supports replies, other platforms do not
   */
  hasReplyParent(): boolean;

  /**
   * Gets a platform-specific feature value
   * @param feature - The feature name to retrieve
   * @returns The feature data, or null if feature not available
   *
   * Supported features:
   * - 'bits': { value: number } - Twitch cheer amount in bits
   * - 'superChat': { value: number; currency: string } - YouTube Super Chat details
   * - 'tip': { value: number; currency: string } - Kick tip details
   */
  getFeature(feature: 'bits' | 'superChat' | 'tip' | string): FeatureData | null;

  /**
   * Serializes the adapter to raw platform data for database storage
   */
  toStorage(): object;
}
```

**Note:** Badge and Emote types are referenced here but not defined yet. They will be defined in Phase 6 along with PlatformChatMessage types. For now, this interface stubs them.

### Task 5.5: Create EventAdapter.ts (30 minutes)

Define the EventAdapter interface.

**File:** `shared/models/src/adapters/EventAdapter.ts`

**Interface specification:**

```typescript
import type { Platform } from '../Platform';
import type { FeatureData } from '../interface';

/**
 * Event type enumeration
 * Unified event types across platforms (platforms map their events to these)
 */
export type EventType =
  | 'follow'
  | 'subscription'
  | 'resubscribe'
  | 'subscription_gift'
  | 'cheer'
  | 'tip'
  | 'raid'
  | 'point_redemption'
  | 'super_chat'
  | 'super_sticker'
  | 'membership';

/**
 * Event data type - platform-specific event details
 * Structure varies by event type and platform
 */
export type EventData = object;

/**
 * Event adapter interface
 * Normalizes platform-specific event data (TwitchEvent, KickEvent, YouTubeEvent)
 * into a unified API that hides platform differences from downstream code
 */
export interface EventAdapter {
  /**
   * Gets the platform this adapter wraps
   */
  getPlatform(): Platform;

  /**
   * Gets the event ID (platform-specific)
   */
  getId(): string;

  /**
   * Gets the unified event type
   * Maps platform-specific event types to EventType enum
   */
  getType(): EventType;

  /**
   * Gets the event timestamp
   */
  getTimestamp(): Date;

  /**
   * Gets the user ID who triggered the event, or null if not applicable
   * Some events (like raids) may not have clear user attribution
   */
  getUserId(): string | null;

  /**
   * Gets the username who triggered the event, or null if not applicable
   */
  getUsername(): string | null;

  /**
   * Gets the display name who triggered the event, or null if not applicable
   */
  getDisplayName(): string | null;

  /**
   * Gets the platform-specific event data
   * Raw event data structure depends on event type and platform
   */
  getData(): EventData;

  /**
   * Serializes the adapter to raw platform data for database storage
   */
  toStorage(): object;
}
```

### Task 5.6: Create CategoryCache Interface Stub (15 minutes)

Define the CategoryCache interface that will be implemented in Phase 8.

**File:** `shared/models/src/cache/CategoryCache.ts`

```typescript
import type { Platform } from '../Platform';

/**
 * Category cache interface
 * Resolves category IDs to human-readable category names with caching
 *
 * Platforms use different category identifiers:
 * - Twitch: categoryId (numeric ID, e.g., "493057")
 * - Kick: categorySlug (slug string, e.g., "fortnite")
 * - YouTube: categoryId (numeric category ID, e.g., "20")
 *
 * This interface provides a unified way to resolve these to readable names
 */
export interface CategoryCache {
  /**
   * Gets the human-readable category name for a category ID
   * @param categoryId - The category ID or slug
   * @param platform - The platform to resolve for
   * @returns Promise resolving to category name, or generic fallback if not found
   */
  getCategory(categoryId: string, platform: Platform): Promise<string>;

  /**
   * Clears the cache
   */
  clear(): void;
}
```

### Task 5.7: Create Barrel Exports (10 minutes)

**File:** `shared/models/src/adapters/index.ts`

```typescript
export type { StreamAdapter } from './StreamAdapter';
export type { UserAdapter } from './UserAdapter';
export type { ChatMessageAdapter } from './ChatMessageAdapter';
export type { EventAdapter, EventType, EventData } from './EventAdapter';
```

**Update `shared/models/src/index.ts`:**

```typescript
export * from './Platform';
export * from './Stream';
export * from './User';
export * from './StreamStats';
export * from './converters';
export * from './adapters';
export * from './interface';
```

**Update `shared/models/src/cache/index.ts` (create):**

```typescript
export type { CategoryCache } from './CategoryCache';
```

### Task 5.8: Run Build Verification (10 minutes)

```bash
cd shared/models
pnpm build
```

**Expected results:**
- No TypeScript errors (interfaces only, no implementation)
- Type declarations generated for all interfaces
- All exports resolve correctly

**Note:** No tests needed for this phase - these are interface definitions only. Tests will be added in Phase 6 when adapting implementations are created.

---

## File-by-File Breakdown

| File | Lines (approx) | Description |
|------|----------------|-------------|
| `src/interface.ts` | 10-15 | FeatureData type |
| `adapters/StreamAdapter.ts` | 80-100 | StreamAdapter interface with JSDoc |
| `adapters/UserAdapter.ts` | 60-80 | UserAdapter interface with JSDoc |
| `adapters/ChatMessageAdapter.ts` | 70-90 | ChatMessageAdapter interface with stub references |
| `adapters/EventAdapter.ts` | 60-80 | EventAdapter, EventType, EventData types |
| `adapters/index.ts` | 4 | Barrel export |
| `cache/CategoryCache.ts` | 25-35 | CategoryCache interface (stub) |
| `cache/index.ts` | 1 | Barrel export |
| `src/index.ts` | 2 | Add exports |
| **Total** | **310-485 lines** | |

---

## Code Examples

### Example: shared/models/src/interface.ts

```typescript
/**
 * Feature data type for dynamic feature access
 * Adapters store platform-specific features and return them via getFeature()
 *
 * This pattern avoids "optional field soup" by making platform-specific
 * features explicit rather than nullable fields everywhere
 *
 * @example Twitch channel points
 * const feature = adapter.getFeature('twitchChannelPoints');
 * if (feature && 'current' in feature) {
 *   console.log(`Channel points: ${feature.current}`);
 * }
 *
 * @example Kick tips
 * const feature = adapter.getFeature('kickTips');
 * if (feature && 'value' in feature) {
 *   console.log(`Tips: $${feature.value}`);
 * }
 */
export type FeatureData =
  | { current: number }           // Current value (e.g., channel points, Super Chat)
  | { total: number }             // Total value (e.g., subscriber count, view count)
  | { value: number; currency: string; normalizedMicros?: number }  // Monetary amounts
  | { count: number; tier?: number }  // Counts with optional tier (e.g., gift subs)
  | object;                       // Generic object for custom features
```

### Example: shared/models/src/adapters/StreamAdapter.ts

```typescript
import type { Platform } from '../Platform';
import type { CategoryCache } from '../cache/CategoryCache';
import type { FeatureData } from '../interface';

/**
 * Stream adapter interface
 * Normalizes platform-specific stream data (TwitchStream, KickStream, YouTubeStream)
 * into a unified API that hides platform differences from downstream code
 *
 * **Key Design Principle:**
 * Downstream code NEVER switches on platform. All platform differences
 * are accessed via the adapter interface methods.
 *
 * **Platform-Specific Features:**
 * Use hasFeature() and getFeature() to access platform-specific data.
 * This avoids optional field soup and makes platform features explicit.
 *
 * @example Accessing stream title (common across all platforms)
 * const title = adapter.getTitle();
 *
 * @example Accessing Twitch channel points
 * if (adapter.hasFeature('twitchChannelPoints')) {
 *   const feature = adapter.getFeature('twitchChannelPoints');
 *   if (feature && 'current' in feature) {
 *     console.log(`Channel points: ${feature.current}`);
 *   }
 * }
 *
 * @example Accessing with optional chaining (safest)
 * const pointsFeature = adapter.getFeature('twitchChannelPoints');
 * const points = pointsFeature && 'current' in pointsFeature ? pointsFeature.current : 0;
 */
export interface StreamAdapter {
  /**
   * Gets the platform this adapter wraps
   * @returns Platform identifier
   */
  getPlatform(): Platform;

  /**
   * Gets the platform-specific stream ID
   * This is the ID from the original platform:
   * - Twitch: twitchId (stream ID)
   * - Kick: kickId (livestream ID)
   * - YouTube: videoId
   *
   * @returns Platform-specific stream ID
   */
  getId(): string;

  /**
   * Gets the stream title
   * @returns Stream title (present on all platforms)
   */
  getTitle(): string;

  /**
   * Gets the normalized category name
   * Uses injected CategoryCache to resolve platform-specific category IDs
   * to human-readable category names.
   *
   * Category identifiers vary by platform:
   * - Twitch: categoryId (numeric ID, e.g., "493057")
   * - Kick: categorySlug (slug string, e.g., "fortnite")
   * - YouTube: categoryId (numeric category ID, e.g., "20")
   *
   * This method is async because category resolution may require API calls.
   *
   * @returns Promise resolving to human-readable category name
   */
  getCategory(): Promise<string>;

  /**
   * Gets the stream thumbnail URL
   * @returns Thumbnail URL, or null if not available
   */
  getThumbnail(): string | null;

  /**
   * Gets the stream tags
   * @returns Array of tag strings (may be empty)
   */
  getTags(): string[];

  /**
   * Checks if the adapter has a specific platform-specific feature
   * @param feature - The feature name to check
   * @returns True if the feature is available for this platform
   *
   * @example Check if Twitch channel points are available
   * if (adapter.hasFeature('twitchChannelPoints')) {
   *   // Safe to call getFeature()
   * }
   */
  hasFeature(feature: string): boolean;

  /**
   * Gets a platform-specific feature value
   * @param feature - The feature name to retrieve
   * @returns The feature data, or null if feature not available
   *
   * **Standardized Features:**
   *
   * Twitch-specific:
   * - 'twitchChannelPoints': { current: number } - Current channel points balance
   *
   * Kick-specific:
   * - 'kickTips': { value: number; currency: 'USD' } - Total tips received in USD
   *
   * YouTube-specific:
   * - 'youtubeSuperChat': { value: number; currency: string } - Total Super Chat earnings
   * - 'subscriberCount': { total: number } - Channel subscriber count
   *
   * **Pattern:**
   * Always check the result structure before accessing:
   *
   * @example Accessing a feature safely
   * const feature = adapter.getFeature('twitchChannelPoints');
   * if (feature && 'current' in feature) {
   *   console.log(`Points: ${feature.current}`);
   * }
   *
   * **Adding New Features:**
   * Platform strategies can add custom features using string literal types.
   * Document new features in the PlatformStrategy documentation.
   */
  getFeature(feature: 'twitchChannelPoints' | 'kickTips' | 'youtubeSuperChat' | 'subscriberCount' | string): FeatureData | null;

  /**
   * Serializes the adapter to raw platform data for database storage
   * Returns the original platform-specific stream object without adapter wrapper.
   *
   * @returns Platform-specific stream object (TwitchStream, KickStream, or YouTubeStream)
   */
  toStorage(): object;
}
```

---

## Design Decisions

### Decision 1: Async getCategory() vs Cached Category in Adapter

**Approach:** `getCategory()` is async and delegates to CategoryCache interface.

**Rationale:**
- Category IDs don't map directly to names (require API lookup)
- CategoryCache handles caching logic, not adapters
- Allows swapping cache implementations (in-memory, database, etc.)
- Keeps adapters focused on normalization, not caching

**Alternative considered:** Store category name in adapter on construction
- Problem: Would require category lookup on EVERY stream creation (performance hit)
- Problem: Adapters would need to handle API calls (adds complexity)

### Decision 2: Dynamic Feature Pattern vs Optional Fields

**Approach:** Use `hasFeature()` and `getFeature()` instead of nullable optional fields like `channelPoints?: number`.

**Rationale:**
- Prevents "optional field soup" where every field becomes nullable
- Makes platform-specific features explicit (you know it's platform-specific)
- Runtime flexibility to add new features without type changes
- Clearer intent: `adapter.getFeature('twitchChannelPoints')` vs `adapter.channelPoints`

**Example of optional field soup (what we're avoiding):**
```typescript
// Bad approach - optional field soup
interface StreamAdapter {
  get channelId();
  get title();
  get channelPoints(); // Wait, is this null on Kick?
  get tips();          // Twitch vs Kick vs YouTube?
  get superChat();     // YouTube only?
  get subscriberCount(); // YouTube only?
}
```

**Our approach:**
```typescript
// Good approach - explicit feature access
const pointsFeature = adapter.getFeature('twitchChannelPoints');
if (pointsFeature && 'current' in pointsFeature) {
  // Handle Twitch channel points
}
```

### Decision 3: FeatureData Union Type vs Generic `any`

**Approach:** Define `FeatureData` as a discriminated union of specific shapes.

**Rationale:**
- Type guards work: `'current' in feature` narrows type correctly
- Better IDE autocomplete (knows available fields based on discriminator)
- Self-documenting: Each variant has semantic meaning
- Catch type errors at compile time

**Alternative considered:** Use `any` or `Record<string, unknown>`
- Problem: No type safety
- Problem: No IDE support
- Problem: Easy to make typos in field access

### Decision 4: getDisplayName() Always Returns String (not nullable)

**Approach:** `getDisplayName()` returns string (not `string | null`), fallback to username.

**Rationale:**
- Kick: `display_name` can be null (not all channels set it)
- But UX: Always want to show something to the user
- Fallback to `getUsername()` is reasonable and safe

**Implementation note:** Adapter implementations in Phase 6 will handle this logic internally:
```typescript
getDisplayName(): string {
  return this.data.displayName || this.getUsername();
}
```

### Decision 5: EventAdapter.getUserId() Can Return Null

**Approach:** Some events may not have clear user attribution, return `string | null`.

**Rationale:**
- Raids: The raiding user is clear, but the raided-to user?
- Multi-user events: Some events involve multiple users
- Backend events: Some system events don't have user ID

### Decision 6: toStorage() Returns object vs JSON string

**Approach:** `toStorage()` returns raw platform object, not serialized JSON string.

**Rationale:**
- Database layer handles JSON serialization
- Allows database layer to use binary formats if desired (e.g., SQLite JSON vs BSON)
- More flexible for future storage optimizations
- Avoids double JSON parsing (stringify → parse)

---

## Edge Cases to Handle

### 1. Missing Display Name (Kick)
**Issue:** Kick channels may not have `display_name` set.
**Resolution:** Adapter implementations in Phase 6 will fallback to `username`.

### 2. Empty Category ID
**Issue:** Streams with no category (empty string or null).
**Resolution:** `getCategory()` should return generic fallback like "Uncategorized" or "No Category".

### 3. Thumbnail Templates with Placeholders
**Issue:** Twitch thumbnails have `{width}x{height}` placeholders in URL.
**Resolution:** Adapter implementations return template as-is. Resolution layer (UI) handles URL construction.

### 4. Chat Reply Parent (Twitch Only)
**Issue:** Only Twitch supports message replies, other platforms don't.
**Resolution:** `ChatMessageAdapter.hasReplyParent()` returns false on Kick/YouTube.

### 5. Event Without User Attribution
**Issue:** Some events (raids) may not have clear user ID.
**Resolution:** `EventAdapter.getUserId()` and `getUsername()` return null, caller handles gracefully.

### 6. Category Cache Not Implemented Yet
**Issue:** CategoryCache interface defined now, implementation in Phase 8.
**Resolution:** Mock/stub CategoryCache for Phase 6 adapter implementations tests.

---

## Inter-Phase Dependencies

### Depends On:
- **Phase 2:** Platform types (TwitchStream, KickStream, YouTubeStream, PlatformUser)
- **Phase 3:** StreamStats type

### Enables:
- **Phase 6:** Adapter implementations (this phase provides the interface contracts)
- **Phase 7:** Translator layer (uses adapter interfaces as contracts)
- **Phase 8:** CategoryCache implementation (implements CategoryCache interface)

### Future Dependencies:
- **Platform strategies (Twitch, Kick, YouTube):** Will return adapters from API calls
- **WebSocket broadcasting:** Will send serialized adapters to clients
- **Analytics calculations:** Will consume adapters for normalized data access

---

## Success Criteria

- [ ] `interface.ts` created with FeatureData type
- [ ] `StreamAdapter.ts` created with complete interface definition
- [ ] `UserAdapter.ts` created with complete interface definition
- [ ] `ChatMessageAdapter.ts` created with interface (includes stub references to Badge/Emote)
- [ ] `EventAdapter.ts` created with EventType union and complete interface
- [ ] `CategoryCache.ts` created with interface (stub, implementation in Phase 8)
- [ ] All interfaces have comprehensive JSDoc comments
- [ ] All interfaces exported via barrel files (adapters/index.ts, cache/index.ts, src/index.ts)
- [ ] `pnpm build` succeeds with no TypeScript errors
- [ ] No circular dependencies
- [ ] All interface methods clearly documented with usage examples

---

## Deliverables

1. **Interface definitions:**
   - `shared/models/src/interface.ts` - FeatureData type
   - `shared/models/src/adapters/StreamAdapter.ts`
   - `shared/models/src/adapters/UserAdapter.ts`
   - `shared/models/src/adapters/ChatMessageAdapter.ts`
   - `shared/models/src/adapters/EventAdapter.ts`
   - `shared/models/src/cache/CategoryCache.ts`

2. **Barrel exports:**
   - `shared/models/src/adapters/index.ts`
   - `shared/models/src/cache/index.ts`
   - `shared/models/src/index.ts` (updated)

3. **Build artifacts:**
   - Type declarations in `shared/models/dist/`

---

## Notes

- **Interface-only phase:** No implementations, just contracts
- **No tests needed:** Tests will be in Phase 6 when implementing adapters
- **Circular dependency risk:** CategoryCache imports Platform, Platform imports nothing. Verify no cycles after Phase 8.
- **Feature naming convention:** Use camelCase for feature names with platform prefix when needed (twitchChannelPoints, kickTips, youtubeSuperChat)
- **toStorage() semantics:** Returns raw platform object, not serialized string. Database layer handles JSON serialization.
- **JSDoc investment:** Comprehensive JSDoc critical for developer experience - defines the contract clearly
- **Future extensibility:** Feature pattern works for unknown future features without type changes

---

## Next Steps After This Phase

Once Phase 5 is complete:

1. **Phase 6: Adapter Implementations**
   - Implement concrete adapter classes for each platform
   - Wrap platform types and implement interface methods
   - Create unified Stream and User wrapper types
   - Define Missing types: Badge, Emote, PlatformChatMessage, PlatformEvent

2. **Phase 7: Translator Layer**
   - Create adapters from platform types using converters from Phase 4

3. **Phase 8: Category Cache**
   - Implement CategoryCache interface (defined in this phase)
   - Create InMemoryCategoryCache implementation
   - Create DatabaseCategoryCache implementation

---

## Status

**Ready for implementation**

**Estimated Effort:** 3-4 hours
**Dependencies:** Phase 2 complete, Phase 3 complete
**Followed by:** Phase 6 - Adapter Implementations

---
