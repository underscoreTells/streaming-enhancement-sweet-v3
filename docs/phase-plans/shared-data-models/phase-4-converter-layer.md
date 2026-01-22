# Phase Plan: Shared Data Models - Phase 4 - Converter Layer

## Phase Overview

**Phase:** 4 of 13
**Title:** Converter Layer
**Estimated Time:** 8-12 hours
**Status:** Complete

## Objective

Create converter classes that transform raw API responses from Twitch, Kick, and YouTube into our platform-specific types (TwitchStream, KickStream, YouTubeStream, TwitchUser, KickUser, YouTubeUser). This isolates API format changes from the rest of the codebase.

---

## Configuration

- **Files to create:**
  - `converters/TwitchConverter.ts`
  - `converters/KickConverter.ts`
  - `converters/YouTubeConverter.ts`
  - `converters/index.ts`
- **Location:** `shared/models/src/converters/`
- **Dependencies:** Phase 2 (Platform-Specific Base Types) complete, Phase 3 (StreamStats) complete
- **Followed by:** Phase 5 (Adapter Interfaces)

---

## Dependencies

**Before starting this phase, ensure:**
- ✅ Phase 2 complete (Platform types: TwitchStream, KickStream, YouTubeStream, TwitchUser, KickUser, YouTubeUser)
- ✅ Phase 3 complete (StreamStats type)
- ✅ API-RESEARCH.md available for field mapping references

**This phase depends on:**
- Platform types from Phase 2 (converters output these types)
- API-RESEARCH.md documentation for field mappings

---

## Tasks Breakdown

### Task 4.1: Create TwitchConverter.ts (3-4 hours)

Convert Twitch Helix API responses to TwitchStream and TwitchUser.

**File:** `shared/models/src/converters/TwitchConverter.ts`

**Functions to implement:**

```typescript
export class TwitchConverter {
  /**
   * Convert Twitch Helix streams API response to TwitchStream
   * API Endpoint: GET /helix/streams
   * API Response: docs/research/API-RESEARCH.md lines 52-100
   *
   * @param data - Raw API response
   * @returns TwitchStream
   * @throws Error if response is invalid
   */
  static convertStream(data: unknown): TwitchStream;

  /**
   * Convert Twitch Helix users API response to TwitchUser
   * API Endpoint: GET /helix/users
   * API Response: docs/research/API-RESEARCH.md lines 227-260
   *
   * @param data - Raw API response
   * @returns TwitchUser
   * @throws Error if response is invalid
   */
  static convertUser(data: unknown): TwitchUser;

  private static parseDate(isoString: string | undefined | null): Date | null;
}
```

**Stream conversion mapping:**

| API Field (lines 52-70) | TwitchStream Field | Default |
|------------------------|-------------------|---------|
| `id` | `twitchId` | N/A (required) |
| `user_login` | `username` | N/A (required) |
| `title` | `title` | N/A (required) |
| `game_id` | `categoryId` | `''` if empty |
| `tags` | `tags` | `[]` if missing |
| `is_mature` | `isMature` | `false` if missing |
| `language` | `language` | N/A (required) |
| `thumbnail_url` | `thumbnailUrl` | `null` if missing |
| N/A | `channelPoints` | `0` (separate endpoint later) |

**Sample API response (lines 75-100):**
```json
{
  "data": [{
    "id": "1234567890",
    "user_login": "ninja",
    "user_name": "Ninja",
    "game_id": "493057",
    "game_name": "Fortnite",
    "type": "live",
    "title": "SOLO Q TO CONQUER! !prime",
    "viewer_count": 14250,
    "started_at": "2021-03-10T15:04:21Z",
    "language": "en",
    "thumbnail_url": "https://static-cdn.jtvnw.net/previews-ttv/live_user_ninja-{width}x{height}.jpg",
    "tag_ids": ["6ea6bca4-b471-4ab6-a371-4360a4c7dd11"],
    "tags": ["English", "Fortnite"],
    "is_mature": false
  }]
}
```

**User conversion mapping:**

| API Field (lines 227-240) | TwitchUser Field | Default |
|--------------------------|------------------|---------|
| `id` | `twitchId` | N/A (required) |
| `login` | `username` | N/A (required) |
| `display_name` | `displayName` | N/A (required) |
| `profile_image_url` | `profileImageUrl` | `null` if missing |
| `description` | `bio` | `null` if missing |
| `created_at` | `createdAt` | Parse ISO8601, `null` if invalid |

**Sample API response (lines 242-260):**
```json
{
  "data": [{
    "id": "123456",
    "login": "ninja",
    "display_name": "Ninja",
    "type": "",
    "broadcaster_type": "partner",
    "description": "Professional gamer, streamer, and entertainer.",
    "profile_image_url": "https://static-cdn.jtvnw.net/jtv_user_pictures/ninja-profile_image-0d31d9d4a2a3f03e-300x300.png",
    "offline_image_url": "https://static-cdn.jtvnw.net/jtv_user_pictures/ninja-channel_offline_image-0d31d9d4a2a3f03e-1920x1080.png",
    "view_count": 2345678,
    "email": "ninja@example.com",
    "created_at": "2016-01-01T00:00:00Z"
  }]
}
```

---

### Task 4.2: Create KickConverter.ts (2-3 hours)

Convert Kick API responses to KickStream and KickUser.

**File:** `shared/models/src/converters/KickConverter.ts`

**Functions to implement:**

```typescript
export class KickConverter {
  /**
   * Convert Kick livestream API response to KickStream
   * API Endpoint: GET /api/v2/channels/{channel}/livestream
   * API Response: docs/research/API-RESEARCH.md lines 706-738
   *
   * @param data - Raw API response
   * @returns KickStream
   * @throws Error if response is invalid
   */
  static convertStream(data: unknown): KickStream;

  /**
   * Convert Kick channel API response to KickUser
   * API Endpoint: GET /api/v2/channels/{channel}
   * API Response: docs/research/API-RESEARCH.md lines 742-764
   *
   * @param data - Raw API response
   * @returns KickUser
   * @throws Error if response is invalid
   */
  static convertUser(data: unknown): KickUser;

  private static parseDate(isoString: string | undefined | null): Date | null;
}
```

**Stream conversion mapping:**

| API Field (lines 706-722) | KickStream Field | Default |
|--------------------------|-----------------|---------|
| `id` | `kickId` | N/A (required) |
| `username` / `user_login` | `username` | N/A (required) |
| `title` | `title` | N/A (required) |
| `category_slug` | `categorySlug` | `''` if missing |
| `tags` | `tags` | `[]` if missing |
| `language` | `language` | `'en'` if missing |
| `thumbnail` | `thumbnailUrl` | `null` if missing |
| N/A | `totalTipsUsd` | `0` (separate endpoint later) |

**Sample API response (lines 724-738):**
```json
{
  "id": "123456",
  "channel_id": "789",
  "category_id": "fortnite",
  "category_name": "Fortnite",
  "title": "Playing some Fortnite!",
  "thumbnail": "https://.../thumbnail.jpg",
  "is_live": true,
  "viewer_count": 5420,
  "created_at": "2024-01-15T10:30:00Z",
  "language": "en",
  "tags": ["gaming", "fortnite"]
}
```

**User conversion mapping:**

| API Field (lines 746-763) | KickUser Field | Default |
|--------------------------|----------------|---------|
| `id` | `kickId` | N/A (required) |
| `username` | `username` | N/A (required) |
| `display_name` | `displayName` | `null` if missing |
| `avatar_url` | `avatarUrl` | `null` if missing |
| `bio` | `bio` | `null` if missing |
| `is_verified` | `isVerified` | `false` if missing |
| `created_at` | `createdAt` | Parse ISO8601, `null` if invalid |

**Sample API response (lines 745-764):**
```json
{
  "id": "channel-id",
  "user_id": "user-id",
  "username": "streamer",
  "display_name": "Streamer Name",
  "bio": "Bio description",
  "avatar_url": "https://.../avatar.jpg",
  "banner_url": "https://.../banner.jpg",
  "followers_count": 10000,
  "following_count": 500,
  "subscriber_count": 5000,
  "is_verified": true,
  "is_banned": false,
  "created_at": "2023-01-15T10:30:00Z"
}
```

---

### Task 4.3: Create YouTubeConverter.ts (3-4 hours)

Convert YouTube Data API v3 responses to YouTubeStream and YouTubeUser.

**File:** `shared/models/src/converters/YouTubeConverter.ts`

**Functions to implement:**

```typescript
export class YouTubeConverter {
  /**
   * Convert YouTube videos API response to YouTubeStream
   * API Endpoint: GET youtube/v3/videos
   * API Response: docs/research/API-RESEARCH.md lines 995-1050
   *
   * @param data - Raw API response
   * @returns YouTubeStream
   * @throws Error if response is invalid
   */
  static convertStream(data: unknown): YouTubeStream;

  /**
   * Convert YouTube channels API response to YouTubeUser
   * API Endpoint: GET youtube/v3/channels
   * API Response: docs/research/API-RESEARCH.md lines 1086-1165
   *
   * @param data - Raw API response
   * @returns YouTubeUser
   * @throws Error if response is invalid
   */
  static convertUser(data: unknown): YouTubeUser;

  private static parseDate(isoString: string | undefined | null): Date | null;
  private static parseNumber(numberString: string | undefined | null): number;
}
```

**Stream conversion mapping:**

| API Field (lines 995-1050) | YouTubeStream Field | Default |
|---------------------------|---------------------|---------|
| `id` | `videoId` | N/A (required) |
| `snippet.channelTitle` | `channelTitle` | N/A (required) |
| `snippet.title` | `title` | N/A (required) |
| `snippet.categoryId` | `categoryId` | `'0'` if missing |
| `snippet.tags` | `tags` | `[]` if missing |
| `status.privacyStatus` | `privacyStatus` | `'public'` if missing |
| `snippet.thumbnails.default.url` | `thumbnailUrl` | `null` if missing |
| N/A | `subscriberCount` | `0` (separate channel fetch later) |
| N/A | `superChatTotal` | `0` (separate analytics later) |

**Sample API response structure (lines 995-1050):**
```json
{
  "kind": "youtube#videoListResponse",
  "etag": "...",
  "items": [{
    "kind": "youtube#video",
    "etag": "...",
    "id": "video-id",
    "snippet": {
      "publishedAt": "2024-01-15T10:00:00Z",
      "channelId": "channel-id",
      "title": "Stream Title",
      "description": "Stream description",
      "thumbnails": {
        "default": {
          "url": "https://.../default.jpg",
          "width": 120,
          "height": 90
        }
      },
      "channelTitle": "Channel Name",
      "categoryId": "20",
      "liveBroadcastContent": "live",
      "tags": ["gaming", "fortnite"]
    },
    "status": {
      "privacyStatus": "public",
      "publicStatsViewable": true
    },
    "statistics": {
      "viewCount": "10000",
      "likeCount": "500"
    }
  }]
}
```

**User conversion mapping:**

| API Field (lines 1086-1165) | YouTubeUser Field | Default |
|---------------------------|-------------------|---------|
| `id` | `channelId` | N/A (required) |
| `snippet.title` | `channelTitle` | N/A (required) |
| `snippet.customUrl` | `customUrl` | `null` if missing |
| `snippet.thumbnails.default.url` | `thumbnailUrl` | `null` if missing |
| `snippet.description` | `description` | `null` if missing |
| `statistics.subscriberCount` | `subscriberCount` | Parse from string, `0` if invalid |
| `statistics.videoCount` | `videoCount` | Parse from string, `0` if invalid |
| `statistics.viewCount` | `viewCount` | Parse from string, `0` if invalid |
| `snippet.publishedAt` | `createdAt` | Parse ISO8601, `null` if invalid |

**Sample API response (lines 1086-1165):**
```json
{
  "kind": "youtube#channelListResponse",
  "etag": "...",
  "items": [{
    "kind": "youtube#channel",
    "etag": "...",
    "id": "channel-id",
    "snippet": {
      "title": "Channel Name",
      "description": "Channel description",
      "customUrl": "@handle",
      "publishedAt": "2020-01-15T10:30:00Z",
      "thumbnails": {
        "default": {
          "url": "https://.../default.jpg"
        }
      }
    },
    "statistics": {
      "viewCount": "1000000",
      "subscriberCount": "100000",
      "hiddenSubscriberCount": false,
      "videoCount": "500"
    }
  }]
}
```

---

### Task 4.4: Write Unit Tests (2-3 hours)

Create test files for all three converters with 95%+ coverage target.

**Test files:**
- `shared/models/__tests__/converters/TwitchConverter.test.ts`
- `shared/models/__tests__/converters/KickConverter.test.ts`
- `shared/models/__tests__/converters/YouTubeConverter.test.ts`

**Test scenarios for each converter:**

1. **Happy path:** Standard API response with all fields
2. **Missing optional fields:** Null/undefined fallbacks
3. **Empty arrays vs null:** Tags arrays handling
4. **ISO8601 date parsing:** Valid, invalid, missing
5. **Number parsing (YouTube only):** Valid numbers, invalid strings, missing
6. **Empty categoryId/categorySlug:** Empty string handling
7. **Invalid input:** Malformed response (should throw error)
8. **Type safety:** Verify output matches type definitions

**Use actual API response samples** from docs/research/API-RESEARCH.md for realistic mock data.

**Coverage targets:**
- Line coverage: 95%+
- Branch coverage: 90%+
- Function coverage: 100%

---

### Task 4.5: Create Barrel Exports (10 minutes)

Create `shared/models/src/converters/index.ts`:

```typescript
export { TwitchConverter } from './TwitchConverter';
export { KickConverter } from './KickConverter';
export { YouTubeConverter } from './YouTubeConverter';
```

Update `shared/models/src/index.ts`:

```typescript
export * from './Platform';
export * from './Stream';
export * from './User';
export * from './StreamStats';
export * from './converters';
```

---

### Task 4.6: Run Build and Tests (10 minutes)

```bash
cd shared/models
pnpm build
pnpm test
```

**Expected results:**
- `pnpm build` generates type declarations for all converters
- `pnpm test` passes all tests with 95%+ coverage
- No TypeScript errors

---

## File-by-File Breakdown

| File | Lines (approx) | Description |
|------|----------------|-------------|
| `converters/TwitchConverter.ts` | 100-120 | Stream + User converters with helpers |
| `converters/KickConverter.ts` | 80-100 | Stream + User converters with helpers |
| `converters/YouTubeConverter.ts` | 120-150 | Stream + User converters with number/date parsers |
| `converters/index.ts` | 3 | Barrel export |
| `src/index.ts` | 1 | Add converters export |
| `__tests__/converters/TwitchConverter.test.ts` | 150-180 | API mock data + conversion tests |
| `__tests__/converters/KickConverter.test.ts` | 120-150 | API mock data + conversion tests |
| `__tests__/converters/YouTubeConverter.test.ts` | 180-210 | API mock data + conversion tests |
| **Total** | **754-924 lines** | |

---

## Code Examples

### Example: shared/models/src/converters/TwitchConverter.ts

```typescript
import type { TwitchStream } from '../Stream';
import type { TwitchUser } from '../User';

/**
 * Twitch API response types (simplified for type safety)
 * Full response structure: docs/research/API-RESEARCH.md lines 52-100, 227-260
 */

interface TwitchStreamApiResponse {
  data?: Array<{
    id: string;
    user_login: string;
    title: string;
    game_id: string;
    tags?: string[];
    is_mature?: boolean;
    language: string;
    thumbnail_url?: string;
  }>;
}

interface TwitchUserApiResponse {
  data?: Array<{
    id: string;
    login: string;
    display_name: string;
    profile_image_url?: string;
    description: string;
    created_at: string;
  }>;
}

export class TwitchConverter {
  static convertStream(data: unknown): TwitchStream {
    const stream = (data as TwitchStreamApiResponse)?.data?.[0];

    if (!stream) {
      throw new Error('Invalid Twitch stream API response: missing data field');
    }

    if (!stream.id) {
      throw new Error('Invalid Twitch stream API response: missing stream id');
    }

    if (!stream.user_login) {
      throw new Error('Invalid Twitch stream API response: missing user_login');
    }

    if (!stream.title) {
      throw new Error('Invalid Twitch stream API response: missing title');
    }

    if (!stream.language) {
      throw new Error('Invalid Twitch stream API response: missing language');
    }

    return {
      platform: 'twitch',
      twitchId: stream.id,
      username: stream.user_login,
      title: stream.title,
      categoryId: stream.game_id || '',
      tags: stream.tags || [],
      isMature: stream.is_mature ?? false,
      language: stream.language,
      thumbnailUrl: stream.thumbnail_url || null,
      channelPoints: 0
    };
  }

  static convertUser(data: unknown): TwitchUser {
    const user = (data as TwitchUserApiResponse)?.data?.[0];

    if (!user) {
      throw new Error('Invalid Twitch user API response: missing data field');
    }

    if (!user.id) {
      throw new Error('Invalid Twitch user API response: missing user id');
    }

    if (!user.login) {
      throw new Error('Invalid Twitch user API response: missing login');
    }

    if (!user.display_name) {
      throw new Error('Invalid Twitch user API response: missing display_name');
    }

    return {
      platform: 'twitch',
      twitchId: user.id,
      username: user.login,
      displayName: user.display_name,
      profileImageUrl: user.profile_image_url || null,
      bio: user.description || null,
      createdAt: this.parseDate(user.created_at)
    };
  }

  private static parseDate(isoString: string | undefined | null): Date | null {
    if (!isoString) return null;
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) return null;
      return date;
    } catch {
      return null;
    }
  }
}
```

### Example: shared/models/__tests__/converters/TwitchConverter.test.ts

```typescript
import { describe, it, expect } from 'vitest';
import { TwitchConverter } from '../../src/converters/TwitchConverter';

describe('TwitchConverter', () => {
  describe('convertStream', () => {
    it('converts valid stream API response', () => {
      const apiResponse = {
        data: [{
          id: '1234567890',
          user_login: 'ninja',
          user_name: 'Ninja',
          game_id: '493057',
          game_name: 'Fortnite',
          type: 'live',
          title: 'SOLO Q TO CONQUER! !prime',
          viewer_count: 14250,
          started_at: '2021-03-10T15:04:21Z',
          language: 'en',
          thumbnail_url: 'https://static-cdn.jtvnw.net/previews-ttv/live_user_ninja-{width}x{height}.jpg',
          tag_ids: ['6ea6bca4-b471-4ab6-a371-4360a4c7dd11'],
          tags: ['English', 'Fortnite'],
          is_mature: false
        }]
      };

      const stream = TwitchConverter.convertStream(apiResponse);

      expect(stream.platform).toBe('twitch');
      expect(stream.twitchId).toBe('1234567890');
      expect(stream.username).toBe('ninja');
      expect(stream.title).toBe('SOLO Q TO CONQUER! !prime');
      expect(stream.categoryId).toBe('493057');
      expect(stream.tags).toEqual(['English', 'Fortnite']);
      expect(stream.isMature).toBe(false);
      expect(stream.language).toBe('en');
      expect(stream.thumbnailUrl).toBe('https://static-cdn.jtvnw.net/previews-ttv/live_user_ninja-{width}x{height}.jpg');
      expect(stream.channelPoints).toBe(0);
    });

    it('handles missing optional fields', () => {
      const apiResponse = {
        data: [{
          id: '1234567890',
          user_login: 'test_streamer',
          title: 'Stream title',
          game_id: '',
          language: 'en'
        }]
      };

      const stream = TwitchConverter.convertStream(apiResponse);

      expect(stream.tags).toEqual([]);
      expect(stream.isMature).toBe(false);
      expect(stream.thumbnailUrl).toBeNull();
    });

    it('handles empty categoryId', () => {
      const apiResponse = {
        data: [{
          id: '1234567890',
          user_login: 'test',
          title: 'Test stream',
          game_id: '',
          language: 'en'
        }]
      };

      const stream = TwitchConverter.convertStream(apiResponse);

      expect(stream.categoryId).toBe('');
    });

    it('throws error for invalid response', () => {
      expect(() => TwitchConverter.convertStream({})).toThrow('Invalid Twitch stream API response');
      expect(() => TwitchConverter.convertStream({ data: [] })).toThrow('Invalid Twitch stream API response');
    });

    it('throws error for missing required fields', () => {
      expect(() => {
        TwitchConverter.convertStream({ data: [{ user_login: 'test', title: 'x', language: 'en' }] });
      }).toThrow('Missing stream id');
    });
  });

  describe('convertUser', () => {
    it('converts valid user API response', () => {
      const apiResponse = {
        data: [{
          id: '123456',
          login: 'ninja',
          display_name: 'Ninja',
          type: '',
          broadcaster_type: 'partner',
          description: 'Professional gamer, streamer, and entertainer.',
          profile_image_url: 'https://static-cdn.jtvnw.net/jtv_user_pictures/ninja-profile_image-0d31d9d4a2a3f03e-300x300.png',
          offline_image_url: 'https://static-cdn.jtvnw.net/jtv_user_pictures/ninja-channel_offline_image-0d31d9d4a2a3f03e-1920x1080.png',
          view_count: 2345678,
          email: 'ninja@example.com',
          created_at: '2016-01-01T00:00:00Z'
        }]
      };

      const user = TwitchConverter.convertUser(apiResponse);

      expect(user.platform).toBe('twitch');
      expect(user.twitchId).toBe('123456');
      expect(user.username).toBe('ninja');
      expect(user.displayName).toBe('Ninja');
      expect(user.profileImageUrl).toBe('https://static-cdn.jtvnw.net/jtv_user_pictures/ninja-profile_image-0d31d9d4a2a3f03e-300x300.png');
      expect(user.bio).toBe('Professional gamer, streamer, and entertainer.');
      expect(user.createdAt).toEqual(new Date('2016-01-01T00:00:00Z'));
    });

    it('handles missing optional fields', () => {
      const apiResponse = {
        data: [{
          id: '123456',
          login: 'test',
          display_name: 'Test User',
          description: '',
          created_at: '2020-01-15T10:30:00Z'
        }]
      };

      const user = TwitchConverter.convertUser(apiResponse);

      expect(user.profileImageUrl).toBeNull();
      expect(user.bio).toBeNull();
    });

    it('handles invalid date', () => {
      const apiResponse = {
        data: [{
          id: '123456',
          login: 'test',
          display_name: 'Test User',
          description: '',
          created_at: 'invalid-date'
        }]
      };

      const user = TwitchConverter.convertUser(apiResponse);

      expect(user.createdAt).toBeNull();
    });

    it('throws error for invalid response', () => {
      expect(() => TwitchConverter.convertUser({})).toThrow('Invalid Twitch user API response');
    });
  });
});
```

---

## Design Decisions

### Decision 1: Error Handling Strategy

**Approach:** Throw errors with descriptive messages for invalid API responses

**Rationale:**
- Invalid API responses indicate a bug or API change
- Fail-fast surface errors early in the pipeline
- Error messages help debug API format issues
- Alternative (lenient parsing) could create silent data corruption

**Error messages include:**
- What field is missing
- What part of API response is invalid
- Platform identifier (Twitch/Kick/YouTube)

### Decision 2: TypeScript API Response Types

**Approach:** Define simplified inline interfaces for type safety, but validate at runtime

**Rationale:**
- Better than `unknown` - provides type safety and IDE autocomplete
- Simplified interfaces reduce maintenance overhead
- Full API response interfaces are verbose and change frequently
- Runtime validation ensures data integrity even with type coercion

**Pattern:**
```typescript
interface TwitchStreamApiResponse {
  data?: Array<{
    id: string;
    user_login: string;
    // ... only fields we actually use
  }>;
}
```

### Decision 3: Default Values for Optional Fields

**Approach:** Use sensible defaults based on field semantics

| Field Type | Default | Examples |
|-----------|---------|----------|
| Empty string fields | `''` | `categoryId`, `categorySlug` |
| Array fields | `[]` | `tags` |
| Boolean flags | `false` | `isMature`, `isVerified` |
| Number counters | `0` | `channelPoints`, `totalTipsUsd`, `subscriberCount` |
| Optional URLs | `null` | `thumbnailUrl`, `avatarUrl`, `profileImageUrl` |
| Optional text | `null` | `bio`, `description` |
| Timestamps | `null` | `createdAt` (on parse failure) |

### Decision 4: Date Parsing

**Approach:** Try-catch pattern with null fallback

```typescript
private static parseDate(isoString: string | undefined | null): Date | null {
  if (!isoString) return null;
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return null;
    return date;
  } catch {
    return null;
  }
}
```

**Rationale:**
- Gracefully handles invalid ISO8601 strings
- `NaN.getTime()` check catches edge cases
- Null indicates "no valid date available" vs "unknown"

### Decision 5: YouTube Number Parsing

**Approach:** parseInt with default to 0

```typescript
private static parseNumber(numberString: string | undefined | null): number {
  if (!numberString) return 0;
  const parsed = parseInt(numberString, 10);
  return isNaN(parsed) ? 0 : parsed;
}
```

**Rationale:**
- YouTube API returns numbers as strings
- Invalid strings default to 0 (not NaN)
- Consistent with JavaScript convention

---

## Edge Cases to Handle

### 1. Missing Wrapper Object
- Twitch: `data` array missing
- YouTube: `items` array missing
- **Action:** Throw error with descriptive message

### 2. Empty Response Array
- `data: []` or `items: []`
- **Action:** Throw error (no stream/user data to convert)

### 3. Nested Required Fields Missing
- YouTube nested fields: `snippet.title`, `statistics.subscriberCount`
- **Action:** Validate before access, throw if missing

### 4. Malformed ISO8601 Dates
- Empty string, invalid format, ancient dates
- **Action:** Return `null` from `parseDate()`

### 5. YouTube Non-Numeric Strings
- `subscriberCount: "NaN"` or `"invalid"`
- **Action:** Default to `0` from `parseNumber()`

### 6. Null vs Undefined vs Empty Array
- `tags: null`, `tags: undefined`, `tags: []`
- **Action:** Treat null/undefined as `[]`

### 7. Thumbnail URL Templates
- Twitch: `...{width}x{height}...` with placeholders
- **Action:** Use as-is (resolution selection happens elsewhere)

---

## Success Criteria

### Code Quality
- [ ] `TwitchConverter.ts` created with convertStream() and convertUser()
- [ ] `KickConverter.ts` created with convertStream() and convertUser()
- [ ] `YouTubeConverter.ts` created with convertStream() and convertUser()
- [ ] All converter functions handle missing fields with sensible defaults
- [ ] Date parsing handles invalid ISO8601 strings (returns null)
- [ ] YouTube number parsing handles invalid values (defaults to 0)
- [ ] All functions have proper JSDoc comments
- [ ] Error messages are descriptive and helpful

### Testing
- [ ] Unit tests with 95%+ coverage for all converters
- [ ] Line coverage: 95%+
- [ ] Branch coverage: 90%+
- [ ] Function coverage: 100%
- [ ] Tests use actual API response samples from API-RESEARCH.md
- [ ] All happy path tests pass
- [ ] All edge case tests pass
- [ ] Error handling tests verify correct error messages

### Build Verification
- [ ] `pnpm build` succeeds with no TypeScript errors
- [ ] Type declarations generated in `shared/models/dist/`
- [ ] `pnpm test` passes all tests
- [ ] Coverage report meets targets

---

## Deliverables

1. **Converter implementations:**
   - `shared/models/src/converters/TwitchConverter.ts`
   - `shared/models/src/converters/KickConverter.ts`
   - `shared/models/src/converters/YouTubeConverter.ts`
   - `shared/models/src/converters/index.ts`

2. **Updated exports:**
   - `shared/models/src/index.ts`

3. **Test coverage:**
   - `shared/models/__tests__/converters/TwitchConverter.test.ts`
   - `shared/models/__tests__/converters/KickConverter.test.ts`
   - `shared/models/__tests__/converters/YouTubeConverter.test.ts`

4. **Build artifacts:**
   - Type declarations in `shared/models/dist/converters/`

---

## API Field Mapping Reference

### Twitch Stream
Source: `docs/research/API-RESEARCH.md` lines 52-100

| API Field | Type | TwitchStream Field | Notes |
|-----------|------|-------------------|-------|
| `id` | string | `twitchId` | Required |
| `user_login` | string | `username` | Required |
| `title` | string | `title` | Required |
| `game_id` | string | `categoryId` | Default: `''` |
| `tags` | string[]? | `tags` | Default: `[]` |
| `is_mature` | boolean? | `isMature` | Default: `false` |
| `language` | string | `language` | Required |
| `thumbnail_url` | string? | `thumbnailUrl` | Default: `null` |

### Twitch User
Source: `docs/research/API-RESEARCH.md` lines 227-260

| API Field | Type | TwitchUser Field | Notes |
|-----------|------|------------------|-------|
| `id` | string | `twitchId` | Required |
| `login` | string | `username` | Required |
| `display_name` | string | `displayName` | Required |
| `profile_image_url` | string? | `profileImageUrl` | Default: `null` |
| `description` | string | `bio` | Default: `null` |
| `created_at` | string | `createdAt` | Parse ISO8601 |

### Kick Stream
Source: `docs/research/API-RESEARCH.md` lines 706-738

| API Field | Type | KickStream Field | Notes |
|-----------|------|-----------------|-------|
| `id` | string | `kickId` | Required |
| `username` / `user_login` | string | `username` | Required |
| `title` | string | `title` | Required |
| `category_slug` | string? | `categorySlug` | Default: `''` |
| `tags` | string[]? | `tags` | Default: `[]` |
| `language` | string? | `language` | Default: `'en'` |
| `thumbnail` | string? | `thumbnailUrl` | Default: `null` |

### Kick User
Source: `docs/research/API-RESEARCH.md` lines 742-764

| API Field | Type | KickUser Field | Notes |
|-----------|------|----------------|-------|
| `id` | string | `kickId` | Required |
| `username` | string | `username` | Required |
| `display_name` | string? | `displayName` | Default: `null` |
| `avatar_url` | string? | `avatarUrl` | Default: `null` |
| `bio` | string? | `bio` | Default: `null` |
| `is_verified` | boolean? | `isVerified` | Default: `false` |
| `created_at` | string | `createdAt` | Parse ISO8601 |

### YouTube Stream
Source: `docs/research/API-RESEARCH.md` lines 995-1050

| API Field | Type | YouTubeStream Field | Notes |
|-----------|------|---------------------|-------|
| `id` | string | `videoId` | Required |
| `snippet.channelTitle` | string | `channelTitle` | Required |
| `snippet.title` | string | `title` | Required |
| `snippet.categoryId` | string? | `categoryId` | Default: `'0'` |
| `snippet.tags` | string[]? | `tags` | Default: `[]` |
| `status.privacyStatus` | string? | `privacyStatus` | Default: `'public'` |
| `snippet.thumbnails.default.url` | string? | `thumbnailUrl` | Default: `null` |

### YouTube User
Source: `docs/research/API-RESEARCH.md` lines 1086-1165

| API Field | Type | YouTubeUser Field | Notes |
|-----------|------|-------------------|-------|
| `id` | string | `channelId` | Required |
| `snippet.title` | string | `channelTitle` | Required |
| `snippet.customUrl` | string? | `customUrl` | Default: `null` |
| `snippet.thumbnails.default.url` | string? | `thumbnailUrl` | Default: `null` |
| `snippet.description` | string? | `description` | Default: `null` |
| `statistics.subscriberCount` | string | `subscriberCount` | Parse from string, default `0` |
| `statistics.videoCount` | string | `videoCount` | Parse from string, default `0` |
| `statistics.viewCount` | string | `viewCount` | Parse from string, default `0` |
| `snippet.publishedAt` | string | `createdAt` | Parse ISO8601 |

---

## Notes

- Converters isolate API format changes from the rest of the codebase
- Use actual API response samples from API-RESEARCH.md for tests
- Error messages should be descriptive for debugging
- Date parsing returns `null` (not NaN or invalid Date) for invalid inputs
- YouTube numbers are strings in API - parse to numbers with `parseInt`
- Channel points, tips, Super Chat set to `0` for now (separate endpoints later)
- Thumbnail URL resolution (width x height) handled outside converters

---

## Next Steps After This Phase

Once Phase 4 is complete:

1. **Phase 5:** Adapter Interfaces
   - StreamAdapter, UserAdapter, ChatMessageAdapter, EventAdapter
   - Define adapter contracts for the translation layer

2. **Phase 6:** Adapter Implementations + Wrapper Types
   - Implement adapters for each platform
   - Create unified Stream wrapper (with `streams: Map<Platform, StreamAdapter>`)
   - Create unified User wrapper (with `platforms: Map<Platform, UserAdapter>`)

3. **Phase 7:** Translator Layer
   - Create adapters from platform types using converters

---

## Status

**Ready for implementation**

**Estimated Effort:** 8-12 hours
**Dependencies:** Phase 2 complete, Phase 3 complete
**Followed by:** Phase 5 - Adapter Interfaces
