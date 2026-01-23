# Phase 5: Adapter Interfaces - ARCHIVED ✅

**Status**: Complete ✅
**Completion Date**: During initial phases 1-6 batch

## Overview
Define adapter interfaces (StreamAdapter, UserAdapter, ChatMessageAdapter, EventAdapter) that normalize platform-specific data and hide platform complexity from downstream code.

---

## Completed Tasks

### Task 1: Created FeatureData type
```typescript
export type FeatureData =
  | { current: number }        // Counter: channel points, tips
  | { total: number }          // Total: subscriber count
  | { value: number;
      currency: string;
      normalizedMicros?: number
    }                          // Monetary: SuperChat
  | { count: number; tier?: number }  // Sub gifts
  | object;                    // Other platform-specific features
```
- File: `shared/models/src/interface.ts`
- Enables dynamic feature access without breaking changes

### Task 2: Created Badge, Emote, BadgeType, EmoteType enums
```typescript
export interface Badge {
  id: string;
  name: string;
  url: string | null;
  type: BadgeType;
  version?: string;
}

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

export interface Emote {
  id: string;
  name: string;
  url: string | null;
  positions: [number, number][];
  type?: EmoteType;
}

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

### Task 3: Created StreamAdapter interface
```typescript
export interface StreamAdapter {
  // Core static metadata (common to all platforms)
  getPlatform(): 'twitch' | 'kick' | 'youtube';
  getId(): string;
  getTitle(): string;
  getCategory(): Promise<string>;  // Async for future cache
  getThumbnail(): string | null;
  getTags(): string[];

  // Platform-specific features - DYNAMIC access
  hasFeature(feature: string): boolean;
  getFeature(feature: 'twitchChannelPoints' | 'kickTips' | 'youtubeSuperChat' | 'subscriberCount' | string): FeatureData | null;

  // Serialization
  toStorage(): object;
}
```

### Task 4: Created UserAdapter interface
```typescript
export interface UserAdapter {
  getPlatform(): 'twitch' | 'kick' | 'youtube';
  getId(): string;
  getUsername(): string;
  getDisplayName(): string;
  getAvatar(): string | null;
  getBio(): string | null;
  getCreatedAt(): Date | null;

  hasFeature(feature: string): boolean;
  getFeature(feature: string): FeatureData | null;

  toStorage(): object;
}
```

### Task 5: Created ChatMessageAdapter interface
```typescript
export interface ChatMessageAdapter {
  getPlatform(): 'twitch' | 'kick' | 'youtube';
  getId(): string;
  getUserId(): string;
  getUsername(): string;
  getDisplayName(): string;
  getColor(): string | null;
  getMessage(): string;
  getTimestamp(): Date;
  getRoomId(): string;

  // Normalized badges/emotes (converted from any[])
  getBadges(): Badge[];
  getEmotes(): Emote[];

  hasReplyParent(): boolean;
  getFeature(feature: 'bits' | 'superChat' | 'tip' | string): FeatureData | null;
  toStorage(): object;
}
```

### Task 6: Created EventAdapter interface
```typescript
export interface EventAdapter {
  getPlatform(): 'twitch' | 'kick' | 'youtube';
  getId(): string;
  getType(): EventType;
  getTimestamp(): Date;
  getUserId(): string | null;
  getUsername(): string | null;
  getDisplayName(): string | null;

  getData(): EventData;
  toStorage(): object;
}

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
```

### Task 7: Created adapter barrel export
```typescript
export * from './StreamAdapter';
export * from './UserAdapter';
export * from './ChatMessageAdapter';
export * from './EventAdapter';
```

---

## Files Created
- `shared/models/src/interface.ts` (FeatureData, Badge, Emote types)
- `shared/models/src/adapters/StreamAdapter.ts`
- `shared/models/src/adapters/UserAdapter.ts`
- `shared/models/src/adapters/ChatMessageAdapter.ts`
- `shared/models/src/adapters/EventAdapter.ts`
- `shared/models/src/adapters/index.ts`

---

## Tests Written
- Interface type checking (Vitest ensures implementations match)
- No unit tests for interfaces (only implementations in Phase 6)

---

## Notes

### Why getCategory() is async?
Future enhancement: Category cache lookup:
```typescript
async getCategory(): Promise<string> {
  const cache = this.cache;  // Injected CategoryCache
  return cache.getCategory(this.stream.categoryId, this.stream.platform);
}
```

Current implementation: Returns categoryId directly (synchronous).

### Dynamic Feature Access Pattern
Check feature availability:
```typescript
if (adapter.hasFeature('twitchChannelPoints')) {
  const points = adapter.getFeature('twitchChannelPoints');
  // points is FeatureData, TypeScript knows it's { current: number }
  console.log(points.current);
}
```

Benefits:
- No compile-time knowledge of all platform features needed
- Add new platform features without breaking adapter interface
- Type-safe feature data access

### Why Use Enums for BadgeType/EmoteType?
Enums provide clear naming:
```typescript
// Without enum (magic strings)
badge.type = 'moderator';  // What are all valid types?

// With enum (IDE autocomplete)
badge.type = BadgeType.Moderator;  // See all options
```

### Badge/Emote Normalization Strategy
Raw platform data uses `any[]`:
```typescript
TwitchChatMessage {
  badges: any[];  // [{ _id: 'broadcaster', _version: '1' }]
}
```

Adapters convert to normalized types:
```typescript
ChatMessageAdapter {
  getBadges(): Badge[];  // [{ id: 'broadcaster', name: 'Broadcaster', type: 'owner', version: '1' }]
}
```

Phase 7 (Translator Layer): Translators pass platform types to adapter constructors. Adapters handle normalization internally.

---

## Acceptance Criteria Met
- ✅ All 4 adapter interfaces defined
- ✅ FeatureData type supports all platform features
- ✅ Badge and Emote types with enums
- ✅ EventType union defined
- ✅ TypeScript compilation succeeds
- ✅ All methods documented with JSDoc

---

## Integration with Other Phases
- **Phase 4**: Converters create platform types
- **Phase 6**: Concrete adapter implementations will implement these interfaces
- **Phase 7**: Translators will return adapter instances

---

## Usage Examples

### Display stream info without knowing platform
```typescript
function displayStream(adapter: StreamAdapter) {
  console.log(`${adapter.getPlatform()}: ${adapter.getTitle()}`);
  console.log(`Category: ${await adapter.getCategory()}`);

  // Platform-specific features (no switching!)
  if (adapter.hasFeature('twitchChannelPoints')) {
    const points = adapter.getFeature('twitchChannelPoints');
    console.log(`Points: ${points!.current}`);
  }

  if (adapter.hasFeature('kickTips')) {
    const tips = adapter.getFeature('kickTips');
    console.log(`Tips: $${tips!.value}`);
  }
}
```

### Chat message rendering
```typescript
function renderChatMessage(adapter: ChatMessageAdapter) {
  const badges = adapter.getBadges().map(b => {
    const icon = b.url ? `<img src="${b.url}">` : b.name;
    return `<span class="badge ${b.type}">${icon}</span>`;
  }).join('');

  const emotes = adapter.getEmotes().map(e => {
    const icon = e.url ? `<img src="${e.url}">` : e.name;
    return icon;
  });

  const message = adapter.getMessage();
  // Replace emote positions with icons...

  return `<div class="message">${badges} ${message}</div>`;
}
```
