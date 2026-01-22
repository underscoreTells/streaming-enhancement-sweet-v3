# Phase Plan: Shared Data Models - Phase 2 - Platform-Specific Base Types

## Phase Overview

**Phase:** 2 of 13
**Title:** Platform-Specific Base Types
**Estimated Time:** 8-10 hours
**Status:** Complete

## Objective

Create the fundamental platform-specific data types for Streams, Users, and the Platform enum. This establishes the core type contract that all adapters, translators, and converters will work with.

**Important:** NO unified wrapper types (`Stream` and `User`) in this phase - those will be added in Phase 6 (Adapter Implementations) along with the adapter layer.

---

## Configuration

- **Files to create:** `Platform.ts`, `Stream.ts`, `User.ts`
- **Location:** `shared/models/src/`
- **Dependencies:** Phase 1 (Module Structure) complete
- **Followed by:** Phase 3 (Live Data Types - StreamStats)

---

## Dependencies

**Before starting this phase, ensure:**
- ✅ Phase 1 complete (directory structure, package.json, tsconfig.json, vitest.config.ts)

**This phase has no dependencies on other Shared Data Models phases** - it defines the foundational types.

---

## Tasks Breakdown

### Task 2.1: Create Platform.ts and Platform Type (1 hour)

Create the Platform type union and helper functions.

**File:** `shared/models/src/Platform.ts`

**Types to define:**
- `Platform` type union: `'twitch' | 'kick' | 'youtube'`
- `Platform` const enum with string values (for better DX)
- `isValidPlatform(value: unknown): value is Platform` validator
- `getPlatformName(platform: Platform): string` helper

**Implementation:**
```typescript
export type Platform = 'twitch' | 'kick' | 'youtube';

export const Platform = {
  Twitch: 'twitch',
  Kick: 'kick',
  YouTube: 'youtube',
} as const;

export function isValidPlatform(value: unknown): value is Platform {
  return (
    typeof value === 'string' &&
    (value === 'twitch' || value === 'kick' || value === 'youtube')
  );
}

export function getPlatformName(platform: Platform): string {
  switch (platform) {
    case 'twitch':
      return 'Twitch';
    case 'kick':
      return 'Kick';
    case 'youtube':
      return 'YouTube';
  }
}
```

---

### Task 2.2: Create Stream.ts Platform Types (3 hours)

Create the platform-specific stream types with disciplined field structures.

**File:** `shared/models/src/Stream.ts`

**Types to define:**
- `TwitchStream` interface (9 fields)
- `KickStream` interface (8 fields)
- `YouTubeStream` interface (9 fields)
- `PlatformStream` union type

**Field Mapping Requirements:**
- Add comments referencing API-RESEARCH.md line numbers
- All fields are required (no optionals for core fields)
- Use `string | null` for truly optional data (thumbnail, avatar)
- NO `viewerCount` field (live data, Phase 3)
- NO `startedAt` or `createdAt` timestamps in stream types (OBS-driven, in wrapper)

---

#### Exact Field Specifications

**TwitchStream** (9 fields)

Source: `@docs/research/API-RESEARCH.md` lines 52-100

```typescript
import { Platform } from './Platform';

interface TwitchStream {
  platform: Platform.Twitch;
  twitchId: string;           // From API: streams[].id
  username: string;           // From API: streams[].user_login
  title: string;              // From API: streams[].title
  categoryId: string;         // From API: streams[].game_id (empty string if no game)
  tags: string[];             // From API: streams[].tags (empty array if none)
  isMature: boolean;          // From API: streams[].is_mature
  language: string;           // From API: streams[].language (ISO 639-1)
  thumbnailUrl: string | null;// From API: streams[].thumbnail_url (null if missing)
  channelPoints: number;      // From separate channel points endpoint
}
```

**KickStream** (8 fields)

Source: `@docs/research/API-RESEARCH.md` lines 706-738

```typescript
interface KickStream {
  platform: Platform.Kick;
  kickId: string;             // From API: livestream.id
  username: string;           // From API: livestream.username or user_login
  title: string;              // From API: livestream.title
  categorySlug: string;       // From API: livestream.category_slug (empty string if no category)
  tags: string[];             // From API: livestream.tags (empty array if none)
  language: string;           // From API: livestream.language (ISO 639-1)
  thumbnailUrl: string | null;// From API: livestream.thumbnail (null if missing)
  totalTipsUsd: number;       // From API: total tips received
}
```

**YouTubeStream** (9 fields)

Source: `@docs/research/API-RESEARCH.md` lines 889-1015 (videos.list + liveStreams.list)

```typescript
interface YouTubeStream {
  platform: Platform.YouTube;
  videoId: string;            // From API: videos[].id
  channelTitle: string;       // From API: videos[].snippet.channelTitle
  title: string;              // From API: videos[].snippet.title
  categoryId: string;         // From API: videos[].snippet.categoryId
  tags: string[];             // From API: videos[].snippet.tags (empty array if none)
  privacyStatus: string;      // From API: videos[].status.privacyStatus (public, unlisted, private)
  thumbnailUrl: string | null;// From API: videos[].snippet.thumbnails.default.url
  subscriberCount: number;    // From API: videos[].statistics.subscriberCount
  superChatTotal: number;     // From API: total Super Chat earnings
}
```

**PlatformStream Union:**
```typescript
type PlatformStream = TwitchStream | KickStream | YouTubeStream;
```

---

### Task 2.3: Create User.ts Platform Types (3 hours)

Create the platform-specific user types with disciplined field structures.

**File:** `shared/models/src/User.ts`

**Types to define:**
- `TwitchUser` interface (7 fields)
- `KickUser` interface (8 fields)
- `YouTubeUser` interface (9 fields)
- `PlatformUser` union type

**Field Mapping Requirements:**
- Add comments referencing API-RESEARCH.md line numbers
- All core fields required (username, ID, displayName)
- Use `string | null` for optional data (avatar, bio)
- Use `Date | null` for timestamps (converters will parse ISO8601 strings)

---

#### Exact Field Specifications

**TwitchUser** (7 fields)

Source: `@docs/research/API-RESEARCH.md` lines 215-260

```typescript
import { Platform } from './Platform';

interface TwitchUser {
  platform: Platform.Twitch;
  twitchId: string;           // From API: users[].id
  username: string;           // From API: users[].login
  displayName: string;        // From API: users[].display_name
  profileImageUrl: string | null; // From API: users[].profile_image_url
  bio: string | null;         // From API: users[].description
  createdAt: Date | null;     // From API: users[].created_at (parsed from ISO8601)
}
```

**KickUser** (8 fields)

Source: `@docs/research/API-RESEARCH.md` lines 742-764

```typescript
interface KickUser {
  platform: Platform.Kick;
  kickId: string;             // From API: channels.id
  username: string;           // From API: channels.username
  displayName: string | null; // From API: channels.display_name
  avatarUrl: string | null;   // From API: channels.avatar_url
  bio: string | null;         // From API: channels.bio
  isVerified: boolean;        // From API: channels.is_verified
  createdAt: Date | null;     // From API: channels.created_at (parsed from ISO8601)
}
```

**YouTubeUser** (9 fields)

Source: `@docs/research/API-RESEARCH.md` lines 1065-1174 (channels.list)

```typescript
interface YouTubeUser {
  platform: Platform.YouTube;
  channelId: string;          // From API: channels[].id
  channelTitle: string;       // From API: channels[].snippet.title
  customUrl: string | null;   // From API: channels[].snippet.customUrl (@handle)
  thumbnailUrl: string | null;// From API: channels[].snippet.thumbnails.default.url
  description: string | null; // From API: channels[].snippet.description
  subscriberCount: number;    // From API: channels[].statistics.subscriberCount
  videoCount: number;         // From API: channels[].statistics.videoCount
  viewCount: number;          // From API: channels[].statistics.viewCount
  createdAt: Date | null;     // From API: channels[].snippet.publishedAt (parsed from ISO8601)
}
```

**PlatformUser Union:**
```typescript
type PlatformUser = TwitchUser | KickUser | YouTubeUser;
```

---

### Task 2.4: Update index.ts Barrel Exports (30 minutes)

Update `shared/models/src/index.ts` to export all new types.

```typescript
export * from './Platform';
export * from './Stream';
export * from './User';
```

---

### Task 2.5: Write Unit Tests (2-3 hours)

Create comprehensive unit tests with 100% coverage target.

**Test files:**
- `shared/models/__tests__/Platform.test.ts`
- `shared/models/__tests__/Stream.test.ts`
- `shared/models/__tests__/User.test.ts`

---

#### Test Coverage Requirements

**Platform.test.ts:**
- Test `isValidPlatform` returns `true` for valid platforms
- Test `isValidPlatform` returns `false` for invalid values (null, undefined, wrong strings, numbers)
- Test `getPlatformName` returns correct strings for all platforms
- Test `Platform` const enum values match type strings

**Stream.test.ts:**
- Test type guards can narrow `PlatformStream` to specific types
- Mock API responses from API-RESEARCH.md to verify field compatibility
- Verify all required fields are present in mock data
- Test that `thumbnailUrl` can be `null` (handled correctly)

**User.test.ts:**
- Test type guards can narrow `PlatformUser` to specific types
- Mock API responses from API-RESEARCH.md to verify field compatibility
- Verify all required fields are present in mock data
- Test that optional fields (`avatarUrl`, `bio`, `createdAt`) can be `null`

---

### Task 2.6: Run Build and Tests (30 minutes)

Verify implementation works correctly.

```bash
cd shared/models
pnpm build
pnpm test
```

**Expected results:**
- `pnpm build` generates type declarations for all new files
- `pnpm test` passes all tests with 100% coverage
- No TypeScript errors in workspace

---

## File-by-File Breakdown

| File | Lines (approx) | Description |
|------|----------------|-------------|
| `src/Platform.ts` | 30-40 | Platform type, validator, helper |
| `src/Stream.ts` | 80-100 | TwitchStream, KickStream, YouTubeStream, PlatformStream |
| `src/User.ts` | 80-100 | TwitchUser, KickUser, YouTubeUser, PlatformUser |
| `src/index.ts` | 3 | Barrel exports |
| `__tests__/Platform.test.ts` | 40-50 | Platform validator and helper tests |
| `__tests__/Stream.test.ts` | 60-80 | Stream type tests with mocks |
| `__tests__/User.test.ts` | 60-80 | User type tests with mocks |
| **Total** | **350-450 lines** | |

---

## Code Examples

### Example: shared/models/src/Platform.ts

```typescript
/**
 * Platform type union
 * Represents all supported streaming platforms
 */
export type Platform = 'twitch' | 'kick' | 'youtube';

/**
 * Platform const enum for better developer experience
 * Usage: Platform.Twitch, Platform.Kick, Platform.YouTube
 */
export const Platform = {
  Twitch: 'twitch',
  Kick: 'kick',
  YouTube: 'youtube',
} as const;

/**
 * Type guard to check if a value is a valid Platform
 * @param value - The value to check
 * @returns True if the value is a valid Platform
 */
export function isValidPlatform(value: unknown): value is Platform {
  return (
    typeof value === 'string' &&
    (value === 'twitch' || value === 'kick' || value === 'youtube')
  );
}

/**
 * Gets the human-readable platform name
 * @param platform - The platform
 * @returns Human-readable platform name
 */
export function getPlatformName(platform: Platform): string {
  switch (platform) {
    case 'twitch':
      return 'Twitch';
    case 'kick':
      return 'Kick';
    case 'youtube':
      return 'YouTube';
  }
}
```

### Example: shared/models/src/Stream.ts

```typescript
import { Platform } from './Platform';

/**
 * Twitch stream data
 * Field mappings from @docs/research/API-RESEARCH.md lines 52-100
 */
export interface TwitchStream {
  platform: Platform.Twitch;

  /** Stream ID (from streams[].id) */
  twitchId: string;

  /** Broadcaster username (from streams[].user_login) */
  username: string;

  /** Stream title (from streams[].title) */
  title: string;

  /** Game/category ID (from streams[].game_id, empty string if no game) */
  categoryId: string;

  /** Stream tags (from streams[].tags, empty array if none) */
  tags: string[];

  /** Mature content flag (from streams[].is_mature) */
  isMature: boolean;

  /** Stream language code (from streams[].language, ISO 639-1) */
  language: string;

  /** Thumbnail URL (from streams[].thumbnail_url, null if missing) */
  thumbnailUrl: string | null;

  /** Twitch channel points (from separate channel points endpoint) */
  channelPoints: number;
}

/**
 * Kick stream data
 * Field mappings from @docs/research/API-RESEARCH.md lines 706-738
 */
export interface KickStream {
  platform: Platform.Kick;

  /** Stream ID (from livestream.id) */
  kickId: string;

  /** Broadcaster username (from livestream.username) */
  username: string;

  /** Stream title (from livestream.title) */
  title: string;

  /** Category/game slug (from livestream.category_slug, empty string if no category) */
  categorySlug: string;

  /** Stream tags (from livestream.tags, empty array if none) */
  tags: string[];

  /** Stream language code (from livestream.language, ISO 639-1) */
  language: string;

  /** Thumbnail URL (from livestream.thumbnail, null if missing) */
  thumbnailUrl: string | null;

  /** Total tips received in USD */
  totalTipsUsd: number;
}

/**
 * YouTube stream data
 * Field mappings from @docs/research/API-RESEARCH.md lines 889-1015
 */
export interface YouTubeStream {
  platform: Platform.YouTube;

  /** Video ID (from videos[].id) */
  videoId: string;

  /** Channel title (from videos[].snippet.channelTitle) */
  channelTitle: string;

  /** Stream title (from videos[].snippet.title) */
  title: string;

  /** Category ID (from videos[].snippet.categoryId) */
  categoryId: string;

  /** Video tags (from videos[].snippet.tags, empty array if none) */
  tags: string[];

  /** Privacy status (from videos[].status.privacyStatus: public, unlisted, private) */
  privacyStatus: string;

  /** Thumbnail URL (from videos[].snippet.thumbnails.default.url, null if missing) */
  thumbnailUrl: string | null;

  /** Channel subscriber count (from videos[].statistics.subscriberCount) */
  subscriberCount: number;

  /** Total Super Chat earnings */
  superChatTotal: number;
}

/**
 * Platform stream type union
 */
export type PlatformStream = TwitchStream | KickStream | YouTubeStream;
```

### Example: shared/models/src/User.ts

```typescript
import { Platform } from './Platform';

/**
 * Twitch user data
 * Field mappings from @docs/research/API-RESEARCH.md lines 215-260
 */
export interface TwitchUser {
  platform: Platform.Twitch;

  /** User ID (from users[].id) */
  twitchId: string;

  /** Username/login (from users[].login) */
  username: string;

  /** Display name (from users[].display_name) */
  displayName: string;

  /** Profile image URL (from users[].profile_image_url, null if missing) */
  profileImageUrl: string | null;

  /** Bio/description (from users[].description, null if missing) */
  bio: string | null;

  /** Account creation date (from users[].created_at, parsed from ISO8601, null if missing) */
  createdAt: Date | null;
}

/**
 * Kick user data
 * Field mappings from @docs/research/API-RESEARCH.md lines 742-764
 */
export interface KickUser {
  platform: Platform.Kick;

  /** User ID (from channels.id) */
  kickId: string;

  /** Username (from channels.username) */
  username: string;

  /** Display name (from channels.display_name, null if missing) */
  displayName: string | null;

  /** Avatar URL (from channels.avatar_url, null if missing) */
  avatarUrl: string | null;

  /** Bio (from channels.bio, null if missing) */
  bio: string | null;

  /** Verification status (from channels.is_verified) */
  isVerified: boolean;

  /** Account creation date (from channels.created_at, parsed from ISO8601, null if missing) */
  createdAt: Date | null;
}

/**
 * YouTube user data
 * Field mappings from @docs/research/API-RESEARCH.md lines 1065-1174
 */
export interface YouTubeUser {
  platform: Platform.YouTube;

  /** Channel ID (from channels[].id) */
  channelId: string;

  /** Channel title (from channels[].snippet.title) */
  channelTitle: string;

  /** Custom URL/handle (from channels[].snippet.customUrl, null if missing) */
  customUrl: string | null;

  /** Thumbnail URL (from channels[].snippet.thumbnails.default.url, null if missing) */
  thumbnailUrl: string | null;

  /** Channel description (from channels[].snippet.description, null if missing) */
  description: string | null;

  /** Subscriber count (from channels[].statistics.subscriberCount) */
  subscriberCount: number;

  /** Total video count (from channels[].statistics.videoCount) */
  videoCount: number;

  /** Total view count (from channels[].statistics.viewCount) */
  viewCount: number;

  /** Channel creation date (from channels[].snippet.publishedAt, parsed from ISO8601, null if missing) */
  createdAt: Date | null;
}

/**
 * Platform user type union
 */
export type PlatformUser = TwitchUser | KickUser | YouTubeUser;
```

### Example: shared/models/src/index.ts

```typescript
// Platform types
export * from './Platform';

// Stream types
export * from './Stream';

// User types
export * from './User';
```

### Example: shared/models/__tests__/Platform.test.ts

```typescript
import { describe, it, expect } from 'vitest';
import { Platform, isValidPlatform, getPlatformName } from '../src/Platform';

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
        // TypeScript knows value is Platform here
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

  describe('Platform const enum', () => {
    it('has correct values', () => {
      expect(Platform.Twitch).toBe('twitch');
      expect(Platform.Kick).toBe('kick');
      expect(Platform.YouTube).toBe('youtube');
    });
  });
});
```

---

## Edge Cases to Handle

1. **Empty arrays vs null:**
   - Tags should default to `[]` not `null` if missing
   - API-RESEARCH.md shows `tags` can be optional array

2. **Empty strings vs null:**
   - `categoryId`, `categorySlug` default to `''` if missing
   - `thumbnailUrl`, `avatarUrl` default to `null` if missing

3. **Date parsing:**
   - Converters (Phase 4) will parse ISO8601 strings to `Date`
   - Types use `Date | null` for optional timestamps

4. **Number parsing:**
   - YouTube APIs return numbers as strings (e.g., `"123"`)
   - Converters will parse to `number`, types use `number`

---

## Success Criteria

- [ ] `Platform.ts` created with type, const enum, validator, helper
- [ ] `Stream.ts` created with TwitchStream, KickStream, YouTubeStream, PlatformStream
- [ ] `User.ts` created with TwitchUser, KickUser, YouTubeUser, PlatformUser
- [ ] All files exported from `index.ts`
- [ ] All types have proper imports and dependencies
- [ ] All field mapping comments reference API-RESEARCH.md lines
- [ ] Mock API responses from API-RESEARCH.md used in tests
- [ ] Unit tests written with 100% coverage
- [ ] `pnpm build` succeeds with no errors
- [ ] `pnpm test` passes all tests
- [ ] No TypeScript errors in workspace

---

## Deliverables

1. **Type definitions:**
   - `shared/models/src/Platform.ts`
   - `shared/models/src/Stream.ts`
   - `shared/models/src/User.ts`

2. **Updated exports:**
   - `shared/models/src/index.ts`

3. **Test coverage:**
   - `shared/models/__tests__/Platform.test.ts`
   - `shared/models/__tests__/Stream.test.ts`
   - `shared/models/__tests__/User.test.ts`

4. **Build artifacts:**
   - Type declarations in `shared/models/dist/`

---

## Notes

- This phase defines ONLY platform-specific base types, NOT wrapper types
- Wrapper types (`Stream` with `streams: Map<Platform, StreamAdapter>`) will be in Phase 6
- All fields are required except explicitly nullable fields (`string | null`, `Date | null`)
- Empty arrays default to `[]` (not `null`)
- Empty strings default to `''` (not `null`)
- Use `Date` type for readability, converters handle ISO8601 parsing
- No `viewerCount` field - live data in Phase 3
- Field mapping comments must reference API-RESEARCH.md line numbers

---

## Next Steps After This Phase

Once Phase 2 is complete:

1. **Phase 3:** Live Data Types (StreamStats - viewerCount, followerCount, etc.)
2. **Phase 4:** Converter Layer (convert API responses to platform types)
3. **Phase 5:** Adapter Interfaces (StreamAdapter, UserAdapter)
4. **Phase 6:** Adapter Implementations + Wrapper Types (Stream, User)

---

## Status

**Ready for implementation**

**Estimated Effort:** 8-10 hours
**Dependencies:** Phase 1 complete
**Followed by:** Phase 3 - Live Data Types
