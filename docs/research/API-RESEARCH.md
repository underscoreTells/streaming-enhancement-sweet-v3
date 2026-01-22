# Twitch, Kick, and YouTube API Data Structures Research Document

## Executive Summary

This document provides extremely comprehensive research on the data structures returned by Twitch, Kick, and YouTube APIs for designing shared data models.

---

## TABLE OF CONTENTS

1. [Twitch API](#twitch-api)
   - [Stream/Channel Data](#twitch-streamchannel-data)
   - [User/Channel Profile Data](#twitch-userchannel-profile-data)
   - [Chat Message Data](#twitch-chat-message-data)
   - [Event Types](#twitch-event-types)
2. [Kick API](#kick-api)
    - [Stream/Channel Data](#kick-streamchannel-data)
    - [Chat Message Data](#kick-chat-message-data)
    - [Event Types](#kick-event-types)
3. [YouTube API](#youtube-api)
    - [Stream/Channel Data](#youtube-streamchannel-data)
    - [Chat Message Data](#youtube-chat-message-data)
   - [Event Types](#youtube-event-types)
4. [Cross-Platform Comparison](#cross-platform-comparison)
   - [Unified Field Matrix](#unified-field-matrix)
   - [Data Normalization Strategy](#data-normalization-strategy)
   - [Missing Fields Analysis](#missing-fields-analysis)

---

# TWITCH API

## Twitch Stream/Channel Data

### GET /helix/streams - Get Stream Information

**Endpoint:** `GET https://api.twitch.tv/helix/streams`

**Query Parameters:**
- `user_id` (string, optional) - Stream by user ID
- `user_login` (string, optional) - Stream by user login
- `game_id` (string, optional) - Stream by game ID
- `type` (string, optional) - Stream type: "live", "all"
- `language` (string, optional) - Stream language code
- `first` (integer, optional) - Number of streams (1-100, default: 20)
- `before` (string, optional) - Cursor for pagination
- `after` (string, optional) - Cursor for pagination

**Response Fields:**

| API Field Name | Normalized Name | Type | Required | Description | Platform-Specific Notes |
|----------------|-----------------|------|----------|-------------|------------------------|
| id | streamId | string | Required | Stream ID | Unique identifier |
| user_id | userId | string | Required | User ID of broadcaster | References Twitch user |
| user_login | userLogin | string | Required | Login name of broadcaster | Lowercase |
| user_name | userName | string | Required | Display name of broadcaster | May differ from login |
| game_id | gameId | string | Optional | Game/category ID | Can be empty |
| game_name | gameName | string | Optional | Game/category name | Can be empty |
| type | streamType | string | Required | Stream type: "live", etc. | "live" for active streams |
| title | title | string | Required | Stream title | UTF-8 encoded |
| viewer_count | viewerCount | number | Required | Current viewer count | Updated periodically |
| started_at | startedAt | string (ISO8601) | Required | Stream start timestamp | RFC3339 format |
| language | language | string | Required | Stream language code | ISO 639-1 (e.g., "en") |
| thumbnail_url | thumbnailUrl | string (template) | Required | Stream thumbnail URL | Template: "{width}x{height}"; Replace with integer values |
| tag_ids | tagIds | array<string> | Optional | Stream tag IDs | Array of tag IDs |
| tags | tags | array<string> | Optional | Stream tag names | Array of localized tag names |
| is_mature | isMature | boolean | Optional | Mature content flag | Not always present |

**Nested Structures:**
- None (stream data is flat)

**Sample Response:**
```json
{
  "data": [
    {
      "id": "1234567890",
      "user_id": "123456",
      "user_login": "ninja",
      "user_name": "Ninja",
      "game_id": "493057",
      "game_name": "Fortnite",
      "type": "live",
      "title": "🔴 SOLO Q TO CONQUER! !prime",
      "viewer_count": 14250,
      "started_at": "2021-03-10T15:04:21Z",
      "language": "en",
      "thumbnail_url": "https://static-cdn.jtvnw.net/previews-ttv/live_user_ninja-{width}x{height}.jpg",
      "tag_ids": ["6ea6bca4-b471-4ab6-a371-4360a4c7dd11"],
      "tags": ["English", "Fortnite"],
      "is_mature": false
    }
  ],
  "pagination": {
    "cursor": "eyJiIjpudWxsLCJhIjp7Ik9mZnNldCI6MX19"
  }
}
```

---

### GET /helix/channels - Get Channel Information

**Endpoint:** `GET https://api.twitch.tv/helix/channels`

**Query Parameters:**
- `broadcaster_id` (string, optional) - Channel by broadcaster ID

**Response Fields:**

| API Field Name | Normalized Name | Type | Required | Description | Platform-Specific Notes |
|----------------|-----------------|------|----------|-------------|------------------------|
| broadcaster_id | broadcasterId | string | Required | Channel ID | Same as user ID |
| broadcaster_login | broadcasterLogin | string | Required | Login name | Lowercase |
| broadcaster_name | broadcasterName | string | Required | Display name | May differ from login |
| game_id | gameId | string | Optional | Game/category ID | Empty if offline |
| game_name | gameName | string | Optional | Game/category name | Empty if offline |
| title | title | string | Required | Channel title | Updated by broadcaster |
| delay | streamDelay | integer | Required | Stream delay in seconds | 0-900 (15 minutes) |

**Sample Response:**
```json
{
  "data": [
    {
      "broadcaster_id": "123456",
      "broadcaster_login": "ninja",
      "broadcaster_name": "Ninja",
      "game_id": "493057",
      "game_name": "Fortnite",
      "title": "🔴 SOLO Q TO CONQUER! !prime",
      "delay": 0
    }
  ]
}
```

---

### GET /helix/channels/teams - Get Channel Teams

**Endpoint:** `GET https://api.twitch.tv/helix/teams`

**Query Parameters:**
- `broadcaster_id` (string, required) - Channel ID

**Response Fields:**

| API Field Name | Normalized Name | Type | Required | Description | Platform-Specific Notes |
|----------------|-----------------|------|----------|-------------|------------------------|
| users | teamMembers | array<object> | Required | Team members | List of channels on team |
| ... (team object fields) | - | - | - | - | See team structure below |

**Team Object Fields:**

| API Field Name | Normalized Name | Type | Required | Description |
|----------------|-----------------|------|----------|-------------|
| id | teamId | string | Required | Team ID |
| background_image_url | backgroundImageUrl | string | Optional | Team background image |
| banner | bannerUrl | string | Optional | Team banner URL |
| created_at | createdAt | string (ISO8601) | Required | Team creation date |
| updated_at | updatedAt | string (ISO8601) | Required | Team last update date |
| info | info | string | Optional | Team description |
| thumbnail_url | thumbnailUrl | string | Optional | Team thumbnail URL |
| team_name | teamName | string | Required | Team name |
| team_display_name | teamDisplayName | string | Required | Team display name |

**Team Member Object Fields:**

| API Field Name | Normalized Name | Type | Required | Description |
|----------------|-----------------|------|----------|-------------|
| user_id | userId | string | Required | Team member user ID |
| user_login | userLogin | string | Required | Team member login |
| user_name | userName | string | Required | Team member display name |
| background_color | backgroundColor | string | Optional | Color for team display |

---

### GET /helix/games/categories - Get Games/Categories

**Endpoint:** `GET https://api.twitch.tv/helix/games`

**Query Parameters:**
- `id` (string, optional) - Game ID(s), comma-separated
- `name` (string, optional) - Game name(s), comma-separated
- `igdb_id` (string, optional) - IGDB game ID(s), comma-separated

**Response Fields:**

| API Field Name | Normalized Name | Type | Required | Description | Platform-Specific Notes |
|----------------|-----------------|------|----------|-------------|------------------------|
| id | gameId | string | Required | Game ID | Unique identifier |
| name | name | string | Required | Game name | English |
| box_art_url | boxArtUrl | string (template) | Required | Game box art URL | Template: "{width}x{height}" |
| igdb_id | igdbId | string | Optional | IGDB database ID | May not always exist |

**Sample Response:**
```json
{
  "data": [
    {
      "id": "493057",
      "name": "Fortnite",
      "box_art_url": "https://static-cdn.jtvnw.net/ttv-boxart/493057-{width}x{height}.jpg",
      "igdb_id": "814"
    }
  ]
}
```

---

## Twitch User/Channel Profile Data

### GET /helix/users - Get Users

**Endpoint:** `GET https://api.twitch.tv/helix/users`

**Query Parameters:**
- `id` (string, optional) - User ID(s), comma-separated
- `login` (string, optional) - Login name(s), comma-separated

**Response Fields:**

| API Field Name | Normalized Name | Type | Required | Description | Platform-Specific Notes |
|----------------|-----------------|------|----------|-------------|------------------------|
| id | userId | string | Required | User ID | Unique identifier |
| login | login | string | Required | Login name | Lowercase handle |
| display_name | displayName | string | Required | Display name | May include spaces/uppercase |
| type | accountType | string | Required | Account type | "staff", "admin", "global_mod", or "" |
| broadcaster_type | broadcasterType | string | Optional | Broadcaster status | "partner", "affiliate", or "" |
| description | description | string | Required | Profile bio/bio | UTF-8 encoded |
| profile_image_url | profileImageUrl | string | Optional | Profile image URL | 300x300 PNG |
| offline_image_url | offlineImageUrl | string | Optional | Offline banner URL | 1920x1080 PNG |
| view_count | totalViewCount | number | Required | Total lifetime views | Accumulated view count |
| email | email | string | Optional | Email address | Only with user token |
| created_at | createdAt | string (ISO8601) | Required | Account creation date | RFC3339 format |

**Sample Response:**
```json
{
  "data": [
    {
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
    }
  ]
}
```

---

## Twitch Chat Message Data

### IRC PRIVMSG Tags

IRC messages are received from `wss://irc-ws.chat.twitch.tv:443`

**Tags Format:** `@tag1=value1;tag2=value2;...`

**PRIVMSG Tags (Chat Messages):**

| Tag Name | Normalized Name | Type | Description | Format/Notes |
|----------|-----------------|------|-------------|--------------|
| badge-info | badgeInfo | string | Metadata for badges | Format: "subscriber/24" (months subbed) |
| badges | badges | array<Badge> | User badges | Format: "broadcaster/1,subscriber/12" |
| bits | bits | number | Amount of bits cheered | Only in bit cheer messages |
| client-nonce | clientNonce | string | Unique client identifier | For duplicate message detection |
| color | color | string | Username color | Hex format: "#RRGGBB" |
| display-name | displayName | string | User display name | May be empty |
| emotes | emotes | array<Emote> | Emotes in message | Format: "emoteId:start-end,start-end/..." |
| first-msg | firstMsg | boolean | First message flag | "1" if first chat message |
| flags | flags | number | Message flags | Bitmask for special states |
| id | messageId | string | Unique message ID | UUID format |
| mod | isModerator | boolean | Moderator flag | "1" if moderator |
| reply-parent-msg-id | replyParentMessageId | string | Reply parent message ID | UUID |
| reply-parent-user-id | replyParentUserId | string | Reply parent user ID | User ID |
| reply-parent-user-login | replyParentUserLogin | string | Reply parent login | Username |
| reply-parent-display-name | replyParentDisplayName | string | Reply parent display name | Display name |
| reply-parent-msg-body | replyParentMessageBody | string | Reply parent text | Actual message content |
| reply-thread-parent-msg-id | replyThreadParentMessageId | string | Reply thread root ID | UUID |
| reply-thread-parent-user-login | replyThreadParentUserLogin | string | Reply thread root login | Username |
| room-id | roomId | string | Channel ID | Channel the message is in |
| subscriber | isSubscriber | boolean | Subscriber flag | "1" if subscriber |
| tmi-sent-ts | timestamp | string (UNIX ms) | Message timestamp | Millisecond timestamp |
| turbo | isTurbo | boolean | Turbo user flag | "1" if turbo user |
| user-id | userId | string | User ID | Sender's user ID |
| user-type | userType | string | User type | "admin", "global_mod", "staff", or "" |
| vip | isVip | boolean | VIP flag | Present if user is VIP |

**Badge Format:** `<badge_name>/<version>` (e.g., "subscriber/24")

Available Badge Types:
- `admin` - Twitch admin
- `bits` - Cheer/bits badge
- `broadcaster` - Channel broadcaster
- `moderator` - Channel moderator
- `subscriber` - Channel subscriber (version = months)
- `staff` - Twitch staff
- `turbo` - Turbo user
- `vip` - Channel VIP

**Emote Format:** `<emote_id>:<start>-<end>,<start>-<end>/...`

Example: `25:0-4,12-16/1902:6-10`
- Emote ID 25 appears at positions 0-4 and 12-16
- Emote ID 1902 appears at position 6-10

**Full IRC Message Format:**
```
@badge-info=;badges=broadcaster/1;color=#0000FF;display-name=Ninja;emotes=25:0-4;id=abc123;mod=0;room-id=123456;subscriber=0;tmi-sent-ts=1642696567751;turbo=0;user-id=123456;user-type= :ninja!ninja@ninja.tmi.twitch.tv PRIVMSG #channel :Kappa Keepo Kappa
```

**Parsed Components:**
- Source: `ninja!ninja@ninja.tmi.twitch.tv` → User: `ninja`
- Command: `PRIVMSG`
- Channel: `#channel`
- Message: `Kappa Keepo Kappa`
- Tags: Key-value pairs prefix

**Chat Message Object Structure:**
```typescript
interface TwitchChatMessage {
  id: string;                          // UUID from 'id' tag
  userId: string;                      // From 'user-id' tag
  username: string;                    // Parsed from source (e.g., "ninja")
  displayName: string | null;          // From 'display-name' tag
  channel: string;                     // Channel name (e.g., "#channel")
  channelId: string;                   // From 'room-id' tag
  message: string;                     // Message text
  timestamp: string;                   // From 'tmi-sent-ts' tag (milliseconds)
  color: string | null;                // From 'color' tag (hex format)
  badges: Array<{                      // Parsed from 'badges' tag
    name: string;
    version: string;
  }>;
  emotes: Array<{                      // Parsed from 'emotes' tag
    id: string;
    positions: Array<{
      start: number;
      end: number;
    }>;
  }>;
  flags: {
    isModerator: boolean;              // From 'mod' tag
    isSubscriber: boolean;             // From 'subscriber' tag
    isTurbo: boolean;                  // From 'turbo' tag
    isVip: boolean;                    // From 'vip' if present
    isFirstMessage: boolean;           // From 'first-msg' tag
  };
  userType: string;                    // From 'user-type' tag
  bits?: number;                       // From 'bits' tag if present
  replyParent?: {                      // Reply information if present
    messageId: string;
    userId: string;
    userLogin: string;
    displayName: string;
    messageBody: string;
    threadParentId?: string;
    threadParentLogin?: string;
  };
}
```

---

## Twitch Event Types (EventSub)

EventSub provides webhook-based event notifications. Events are delivered as JSON payloads to a webhook URL.

### channel.follow Event

**Subscription Type:** `channel.follow`

**Payload Structure:**

```typescript
interface TwitchChannelFollowEvent {
  subscription: {
    id: string;           // Subscription ID
    status: string;       // Subscription status (e.g., "enabled")
    type: string;         // Event type: "channel.follow"
    version: string;      // Event version
    condition: {
      broadcaster_user_id: string;    // Channel being followed
      moderator_user_id: string;      // Required for moderation events
    };
    transport: {
      method: string;     // Transport method (e.g., "webhook")
      callback: string;   // Webhook URL
    };
    created_at: string;   // ISO8601 timestamp
    cost: number;         // Subscription cost (tokens)
  };
  event: {
    user_id: string;                  // Follower's user ID
    user_login: string;               // Follower's login name
    user_name: string;                // Follower's display name
    broadcaster_user_id: string;      // Broadcaster's user ID
    broadcaster_user_login: string;   // Broadcaster's login
    broadcaster_user_name: string;    // Broadcaster's display name
    followed_at: string;              // ISO8601 timestamp of follow
  };
}
```

**Fields:**

| Event Field | Normalized Name | Type | Required | Description |
|-------------|-----------------|------|----------|-------------|
| event.user_id | followerId | string | Yes | ID of user who followed |
| event.user_login | followerLogin | string | Yes | Login name of follower |
| event.user_name | followerName | string | Yes | Display name of follower |
| event.broadcaster_user_id | broadcasterId | string | Yes | ID of channel followed |
| event.broadcaster_user_login | broadcasterLogin | string | Yes | Login name of broadcaster |
| event.broadcaster_user_name | broadcasterName | string | Yes | Display name of broadcaster |
| event.followed_at | followedAt | string (ISO8601) | Yes | When the follow occurred |

---

### channel.subscribe and channel.subscription.message Events

**Subscription Type:** `channel.subscribe` and `channel.subscription.message`

**Payload Structure:**

```typescript
interface TwitchSubscribeEvent {
  subscription: { /* same as above */ };
  event: {
    user_id: string;                  // Subscriber's user ID
    user_login: string;               // Subscriber's login
    user_name: string;                // Subscriber's display name
    broadcaster_user_id: string;      // Broadcaster's user ID
    broadcaster_user_login: string;   // Broadcaster's login
    broadcaster_user_name: string;    // Broadcaster's display name
    tier: string;                     // Subscription tier: "1000", "2000", or "3000"
    is_gift: boolean;                 // Whether subscription was gifted
  };
}

interface TwitchSubscriptionMessageEvent extends TwitchSubscribeEvent {
  event: TwitchSubscribeEvent['event'] & {
    message: {
      text: string;                   // Resubscription message from user
      emotes: Array<{
        id: string;
        begin: number;
        end: number;
      }>;
    };
    cumulative_months: number;        // Total months subscribed
    streak_months: number | null;     // Current streak months (null if not applicable)
  };
}
```

**Fields:**

| Event Field | Normalized Name | Type | Required | Description |
|-------------|-----------------|------|----------|-------------|
| event.tier | tier | string | Yes | "1000" (Tier 1), "2000" (Tier 2), "3000" (Tier 3) |
| event.is_gift | isGift | boolean | Yes | True if this was a gift |
| event.cumulative_months | cumulativeMonths | number | Subscription Message only | Total months subbed |
| event.streak_months | streakMonths | number\|null | Subscription Message only | Consecutive months current streak |
| event.message.text | message | string | Subscription Message only | User's resub message |
| event.message.emotes | messageEmotes | array | Subscription Message only | Emotes in the message |

---

### channel.cheer Event

**Subscription Type:** `channel.cheer`

**Payload Structure:**

```typescript
interface TwitchCheerEvent {
  subscription: { /* same as above */ };
  event: {
    user_id: string;                  // Cheerer's user ID
    user_login: string;               // Cheerer's login
    user_name: string;                // Cheerer's display name
    broadcaster_user_id: string;      // Broadcaster's user ID
    broadcaster_user_login: string;   // Broadcaster's login
    broadcaster_user_name: string;    // Broadcaster's display name
    message: string;                  // Cheer message (may be empty)
    bits: number;                     // Number of bits cheered
    is_anonymous: boolean;            // Whether cheer is anonymous
  };
}
```

**Fields:**

| Event Field | Normalized Name | Type | Required | Description |
|-------------|-----------------|------|----------|-------------|
| event.bits | bits | number | Yes | Number of bits cheered |
| event.message | message | string | Yes | Chat message sent with bits |
| event.is_anonymous | isAnonymous | boolean | Yes | Whether cheer was anonymous |

---

### channel.raid Event

**Subscription Type:** `channel.raid`

**Payload Structure:**

```typescript
interface TwitchRaidEvent {
  subscription: { /* same as above */ };
  event: {
    from_broadcaster_user_id: string;  // Raider's user ID
    from_broadcaster_user_login: string; // Raider's login
    from_broadcaster_user_name: string;  // Raider's display name
    to_broadcaster_user_id: string;    // Raid target's user ID
    to_broadcaster_user_login: string; // Raid target's login
    to_broadcaster_user_name: string;  // Raid target's display name
    viewers: number;                   // Number of viewers in raid
  };
}
```

**Fields:**

| Event Field | Normalized Name | Type | Required | Description |
|-------------|-----------------|------|----------|-------------|
| event.from_broadcaster_user_id | raiderId | string | Yes | ID of raiding channel |
| event.from_broadcaster_user_login | raiderLogin | string | Yes | Login of raiding channel |
| event.from_broadcaster_user_name | raiderName | string | Yes | Display name of raiding channel |
| event.to_broadcaster_user_id | targetId | string | Yes | ID of raided channel |
| event.to_broadcaster_user_login | targetLogin | string | Yes | Login of raided channel |
| event.to_broadcaster_user_name | targetName | string | Yes | Display name of raided channel |
| event.viewers | viewerCount | number | Yes | Number of viewers in raid |

---

### channel.subscription.gift Event

**Subscription Type:** `channel.subscription.gift`

**Payload Structure:**

```typescript
interface TwitchSubscriptionGiftEvent {
  subscription: { /* same as above */ };
  event: {
    user_id: string;                  // Gifter's user ID
    user_login: string;               // Gifter's login
    user_name: string;                // Gifter's display name
    broadcaster_user_id: string;      // Broadcaster's user ID
    broadcaster_user_login: string;   // Broadcaster's login
    broadcaster_user_name: string;    // Broadcaster's display name
    total: number;                    // Number of gifts in this event
    tier: string;                     // Subscription tier: "1000", "2000", or "3000"
    cumulative_total: number | null;  // Total gifts ever by this user (null if unknown)
    is_anonymous: boolean;            // Whether gift is anonymous
  };
}
```

**Fields:**

| Event Field | Normalized Name | Type | Required | Description |
|-------------|-----------------|------|----------|-------------|
| event.total | giftCount | number | Yes | Number of subscription gifts in this event |
| event.tier | tier | string | Yes | Subscription tier gifted |
| event.cumulative_total | totalGiftsEver | number\|null | Optional | Total lifetime gifts by this user |
| event.is_anonymous | isAnonymous | boolean | Yes | Whether gift was anonymous |

---

### channel.channel_points_custom_reward_redemption.add Event

**Subscription Type:** `channel.channel_points_custom_reward_redemption.add`

**Payload Structure:**

```typescript
interface TwitchChannelPointsRedemptionEvent {
  subscription: { /* same as above */ };
  event: {
    id: string;                              // Redemption ID
    user_id: string;                         // Redeemer's user ID
    user_login: string;                      // Redeemer's login
    user_name: string;                       // Redeemer's display name
    user_input: string;                      // User input text (may be empty)
    status: string;                          // Redemption status: "unfulfilled", "fulfilled", "canceled"
    redeemed_at: string;                     // ISO8601 timestamp when redeemed
    reward: {
      id: string;                            // Reward ID
      title: string;                         // Reward title
      prompt: string;                        // Reward prompt
      cost: number;                          // Reward cost in points
      is_user_input_required: boolean;       // Whether user input is required
    };
    broadcaster_user_id: string;             // Broadcaster's user ID
    broadcaster_user_login: string;          // Broadcaster's login
    broadcaster_user_name: string;           // Broadcaster's display name
  };
}
```

**Fields:**

| Event Field | Normalized Name | Type | Required | Description |
|-------------|-----------------|------|----------|-------------|
| event.id | redemptionId | string | Yes | Unique redemption ID |
| event.user_input | userInput | string | Yes | Text user entered (empty if not required) |
| event.status | status | string | Yes | "unfulfilled", "fulfilled", or "canceled" |
| event.reward.id | rewardId | string | Yes | ID of the reward |
| event.reward.title | rewardTitle | string | Yes | Title of the reward |
| event.reward.prompt | rewardPrompt | string | Yes | Description/prompt of the reward |
| event.reward.cost | cost | number | Yes | Point cost to redeem |
| event.reward.is_user_input_required | requiresInput | boolean | Yes | Whether user provided input |

---

### Hype Train Events

**Subscription Type:** `channel.hype_train.begin`, `channel.hype_train.progress`, `channel.hype_train.end`

**Payload Structure:**

```typescript
interface TwitchHypeTrainEvent {
  subscription: { /* same as above */ };
  event: {
    id: string;                              // Hype Train event ID
    broadcaster_user_id: string;             // Broadcaster's user ID
    broadcaster_user_login: string;          // Broadcaster's login
    broadcaster_user_name: string;           // Broadcaster's display name
    total: number;                           // Current points toward level up
    progress: number;                        // Points toward current level
    goal: number;                            // Goal points for current level
    started_at: string;                      // ISO8601 timestamp when Hype Train started
    expires_at: string;                      // ISO8601 timestamp when Hype Train expires
    last_contribution: {
      user_id: string;                       // Contributing user's ID
      user_login: string;                    // Contributing user's login
      user_name: string;                     // Contributing user's display name
      type: string;                          // Contribution type: "bits", "subscription"
      total: number;                         // Contribution amount in points
    }; // Present for progress and end events
    level: number;                           // Current hype train level (end event only)
    top_contributions: Array<{               // Top contributors (end event only)
      user_id: string;
      user_login: string;
      user_name: string;
      type: string;
      total: number;
    }>;
    is_golden_kappa_train: boolean;          // Golden Kappa train (end event only)
  };
}
```

**Fields:**

| Event Field | Normalized Name | Type | Required | Description |
|-------------|-----------------|------|----------|-------------|
| event.id | hypeTrainId | string | Yes | Unique Hype Train ID |
| event.total | totalPoints | number | Yes | Total accumulated points |
| event.progress | currentLevelProgress | number | Yes | Points toward current level |
| event.goal | currentLevelGoal | number | Yes | Points needed to complete level |
| event.started_at | startedAt | string (ISO8601) | Yes | When Hype Train started |
| event.expires_at | expiresAt | string (ISO8601) | Yes | When Hype Train expires |
| event.level | level | number | End event only | Current Hype Train level |
| event.is_golden_kappa_train | isGoldenKappa | boolean | End event only | Special golden train |
| event.last_contribution | lastContribution | object | Progress/End | Most recent contribution |
| event.top_contributions | topContributors | array | End event only | Top contributors list |

---

# KICK API

## Note on Kick API

Kick's official API documentation is limited. The following information is based on:
1. Community-maintained libraries (kient, kick-nodejs)
2. Reverse-engineering of public endpoints
3. Official documentation at https://kick.com when available

## Kick Stream/Channel Data

Based on kient (TypeScript Kick client library), the following data structures are available.

**Note:** Kick uses an unofficial API that may change without notice.

### Livestream Data

**Endpoint:** Various (e.g., `/api/v2/channels/{channel}/livestream`)

**Response Fields (Based on Reverse Engineering):**

| API Field Name | Normalized Name | Type | Required | Description | Platform-Specific Notes |
|----------------|-----------------|------|----------|-------------|------------------------|
| id | streamId | string | Required | Stream ID | |
| channel_id | channelId | string | Required | Channel ID | |
| category_id | categoryId | string | Optional | Category/game ID | |
| category_name | categoryName | string | Optional | Category/game name | |
| title | title | string | Required | Stream title | |
| thumbnail | thumbnailUrl | string | Required | Thumbnail URL | |
| is_live | isLive | boolean | Required | Live status | |
| viewer_count | viewerCount | number | Required | Current viewers | |
| created_at | createdAt | string (ISO8601) | Required | Stream start time | |
| language | language | string | Optional | Stream language | ISO 639-1 code |
| tags | tags | array<string> | Optional | Stream tags | |
| playback_url | playbackUrl | string | Optional | Stream playback URL | HLS manifest URL |

**Sample Response (Approximate):**
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

---

### Channel Data

**Endpoint:** `/api/v2/channels/{channel}` or `/api/v1/channels/{channel}`

**Response Fields:**

| API Field Name | Normalized Name | Type | Required | Description | Platform-Specific Notes |
|----------------|-----------------|------|----------|-------------|------------------------|
| id | channelId | string | Required | Channel ID | |
| user_id | userId | string | Required | User ID | |
| username | username | string | Required | Username/handle | |
| display_name | displayName | string | Optional | Display name | |
| bio | bio | string | Optional | Channel description | |
| avatar_url | avatarUrl | string | Optional | Profile image URL | |
| banner_url | bannerUrl | string | Optional | Banner image URL | |
| followers_count | followersCount | number | Optional | Follower count | |
| following_count | followingCount | number | Optional | Following count | |
| subscriber_count | subscriberCount | number | Optional | Subscriber count | |
| is_verified | isVerified | boolean | Optional | Verification badge | |
| is_banned | isBanned | boolean | Required | Ban status | |
| created_at | createdAt | string (ISO8601) | Required | Account creation | |

---

## Kick Chat Message Data

### WebSocket Chat Messages

Kick uses WebSocket for chat. Connect to `wss://ws-us2.kick.com/chatroom/{channel_id}` (region may vary).

**Message Structure (Based on Communities):**

| Field | Normalized Name | Type | Required | Description |
|-------|-----------------|------|----------|-------------|
| id | messageId | string | Required | Message ID |
| sender | sender | object | Required | Sender information |
| sender.id | senderId | string | Required | Sender user ID |
| sender.username | username | string | Required | Sender username |
| sender.displayname | displayName | string | Optional | Sender display name |
| sender.avatar | avatarUrl | string | Optional | Sender avatar URL |
| sender.identity | senderIdentity | object | Optional | Identity flags |
| sender.identity.color | color | string | Optional | Username color (hex) |
| sender.identity.badges | badges | array<string> | Optional | Badge IDs/names |
| sender.identity.subscribed | isSubscriber | boolean | Required | Subscription status |
| sender.is_mod | isModerator | boolean | Optional | Moderator status |
| sender.is_broadcaster | isBroadcaster | boolean | Optional | Broadcaster status |
| content | message | string | Required | Message content |
| type | messageType | string | Required | Message type: "chat", "ban", "update", etc. |
| timestamp | timestamp | string (ISO8601) | Required | Message timestamp |
| emotes | emotes | array<object> | Optional | Emotes in message |
| cards | cards | array<object> | Optional | Rich cards (tips, subs, etc.) |

**Sample Message (Approximate):**
```json
{
  "id": "msg_abc123",
  "type": "chat",
  "content": "Hello streamer!",
  "sender": {
    "id": "12345",
    "username": "viewer123",
    "displayname": "Viewer123",
    "avatar": "https://...",
    "identity": {
      "color": "#FF0000",
      "badges": ["subscriber"],
      "subscribed": true
    },
    "is_mod": false,
    "is_broadcaster": false
  },
  "timestamp": "2024-01-15T10:30:00Z",
  "emotes": []
}
```

---

## Kick Event Types

Based on WebSocket events captured by communities.

### Follow Event

**Message Type:** `"follow"` or similar

**Fields:**

| Field | Normalized Name | Type | Description |
|-------|-----------------|------|-------------|
| id | eventId | string | Event ID |
| follower | follower | object | Follower information |
| follower.id | followerId | string | Follower user ID |
| follower.username | username | string | Follower username |
| follower.displayname | displayName | string | Follower display name |
| timestamp | timestamp | string (ISO8601) | When follow occurred |

---

### Subscribe Event

**Message Type:** `"subscription"`

**Fields:**

| Field | Normalized Name | Type | Description |
|-------|-----------------|------|-------------|
| id | eventId | string | Event ID |
| subscriber | subscriber | object | Subscriber information |
| subscriber.id | subscriberId | string | Subscriber user ID |
| subscriber.username | username | string | Subscriber username |
| subscriber.displayname | displayName | string | Subscriber display name |
| months | cumulativeMonths | number | Total months subscribed |
| timestamp | timestamp | string (ISO8601) | When subscription occurred |

---

### Tip (Cheer) Event

**Message Type:** `"tip"` or `"payment"`

**Fields:**

| Field | Normalized Name | Type | Description |
|-------|-----------------|------|-------------|
| id | eventId | string | Event ID |
| tipper | tipper | object | Tipper information |
| tipper.id | tipperId | string | Tipper user ID |
| tipper.username | username | string | Tipper username |
| tipper.displayname | displayName | string | Tipper display name |
| amount | amount | number | Tip amount |
| currency | currency | string | Currency code (e.g., "USD") |
| message | message | string | Tip message |
| timestamp | timestamp | string (ISO8601) | When tip occurred |

---

### Raid Event

Note: Kick does not have an official "raid" feature like Twitch, but may have similar community events.

---

# YOUTUBE API

## YouTube Stream/Channel Data

### liveStreams.list - Get Live Streams

**Endpoint:** `GET https://www.googleapis.com/youtube/v3/liveStreams`

**Authorization Required:** Yes (scopes: `youtube`, `youtube.readonly`, or `youtube.force-ssl`)

**Query Parameters:**
- `part` (required) - Resource parts: `id`, `snippet`, `cdn`, `status`
- `id` (optional) - Comma-separated list of stream IDs
- `mine` (optional) - Set to `true` for owned streams
- `maxResults` (optional, default: 5) - Number of results (0-50)
- `pageToken` (optional) - Pagination token

**Response Structure:**

```typescript
interface YouTubeLiveStreamResponse {
  kind: "youtube#liveStreamResponse";
  etag: string;
  nextPageToken?: string;
  prevPageToken?: string;
  pageInfo: {
    totalResults: number;
    resultsPerPage: number;
  };
  items: YouTubeLiveStream[];
}

interface YouTubeLiveStream {
  kind: "youtube#liveStream";
  etag: string;
  id: string;                          // Stream ID
  snippet: {
    publishedAt: string;               // ISO8601 - When stream was created
    channelId: string;                 // Channel ID that owns stream
    title: string;                     // Stream title
    description: string;               // Stream description
    isDefaultStream: boolean;          // Whether this is default stream
  };
  cdn: {
    ingestionType: string;             // Ingestion method: "rtmp", "dash", "hls"
    resolution: string | null;         // Stream resolution (e.g., "variable")
    frameRate: string | null;          // Frame rate (e.g., "variable")
    ingestionInfo: {
      streamName: string;              // The stream name/code
      ingestionAddress: string;        // RTMP ingestion URL
      backupIngestionAddress?: string; // Backup ingestion URL
    };
  };
  status: {
    streamStatus: string;              // "active", "created", "error", "inactive", "ready"
    healthStatus: {
      status: string;                  // "good", "ok", "bad", "noData"
      lastUpdateTimeNs: string;        // Last health check (nanoseconds)
    };
  };
}
```

**Snippet Fields:**

| API Field Name | Normalized Name | Type | Required | Description |
|----------------|-----------------|------|----------|-------------|
| publishedAt | publishedAt | string (ISO8601) | Yes | When stream was created |
| channelId | channelId | string | Yes | Channel ID that owns the stream |
| title | title | string | Yes | Stream title |
| description | description | string | Yes | Stream description |
| isDefaultStream | isDefaultStream | boolean | Yes | Whether this is channel's default stream |

**CDN Fields:**

| API Field Name | Normalized Name | Type | Required | Description |
|----------------|-----------------|------|----------|-------------|
| ingestionType | ingestionType | string | Yes | "rtmp", "dash", or "hls" |
| resolution | resolution | string\|null | Optional | Resolution (e.g., "variable", "1080p") |
| frameRate | frameRate | string\|null | Optional | Frame rate (e.g., "60fps", "variable") |
| ingestionInfo.streamName | streamName | string | Yes | Stream key/code |
| ingestionInfo.ingestionAddress | ingestionUrl | string | Yes | RTMP URL to stream to |
| ingestionInfo.backupIngestionAddress | backupIngestionUrl | string | Optional | Backup RTMP URL |

**Status Fields:**

| API Field Name | Normalized Name | Type | Required | Description |
|----------------|-----------------|------|----------|-------------|
| streamStatus | streamStatus | string | Yes | "active", "created", "error", "inactive", "ready" |
| healthStatus.status | healthStatus | string | Yes | "good", "ok", "bad", "noData" |
| healthStatus.lastUpdateTimeNs | lastHealthCheck | string | Yes | Last check timestamp (nanoseconds) |

---

### videos.list - Get Live Broadcast Videos

**Endpoint:** `GET https://www.googleapis.com/youtube/v3/videos`

**Query Parameters:**
- `part` (required) - Comma-separated parts:
  - `snippet` - Basic metadata
  - `contentDetails` - Duration, content type
  - `statistics` - View count, like count, etc.
  - `liveStreamingDetails` - Live-specific info
- `id` (optional) - Comma-separated video IDs
- `myRating` (optional) - Filter by user rating

**Response Structure for Live Videos:**

```typescript
interface YouTubeVideo {
  kind: "youtube#video";
  etag: string;
  id: string;                          // Video ID
  snippet: {
    publishedAt: string;               // ISO8601
    channelId: string;                 // Channel ID
    title: string;                     // Video title
    description: string;               // Video description
    thumbnails: {
      default: YouTubeThumbnail;
      medium: YouTubeThumbnail;
      high: YouTubeThumbnail;
      standard?: YouTubeThumbnail;
      maxres?: YouTubeThumbnail;
    };
    channelTitle: string;              // Channel name
    categoryId: string;                // Category ID
    liveBroadcastContent: string;      // "live", "none", "upcoming"
    defaultLanguage?: string;          // Default language
    localized?: {
      title: string;
      description: string;
    };
  };
  contentDetails: {
    duration: string;                  // ISO8601 duration (e.g., "PT1H30M15S")
    dimension: string;                 // "2d" or "3d"
    definition: string;                // "hd" or "sd"
    caption: string;                   // "true" or "false"
    licensedContent: boolean;          // Whether content is licensed
    contentRating?: object;            // Content rating info
    projection: string;                // "rectangular" or "360"
  };
  statistics: {
    viewCount: string;                 // View count as string
    likeCount: string;                 // Like count
    favoriteCount: string;             // Favorite count
    commentCount: string;              // Comment count
  };
  liveStreamingDetails: {
    actualStartTime?: string;          // ISO8601 - When stream actually started
    actualEndTime?: string;            // ISO8601 - When stream ended
    scheduledStartTime?: string;       // ISO8601 - Scheduled start time
    scheduledEndTime?: string;         // ISO8601 - Scheduled end time
    concurrentViewers?: string;        // Current viewers (as string)
    activeLiveChatId?: string;         // Live Chat ID
  };
}

interface YouTubeThumbnail {
  url: string;                         // Template: {width}x{height} or fixed
  width?: number;
  height?: number;
}
```

**Live Streaming Details Fields:**

| API Field Name | Normalized Name | Type | Required | Description |
|----------------|-----------------|------|----------|-------------|
| actualStartTime | actualStartTime | string (ISO8601) | Live | When stream started |
| actualEndTime | actualEndTime | string (ISO8601) | Live | When stream ended |
| scheduledStartTime | scheduledStartTime | string (ISO8601) | Upcoming | Scheduled start time |
| scheduledEndTime | scheduledEndTime | string (ISO8601) | Upcoming | Scheduled end time |
| concurrentViewers | concurrentViewers | number (from string) | Live | Current viewer count |
| activeLiveChatId | liveChatId | string | Live | Associated chat ID |

---

### channels.list - Get Channel Information

**Endpoint:** `GET https://www.googleapis.com/youtube/v3/channels`

**Query Parameters:**
- `part` (required) - Comma-separated parts:
  - `snippet` - Basic channel info
  - `contentDetails` - Upload playlist, etc.
  - `statistics` - Subscriber count, view count, etc.
  - `brandingSettings` - Channel branding
  - `status` - Channel status
  - `topicDetails` - Channel topics
  - `auditDetails` - Audit/troubleshooting info
  - `localizations` - Localized channel info
  - `contentOwnerDetails` - Content owner info
- `id` (optional) - Comma-separated channel IDs
- `mine` (optional) - Set to `true` for authenticated user's channel
- `forHandle` (optional) - Get channel by handle (@username)

**Response Structure:**

```typescript
interface YouTubeChannel {
  kind: "youtube#channel";
  etag: string;
  id: string;                          // Channel ID
  snippet: {
    title: string;                     // Channel title
    description: string;               // Channel description
    customUrl: string;                 // Channel handle (e.g., @username)
    publishedAt: string;               // ISO8601 - When channel was created
    thumbnails: {
      default: YouTubeThumbnail;
      medium: YouTubeThumbnail;
      high: YouTubeThumbnail;
    };
    defaultLanguage?: string;          // Default language
    localized?: {
      title: string;
      description: string;
    };
    country?: string;                  // Channel country
  };
  contentDetails: {
    relatedPlaylists: {
      likes: string;                   // Like playlist ID
      favorites: string;               // Favorites playlist ID
      uploads: string;                 // Upload playlist ID
      watchHistory?: string;            // Watch history playlist ID
      watchLater?: string;              // Watch later playlist ID
    };
  };
  statistics: {
    viewCount: string;                 // Total lifetime views
    subscriberCount: string;           // Subscriber count
    hiddenSubscriberCount: boolean;    // Whether subs are hidden
    videoCount: string;                // Total video count
  };
  brandingSettings?: {
    channel: {
      title: string;
      description: string;
      keywords: string;                // Comma-separated keywords
      trackingAnalyticsAccountId?: string;
      moderationComments?: string;
      showRelatedChannels?: boolean;
      showBrowseView?: boolean;
      featuredChannelsTitle?: string;
      featuredChannelsUrls?: string[];  // Comma-separated URLs
      unsubscribedTrailer?: string;     // Video ID
      profileColor?: string;           // Hex color code
    };
    image: {                           // Channel images
      bannerExternalUrl?: string;
      bannerImageUrl?: string;
      bannerMobileImageUrl?: string;
      bannerMobileLowImageUrl?: string;
      bannerTabletLowImageUrl?: string;
      bannerTabletImageUrl?: string;
      bannerTvImageUrl?: string;
      bannerTvLowImageUrl?: string;
      bannerExternalImageUrl?: string;
    };
    hints: {
      enable-tabbed-browsing?: string;
    };
  };
  status: {
    longUploadsStatus: string;         // "allowed", "eligible", or "disallowed"
    privacyStatus: string;             // "public", "unlisted", "private", "unpublished"
    isLinked: boolean;                 // Whether linked to Google+ (legacy)
    selfMadeChannelRatingEnabled: boolean;
    madeForKids: boolean;              // Is channel designated as made for kids
  };
  topicDetails?: {
    topicIds: string[];                // Topic category IDs
    topicCategories: string[];         // Freebase/WikiData topics
  };
  auditDetails?: {
    overallGoodRating: boolean;
    contentIdRatingGoodStanding: boolean;
    copyrightStrikesGoodStanding: boolean;
    communityGuidelinesGoodStanding: boolean;
  };
  contentOwnerDetails?: {
    contentOwner: string;              // YouTube content owner ID
    timeLinked: string;                // ISO8601 - When linked
  };
}
```

---

## YouTube Chat Message Data

### liveChat.messages.list - Get Live Chat Messages

**Endpoint:** `GET https://www.googleapis.com/youtube/v3/liveChat/messages`

**Authorization Required:** Yes

**Query Parameters:**
- `liveChatId` (required) - The ID of the live chat
- `part` (required) - `id`, `snippet`, `authorDetails`
- `hl` (optional) - Language code
- `maxResults` (optional, default: 500) - Number of messages (0-2000)
- `pageToken` (optional) - Pagination token

**Response Structure:**

```typescript
interface YouTubeLiveChatMessagesResponse {
  kind: "youtube#liveChatMessageListResponse";
  etag: string;
  nextPageToken: string;               // Token for next poll
  pollingIntervalMillis: number;       // Milliseconds until next poll
  offlineAt?: string;                  // ISO8601 - When chat went offline (if offline)
  pageInfo: {
    totalResults: number;
    resultsPerPage: number;
  };
  items: YouTubeLiveChatMessage[];
}

interface YouTubeLiveChatMessage {
  kind: "youtube#liveChatMessage";
  etag: string;
  id: string;                          // Message ID
  snippet: {
    type: string;                      // "textMessageEvent", "superChatEvent", "superStickerEvent", "memberMilestoneChatEvent", "sponsorOnlyGiftPaidEvent", "tombstone"
    liveChatId: string;                // Chat ID
    textMessageDetails?: {             // Present for textMessageEvent
      messageText: string;             // Message content
    };
    superChatDetails?: {               // Present for superChatEvent
      amountMicros: number;            // Super Chat amount in micros (1/1,000,000)
      currency: string;                // Currency code (e.g., "USD")
      amountDisplayString: string;     // Formatted amount (e.g., "$5.00")
      userComment?: string;            // User's comment with Super Chat
      tier: number;                    // Super Chat tier (1-1,000,000)
    };
    superStickerDetails?: {            // Present for superStickerEvent
      amountMicros: number;
      currency: string;
      amountDisplayString: string;
      tier: number;
      stickerUrl: string;              // Sticker image URL
      height: number;                  // Sticker height in px
      width: number;                   // Sticker width in px
    };
    memberMilestoneDetails?: {         // Present for memberMilestoneChatEvent
      userComment: string;
      memberLevelName: string;         // "new member level name", "level X"
      achievement: string;             // "milestone"
      memberLevel: number;             // Level number
      durationMonths: number;
    };
    sponsorOnlyGiftPaidDetails?: {     // Present for sponsorOnlyGiftPaidEvent
      "giftMembershipsKeyName": string;
      giftMembershipsLevelName: string;
      membershipDurationMonths: number;
    };
    publishedAt: string;               // ISO8601 - When message was published
    hasDisplayContent: boolean;        // Whether message has visible content
  };
  authorDetails: {
    channelId: string;                 // Author's channel ID
    channelUrl: string;                // Author's channel URL
    displayName: string;               // Author's display name
    profileImageUrl: string;           // Author's profile image URL
    isVerified: boolean;               // Whether author channel is verified
    isChatOwner: boolean;              // Whether author is the channel owner
    isChatSponsor: boolean;            // Whether author is a member/sponsor
    isChatModerator: boolean;          // Whether author is a moderator
  };
}
```

**Snippet Fields:**

| API Field Name | Normalized Name | Type | Required | Description |
|----------------|-----------------|------|----------|-------------|
| type | messageType | string | Yes | Message event type |
| liveChatId | liveChatId | string | Yes | Live chat ID |
| publishedAt | timestamp | string (ISO8601) | Yes | Message timestamp |
| hasDisplayContent | hasDisplayContent | boolean | Yes | Whether message has visible content |

**Message Types:**
- `textMessageEvent` - Regular chat message
- `superChatEvent` - Super Chat (paid message)
- `superStickerEvent` - Super Sticker purchase
- `memberMilestoneChatEvent` - Membership milestone
- `sponsorOnlyGiftPaidEvent` - Gifted membership
- `tombstone` - Deleted/blocked message

**Super Chat Fields:**

| API Field Name | Normalized Name | Type | Required | Description |
|----------------|-----------------|------|----------|-------------|
| amountMicros | amountMicros | number | Yes | Amount in micros (1/1,000,000 of currency) |
| currency | currency | string | Yes | Currency code (e.g., "USD", "EUR") |
| amountDisplayString | amountDisplayString | string | Yes | Formatted string (e.g., "$5.00") |
| userComment | message | string | Optional | User's comment |
| tier | tier | number | Yes | Super Chat tier (1-1000000, higher = more prominent) |

**Note:** To convert micros to regular amount: `amount = amountMicros / 1_000_000`

**Author Details Fields:**

| API Field Name | Normalized Name | Type | Required | Description |
|----------------|-----------------|------|----------|-------------|
| channelId | authorChannelId | string | Yes | Author's channel ID |
| channelUrl | authorChannelUrl | string | Yes | Author's channel URL |
| displayName | authorDisplayName | string | Yes | Author's display name |
| profileImageUrl | authorProfileImageUrl | string | Yes | Author's profile image |
| isVerified | isVerified | boolean | Yes | Verification badge status |
| isChatOwner | isOwner | boolean | Yes | Whether author owns the channel |
| isChatSponsor | isSponsor | boolean | Yes | Whether author is a member/sponsor |
| isChatModerator | isModerator | boolean | Yes | Whether author is a moderator |

---

## YouTube Event Types

YouTube Live Chat events are delivered via `liveChat.messages.list` polling, not real-time webhooks (unlike Twitch EventSub).

### New Member / Sponsor Events

**Message Type:** `memberMilestoneChatEvent` or `sponsorOnlyGiftPaidEvent`

**Member Milestone Fields:**

| Field | Normalized Name | Type | Description |
|-------|-----------------|------|-------------|
| userComment | message | string | User's comment with the milestone |
| memberLevelName | levelName | string | Level name (e.g., "Level 3") |
| achievement | achievement | string | Always "milestone" |
| memberLevel | level | number | Level number (1, 2, 3, ...) |
| durationMonths | cumulativeMonths | number | Total months as member |

---

### SuperChat Events

**Message Type:** `superChatEvent`

**See "Super Chat Fields" in Chat Message section above.**

---

### Super Sticker Events

**Message Type:** `superStickerEvent`

**Fields:**

| Field | Normalized Name | Type | Description |
|-------|-----------------|------|-------------|
| amountMicros | amountMicros | number | Amount in micros |
| currency | currency | string | Currency code |
| amountDisplayString | amountDisplayString | string | Formatted amount |
| tier | tier | number | Super Chat tier |
| stickerUrl | stickerUrl | string | Sticker image URL |
| height | stickerHeight | number | Image height in pixels |
| width | stickerWidth | number | Image width in pixels |

---

### Sponsorship (Membership) Events

**Message Type:** Can appear as:
- `memberMilestoneChatEvent` - Milestone reached
- `sponsorOnlyGiftPaidEvent` - Gifted membership

**Gifted Membership Fields:**

| Field | Normalized Name | Type | Description |
|-------|-----------------|------|-------------|
| giftMembershipsKeyName | giftType | string | Name of gift |
| giftMembershipsLevelName | giftLevel | string | Level of gifted membership |
| membershipDurationMonths | durationMonths | number | Duration in months |

---

# CROSS-PLATFORM COMPARISON

## Unified Field Matrix

| Field | Twitch | Kick | YouTube | Notes |
|-------|--------|------|---------|-------|
| **Stream Metadata** |
| streamId / id | ✓ (id) | ✓ (id) | ✓ (id) | Unique stream identifier |
| channelId / broadcaster_id | ✓ (broadcaster_id) | ✓ (channel_id) | ✓ (channelId) | Channel where stream exists |
| userId / user_id | ✓ (user_id) | ✓ (user_id) | ✓ (via channel info) | Streamer's user ID |
| username / login | ✓ (user_login) | ✓ (username) | ✓ (via channel info) | Streamer's username |
| displayName / display_name | ✓ (user_name) | ✓ (display_name) | ✓ (channelTitle) | Display name |
| title | ✓ (title) | ✓ (title) | ✓ (title) | Stream title |
| isLive | ✓ (via type="live") | ✓ (is_live) | ✓ (via liveBroadcastContent) | Live status |
| viewerCount | ✓ (viewer_count) | ✓ (viewer_count) | ✓ (concurrentViewers) | Current viewers |
| thumbnailUrl | ✓ (thumbnail_url) | ✓ (thumbnail) | ✓ (thumbnails) | Stream thumbnail |
| createdAt / started_at | ✓ (started_at) | ✓ (created_at) | ✓ (actualStartTime) | Stream start time |
| gameId / category_id | ✓ (game_id) | ✓ (category_id) | ✓ (categoryId) | Game/category ID |
| gameName / category_name | ✓ (game_name) | ✓ (category_name) | ✓ (via API) | Game/category name |
| language | ✓ (language) | ✓ (language) | ✓ (defaultLanguage) | Stream language |
| tags | ✓ (tags) | ✓ (tags) | Not available | Stream tags |
| isMature | ✓ (is_mature) | Not available | Not available | Mature content flag |
| streamDelay | ✓ (delay) | Not available | Not available | Stream delay (seconds) |
| **User Metadata** |
| userId / id | ✓ (id) | ✓ (id) | ✓ (id) | User ID |
| username / login | ✓ (login) | ✓ (username) | Not direct (via snippet.customUrl) | Username |
| displayName / display_name | ✓ (display_name) | ✓ (display_name) | ✓ (snippet.title) | Display name |
| bio / description | ✓ (description) | ✓ (bio) | ✓ (snippet.description) | User bio |
| profileImageUrl | ✓ (profile_image_url) | ✓ (avatar_url) | ✓ (snippet.thumbnails) | Profile picture |
| offlineImageUrl | ✓ (offline_image_url) | ✓ (banner_url) ✓ | Banner when offline | |
| totalViewCount | ✓ (view_count) | ✓ (followers_count) | ✓ (statistics.viewCount) | Total views |
| subscriberCount | ✓ (separate API) | ✓ (subscriber_count) | ✓ (statistics.subscriberCount) | Subscriber count |
| followerCount | ✓ (separate API) | ✓ (followers_count) | Not directly available | Follower count |
| accountType | ✓ (type) | ✓ (is_verified) | Not available | Account type/status |
| broadcasterType | ✓ (broadcaster_type) | Not available | Not available | Partner/affiliate status |
| createdAt | ✓ (created_at) | ✓ (created_at) | ✓ (snippet.publishedAt) | Account creation date |
| **Chat Message** |
| messageId / id | ✓ (id tag) | ✓ (id) | ✓ (id) | Unique message ID |
| userId / user_id | ✓ (user_id tag) | ✓ (sender.id) | ✓ (authorDetails.channelId) | Sender user ID |
| username / login | ✓ (from IRC source) | ✓ (sender.username) | Not direct | Sender username |
| displayName | ✓ (display_name tag) | ✓ (sender.displayname) | ✓ (authorDetails.displayName) | Sender display name |
| message / content | ✓ (IRC message text) | ✓ (content) | ✓ (textMessageDetails.messageText) | Message text |
| timestamp | ✓ (tmi-sent-ts tag) | ✓ (timestamp) | ✓ (publishedAt) | Message timestamp |
| color / identity.color | ✓ (color tag) | ✓ (sender.identity.color) | Not available | Username color |
| badges | ✓ (badges tag) | ✓ (sender.identity.badges) | Not available | User badges |
| isModerator | ✓ (mod tag) | ✓ (sender.is_mod) | ✓ (authorDetails.isChatModerator) | Moderator status |
| isSubscriber / is_subscribed | ✓ (subscriber tag) | ✓ (sender.identity.subscribed) | ✓ (authorDetails.isChatSponsor) | Subscriber status |
| isVip | ✓ (vip tag) | Not available | Not available | VIP status |
| emotes | ✓ (emotes tag) | ✓ (emotes) | Not in same format | Emotes in message |
| bits | ✓ (bits tag) | Not available | Not available | Bits cheered (Twitch only) |
| userType | ✓ (user_type tag) | Not available | Not in message | User role type |
| **Events** |
| follow / follower | ✓ (channel.follow) | ✓ (follow event) | Not available | Follow event |
| subscribe / subscription | ✓ (channel.subscribe) | ✓ (subscription event) | ✓ (memberMilestoneChatEvent) | Subscription/membership event |
| gift / gift_subscription | ✓ (channel.subscription.gift) | Not available | ✓ (sponsorOnlyGiftPaidEvent) | Gifted subscription |
| cheer / tip | ✓ (channel.cheer) | ✓ (tip event) | ✓ (superChatEvent) | Tipping event |
| raid | ✓ (channel.raid) | Not available | Not available | Raid event (Twitch only) |
| redemption / channel_points | ✓ (channel_points...redemption.add) | Not available | Not available | Channel points redemption |
| hypeTrain | ✓ (channel.hype_train.*) | Not available | Not available | Hype train event |

---

## Data Normalization Strategy

### Common Fields (Available on 2+ Platforms)

| Field | Twitch | Kick | YouTube | Normalization Strategy |
|-------|--------|------|---------|------------------------|
| **Stream Basics** |
| streamId | `id` | `id` | `id` | Direct mapping |
| channelId | `broadcaster_id` | `channel_id` | `channelId` | Direct mapping |
| userId | `user_id` | `user_id` | Get from channels API | Direct mapping |
| username | `user_login` | `username` | `snippet.customUrl` (handle) | Direct mapping (YouTube requires extra lookup) |
| displayName | `user_name` | `display_name` | `snippet.title` | Direct mapping |
| title | `title` | `title` | `title` | Direct mapping |
| isLive | `type === 'live'` | `is_live` | `snippet.liveBroadcastContent === 'live'` | Boolean conversion |
| viewerCount | `viewer_count` | `viewer_count` | Parse `concurrentViewers` string | Direct mapping |
| thumbnailUrl | Replace `{width}x{height}` template | Direct URL | Select highest resolution thumbnail | Direct/Template mapping |
| startTime | `started_at` | `created_at` | `actualStartTime` | Direct mapping |
| gameId | `game_id` | `category_id` | `categoryId` | Renamed to `categoryId` |
| gameName | `game_name` | `category_name` | Get from categories API | Renamed to `categoryName` |
| language | `language` | `language` | `snippet.defaultLanguage` | Direct mapping |
| **User Basics** |
| userId | `id` | `id` | `id` | Direct mapping |
| username | `login` | `username` | Not direct (customUrl) | Use channel API for YouTube |
| displayName | `display_name` | `display_name` | `snippet.title` | Direct mapping |
| bio | `description` | `bio` | `snippet.description` | Direct mapping |
| profileImage | `profile_image_url` | `avatar_url` | `snippet.thumbnails.default.url` | Direct mapping |
| totalViews | `view_count` | `followers_count` | `statistics.viewCount` | Platform-specific meaning |
| subscribers | Separate API | `subscriber_count` | `statistics.subscriberCount` | Direct mapping |
| createdAt | `created_at` | `created_at` | `snippet.publishedAt` | Direct mapping |
| **Chat Message Basics** |
| messageId | `id` tag | `id` | `id` | Direct mapping |
| userId | `user_id` tag | `sender.id` | `authorDetails.channelId` | Direct mapping |
| displayName | `display_name` tag | `sender.displayname` | `authorDetails.displayName` | Direct mapping |
| message | IRC message text | `content` | `textMessageDetails.messageText` | Direct mapping |
| timestamp | `tmi-sent-ts` (milliseconds) | `timestamp` (ISO8601) | `publishedAt` (ISO8601) | Normalize to ISO8601 string |
| isModerator | `mod` tag | `sender.is_mod` | `authorDetails.isChatModerator` | Direct mapping |
| isSubscriber | `subscriber` tag | `sender.identity.subscribed` | `authorDetails.isChatSponsor` | Direct mapping |
| **Events** |
| follow | channel.follow Event | WebSocket "follow" event | Not available | Twitch has EventSub, Kick has WS |
| subscription | channel.subscribe Event | WebSocket "subscription" | memberMilestoneChatEvent | YouTube milestones, not every sub |
| tip/cheer | channel.cheer Event (bits) | WebSocket "tip" event | superChatEvent | Different currencies/tiers |
| gift | channel.subscription.gift Event | Not available | sponsorOnlyGiftPaidEvent | Gifted memberships |

---

### Type Conversions

| Field | Source Platform | Source Type | Target Type | Conversion Method |
|-------|----------------|-------------|-------------|------------------|
| viewerCount | YouTube | string | number | `parseInt(value)` or `Number(value)` |
| pollInterval | YouTube | milliseconds | number | Direct use for next poll |
| timestamp (chat) | Twitch | milliseconds (string) | ISO8601 string | Convert: `new Date(parseInt(timestamp)).toISOString()` |
| amount | YouTube SuperChat | micros (number) | currency amount | Divide by 1,000,000 |
| amount_display | YouTube SuperChat | localized string | string | Direct mapping |
| thumbnail | Twitch | {width}x{height} template | URL | Replace with desired dimensions |
| viewerCount | Twitch/Kick | number | number | Direct use |
| duration | YouTube videos | PT1H30M15S format | milliseconds | Parse ISO8601 duration |
| liveBroadcastContent | YouTube | string ("live" etc) | boolean | `value === 'live'` |
| streamDelay | Twitch | seconds | number | Direct use |

---

### Platform-Unique Fields

**Twitch-Unique Fields:**
| Field | Description | Strategy |
|-------|-------------|----------|
| `tags` | Stream tags (Twitch native tags) | Store in generic `tags` array |
| `is_mature` | Mature content flag | Store in `mature` field (optional, null on other platforms) |
| `streamDelay` | Stream delay for moderators | Store in `streamDelay` (seconds) |
| `emotes` (in chat) | Emote parsing | Parse into standardized format |
| `badges` | Chat badges | Normalize to shared badge structure |
| `bits` | Bits in chat | Store in `amount` currency field with currency "BITS" |
| `hypeTrain` | Hype train events | Store as special event type |
| `channelPoints` | Channel points redemptions | Store as reward_redemption event type |
| `broadcasterType` | Partner/affiliate | Store in `accountStatus` field |
| `raid` | Raids | Store as raid event type (platform-unique) |

**Kick-Unique Fields:**
| Field | Description | Strategy |
|-------|-------------|----------|
| `is_banned` | Ban status | Store in `isBanned` boolean field |
| `following_count` | Following count | Store in `followingCount` field |
| `is_verified` | Verification badge | Store in `isVerified` boolean field |
| `cards` | Rich chat cards | Store as `richCards` array field |
| `sender.identity` | Identity block | Flatten into standardized fields |

**YouTube-Unique Fields:**
| Field | Description | Strategy |
|-------|-------------|----------|
| `pollingIntervalMillis` | Chat polling interval | Use for chat refresh timing |
| `superStickerDetails` | Super Sticker data | Store as `sticker` object in event |
| `memberMilestoneDetails` | Milestone data | Store as `milestone` object in member event |
| `topicDetails` | Channel topics | Store in `topics` array field |
| `auditDetails` | Audit/standing info | Store in `audit` object |
| `madeForKids` | Made for kids designation | Store in `isMadeForKids` field |

---

## Missing Fields Analysis

### Fields Missing on Twitch
| Field | Platform(s) that have it | Recommended Workaround |
|-------|------------------------|---------------------|
| `handle` (custom URL) | YouTube | Use `login` / `user_login` |
| `topics` (channel categories) | YouTube | Extract from description or tags |
| `superSticker` | YouTube | Not applicable (Twitch has emotes) |
| `milestone` events (member announcement) | YouTube | Subscribe to all subscription messages vs. milestones |

### Fields Missing on Kick
| Field | Platform(s) that have it | Recommended Workaround |
|-------|------------------------|---------------------|
| `gameId` properly structured | Twitch/YouTube | Use `category_id` but note differences |
| `subscriber.tier` | Twitch | Kick has flat subscriptions (no tiers) - use `1` or omit |
| `bits` | Twitch | Kick uses direct tipping in currency |
| `tags` | Twitch | Use channel tags or empty array |
| `raid` | Twitch | Kick doesn't have raids - can't map |
| `channelPoints` | Twitch | Not available on Kick |
| `emotes` (standardized) | Twitch | Kick emotes in message, but format differs |

### Fields Missing on YouTube
| Field | Platform(s) that have it | Recommended Workaround |
|-------|------------------------|---------------------|
| `login` / `username` handle | Twitch/Kick | Use `snippet.customUrl` or generate from channelId |
| `badges` in chat | Twitch/Kick | Use `authorDetails` flags (isModerator, isChatSponsor, etc.) |
| `emotes` in chat message | Twitch/Kick | YouTube uses Unicode emojis only (rarely) |
| `color` (username color) | Twitch/Kick | Not available on YouTube chat |
| `raid` | Twitch | Not available on YouTube |
| `bits` / direct tipping | Twitch | Use SuperChat as equivalent (requires purchase) |
| `hypeTrain` | Twitch | Not available on YouTube |
| `channelPoints` | Twitch | Not available on YouTube |
| `follower` events | Twitch/Kick | YouTube doesn't expose follow events via API |
| `real-time events` | Twitch (EventSub) | YouTube uses polling for chat, no webhook events |

---

# SUMMARY AND RECOMMENDATIONS

## Core Fields for Shared Models

Based on the research above, the following fields are recommended for inclusion in shared data models:

### SharedStream Model
```typescript
interface SharedStream {
  platform: 'twitch' | 'kick' | 'youtube';
  streamId: string;
  channelId: string;
  userId: string;
  username: string;
  displayName: string;
  title: string;
  isLive: boolean;
  viewerCount: number;
  thumbnailUrl: string;
  startTime: string | null;           // ISO8601
  categoryId: string | null;
  categoryName: string | null;
  language: string | null;
  tags: string[];
  
  // Optional fields (platform-specific)
  mature?: boolean;                   // Twitch
  streamDelay?: number;               // Twitch (seconds)
  customUrl?: string;                 // YouTube (@handle)
  
  // Raw data for platform-specific fields
  rawData?: any;
}
```

### SharedUser Model
```typescript
interface SharedUser {
  platform: 'twitch' | 'kick' | 'youtube';
  userId: string;
  username: string | null;           // YouTube: use customUrl or generate
  displayName: string;
  bio: string;
  profileImageUrl: string | null;
  offlineImageUrl: string | null;    // YouTube: bannerImageUrl
  totalViews: number;
  subscribers: number | null;        // Kick: may not always be available
  followers: number | null;          // Twitch: separate API, Kick: available
  createdAt: string;                 // ISO8601
  
  // Optional fields (platform-specific)
  accountType?: string;              // Twitch: admin, staff, etc.
  broadcasterType?: string;          // Twitch: partner, affiliate
  isVerified?: boolean;              // Kick
  isBanned?: boolean;                // Kick
  
  // Raw data
  rawData?: any;
}
```

### SharedChatMessage Model
```typescript
interface SharedChatMessage {
  platform: 'twitch' | 'kick' | 'youtube';
  messageId: string;
  chatId: string;                    // Room or channel ID
  userId: string;
  username: string | null;
  displayName: string;
  profileImageUrl: string | null;
  color: string | null;              // Hex format
  message: string;
  timestamp: string;                 // ISO8601
  
  // Flags
  isModerator: boolean;
  isSubscriber: boolean;
  isVip: boolean | null;             // Twitch only
  isOwner: boolean;                  // YouTube only
  isVerified: boolean;               // YouTube only
  
  // Emotes
  emotes: Array<{
    id: string;
    positions: Array<{start: number, end: number}>;
  }>;
  
  // Badges (platform-specific structure)
  badges: Array<{name: string, version: string}>;
  
  // Raw data
  rawData?: any;
}
```

### SharedEvent Model
```typescript
type EventType = 
  | 'follow' 
  | 'subscription' 
  | 'subscription_gift' 
  | 'subscription_message' 
  | 'cheer' 
  | 'super_chat'          // YouTube equivalent to cheer
  | 'super_sticker'       // YouTube-specific
  | 'member_announcement' // YouTube milestone
  | 'tip'                 // Kick-specific (currency)
  | 'raid'                // Twitch-specific
  | 'redemption'          // Twitch channel points
  | 'hype_train'          // Twitch-specific
  | 'unknown';

interface SharedEvent {
  platform: 'twitch' | 'kick' | 'youtube';
  eventId: string;
  eventType: EventType;
  timestamp: string;                 // ISO8601
  
  // Channel/User context
  channelId: string;
  channelName: string;
  
  // Actor (the person taking the action)
  actor: {
    id: string;
    username: string | null;
    displayName: string;
  } | null;
  
  // Event-specific data
  data: {
    // Follow
    type?: 'follow';
    
    // Subscription/Member
    type?: 'subscription' | 'subscription_message' | 'member_announcement';
    tier?: string;                    // Twitch: "1000", "2000", "3000"
    months?: number;                  // Cumulative months
    message?: string;                 // Resub message or milestone message
    milestone?: string;               // YouTube milestone name
    isGift?: boolean;
    
    // Subscription Gift
    type?: 'subscription_gift';
    giftCount?: number;
    totalGifts?: number;
    
    // Cheer/Tip/SuperChat
    type?: 'cheer' | 'tip' | 'super_chat';
    amount?: number;                  // Standardized amount
    currency?: string;                // Currency code ("USD", "EUR", "BITS")
    message?: string;
    
    // SuperSticker (YouTube)
    type?: 'super_sticker';
    stickerUrl?: string;
    stickerHeight?: number;
    stickerWidth?: number;
    
    // Raid (Twitch)
    type?: 'raid';
    targetChannelId?: string;
    targetChannelName?: string;
    viewerCount?: number;
    
    // Redemption (Twitch)
    type?: 'redemption';
    rewardId?: string;
    rewardTitle?: string;
    rewardPrompt?: string;
    cost?: number;
    userInput?: string;
    status?: string;
    
    // HypeTrain (Twitch)
    type?: 'hype_train';
    level?: number;
    points?: number;
    goal?: number;
    expiresAt?: string;
    contributors?: Array<{id: string, amount: number}>;
    isGoldenKappa?: boolean;
    
    // Raw/bulk data for anything else
    [key: string]: any;
  };
  
  // Raw data
  rawData?: any;
}
```

---

# RESEARCH LIMITATIONS

1. **Kick API**: Kick's official API documentation is limited. This research relies on:
   - Community-maintained libraries (kient, kick-nodejs)
   - Reverse-engineered endpoint structures
   - These may change without notice

2. **YouTube Live Events**: YouTube does not provide real-time event webhooks like Twitch EventSub. Events must be:
   - Detected by polling chat messages
   - Differentiated by message type (e.g., `superChatEvent`, `memberMilestoneChatEvent`)
   - Follow events are not available via public API

3. **YouTube Usernames**: YouTube does not provide "login" or "username" handles directly:
   - Use `snippet.customUrl` for channels with a handle (@username)
   - Fallback to generating from `channelId` (e.g., "UC..." → internal mapping)
   - Display name is primary identifier

4. **Timestamp Formats**:
   - Twitch IRC uses UNIX milliseconds (tmi-sent-ts)
   - Twitch HTTP API uses ISO8601 (RFC3339)
   - Kick uses ISO8601
   - YouTube uses ISO8601 (RFC3339)
   - Recommendation: Normalize everything to ISO8601 string

5. **Amounts/Currencies**:
   - Twitch: Bits (integer) - no currency code
   - Kick: Currency + amount (e.g., "USD", amount = number)
   - YouTube: Micros (1/1,000,000 of currency) + currency code
   - Recommendation: Standardize to `{amount: number, currency: string}` with "BITS" for Twitch bits

---

# REFERENCE DOCUMENTATION

This research is based on the following official documentation:

- Twitch Helix API: https://dev.twitch.tv/docs/api/reference/
- Twitch IRC (Chat): https://dev.twitch.tv/docs/chat/irc/
- Twitch EventSub: https://dev.twitch.tv/docs/eventsub/subscriptions/
- YouTube Live Streaming API: https://developers.google.com/youtube/v3/live
- YouTube Live Chat API: https://developers.google.com/youtube/v3/live/docs/liveChat
- Community Libraries:
  - kient (TypeScript Kick client): https://github.com/zSoulweaver/kient
  - kick-nodejs: https://github.com/waaverecords/kick-nodejs
  - TwitchLib EventSub: https://github.com/TwitchLib/TwitchLib.EventSub.Core

---

**End of Research Document**

