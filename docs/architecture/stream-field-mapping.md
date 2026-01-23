# Stream Field Mapping

## Twitch Helix API → TwitchStream

| Twitch API Field | TwitchStream Field | Type | Source |
|------------------|-------------------|------|--------|
| id | twitchId | string | API-RESEARCH.md lines 52-55 |
| user_login | username | string | API-RESEARCH.md lines 56-58 |
| title | title | string | API-RESEARCH.md lines 59-61 |
| game_id | categoryId | string | API-RESEARCH.md lines 62-64 |
| tags | tags | string[] | API-RESEARCH.md lines 65-67 |
| is_mature | isMature | boolean | API-RESEARCH.md lines 68-70 |
| language | language | string | API-RESEARCH.md lines 71-73 |
| thumbnail_url | thumbnailUrl | string \| null | API-RESEARCH.md lines 74-76 |
| started_at | startTime | Date | API-RESEARCH.md (implied) |

**Platform-specific features:**
- channelPoints (always 0 from API, updated via WebSocket)

## Kick API → KickStream

| Kick API Field | KickStream Field | Type | Source |
|----------------|-----------------|------|--------|
| id | kickId | string | API-RESEARCH.md lines 706-708 |
| user.username | username | string | API-RESEARCH.md lines 709-711 |
| title | title | string | API-RESEARCH.md lines 712-714 |
| category_id | categorySlug | string | API-RESEARCH.md lines 715-717 |
| tags | tags | string[] | API-RESEARCH.md lines 718-720 |
| language | language | string | API-RESEARCH.md lines 721-723 |
| thumbnail | thumbnailUrl | string \| null | API-RESEARCH.md lines 724-726 |
| created_at | startTime | Date | API-RESEARCH.md lines 727-729 |

**Platform-specific features:**
- totalTipsUsd (accumulated from tips events)

## YouTube Data API v3 → YouTubeStream

| YouTube API Field | YouTubeStream Field | Type | Source |
|-------------------|---------------------|------|--------|
| snippet.videoId | videoId | string | API-RESEARCH.md lines 889-891 |
| snippet.channelTitle | channelTitle | string | API-RESEARCH.md lines 892-894 |
| snippet.title | title | string | API-RESEARCH.md lines 895-897 |
| snippet.categoryId | categoryId | string | API-RESEARCH.md lines 898-900 |
| snippet.tags | tags | string[] | API-RESEARCH.md lines 901-903 |
| status.privacyStatus | privacyStatus | string | API-RESEARCH.md lines 904-906 |
| snippet.thumbnails.default.url | thumbnailUrl | string \| null | API-RESEARCH.md lines 907-909 |
| snippet.publishedAt | startTime | Date | API-RESEARCH.md lines 910-912 |

**Platform-specific features:**
- subscriberCount (accumulated from channel stats)
- superChatTotal (accumulated from SuperChat events)

## Unified Stream Fields

All platform-specific streams have these base fields:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| platform | 'twitch' \| 'kick' \| 'youtube' | Yes | Platform identifier |
| startTime | Date | Yes | Stream start time |
| endTime | Date \| null | No | Stream end time (null for live streams) |
| title | string | Yes | Stream title |
| tags | string[] | Yes | Array of stream tags |
| thumbnailUrl | string \| null | No | Stream thumbnail URL |

## Stream Matcher Fields

For use case: Historical stream reconstruction

| Field | Type | Source |
|-------|------|--------|
| commonId | string | Generated (UUID v4) |
| obsStartTime | Date | OBS WebSocket or earliest platform start time |
| obsEndTime | Date \| null | OBS WebSocket or latest platform end time |

## PlatformStreamRecord (Database Storage)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | Yes | Record ID (UUID v4) |
| commonId | string | Yes | Associated Stream commonId |
| platform | Platform | Yes | Platform identifier |
| data | PlatformStream | Yes | Complete platform stream data |
| createdAt | Date | Yes | Record creation timestamp |
