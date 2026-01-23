# Phase 7: Translator Layer

**Status**: ✅ COMPLETE

## Overview
Create translator functions that convert platform-specific raw types into adapter instances. Translators bridge the gap between API responses (via converters) and the adapter interface that consumers use.

## Current State Analysis
- **Completed**: Phases 1-6 (interfaces + adapters + converters)
- **Existing types**:
  - PlatformStream types (TwitchStream, KickStream, YouTubeStream)
  - PlatformUser types (TwitchUser, KickUser, YouTubeUser)
  - PlatformChatMessage types (with raw `any[]` badges/emotes)
  - PlatformEvent types
  - Adapter interfaces (StreamAdapter, UserAdapter, ChatMessageAdapter, EventAdapter)
  - Concrete adapter implementations (TwitchStreamAdapter, etc.)
- **Missing**: Factory functions to create adapter instances from platform types without manually importing and instantiating adapters

## Architecture Decisions

### Translator Function Pattern
```typescript
// Instead of manually:
import { TwitchStreamAdapter } from './adapters/TwitchStreamAdapter';
const stream = new TwitchStreamAdapter(twitchStream, cache);

// Use translator:
import { createStreamAdapter } from './translators/StreamTranslator';
const stream = createStreamAdapter(twitchStream, cache);
```

### Key Responsibilities
1. **Type narrowing**: Switch on `platform` field → instantiate correct adapter
2. **Dependency injection**: Accept optional CategoryCache (for future UI use)
3. **Validation**: Ensure required fields present before creating adapter
4. **Type safety**: Return correct adapter type based on platform input

### Badge and Emote Normalization (Critical)
Platform chat message types use `any[]` for badges/emotes. Translators MUST convert these to normalized types:

```typescript
// Platform type (raw)
TwitchChatMessage {
  badges: any[];  // [{ _id: 'broadcaster', _version: '1' }]
  emotes: any[];  // [{ _id: '123', _name: 'Kappa', positions: [[0,4]] }]
}

// Adapter expects normalized types
ChatMessageAdapter {
  getBadges(): Badge[];  // [{ id: 'broadcaster', name: 'Broadcaster', url: null, type: 'owner', version: '1' }]
  getEmotes(): Emote[];  // [{ id: '123', name: 'Kappa', url: null, positions: [[0,4]], type: 'twitch' }]
}
```

**Note**: Concrete adapters (TwitchChatMessageAdapter, etc.) already implement this normalization internally. Translators simply pass through to adapter constructors.

---

## Task Breakdown (16 tasks)

### Phase 1: Stream Translator (Tasks 1-4)

**Task 1**: Create StreamTranslator.ts file
- File: `shared/models/src/translators/StreamTranslator.ts`
- Import PlatformStream types from Stream.ts
- Import adapter implementations from adapters/
- Import CategoryCache interface (optional)
- Export `createStreamAdapter()` function with JSDoc

**Task 2**: Implement `createStreamAdapter()` function
```typescript
export function createStreamAdapter(
  platformStream: PlatformStream,
  cache?: CategoryCache
): StreamAdapter {
  switch (platformStream.platform) {
    case 'twitch':
      return new TwitchStreamAdapter(platformStream, cache);
    case 'kick':
      return new KickStreamAdapter(platformStream, cache);
    case 'youtube':
      return new YouTubeStreamAdapter(platformStream, cache);
  }
}
```
- Type narrowing on platform field
- Instantiate correct adapter class
- Pass through optional cache parameter
- Return StreamAdapter type

**Task 3**: Write StreamTranslator unit tests
- File: `shared/models/__tests__/translators/StreamTranslator.test.ts`
- Test for each platform (twitch, kick, youtube)
- Verify adapter type returned
- Verify cache passed through correctly
- Test TypeScript type narrowing

**Task 4**: Create `createStreamAdapterFromRaw()` helper
- Accept raw API response (object with platform field)
- Use existing converters (TwitchConverter, etc.) to normalize first
- Then call `createStreamAdapter()`
- Useful for direct API response → adapter conversion

### Phase 2: User Translator (Tasks 5-8)

**Task 5**: Create UserTranslator.ts file
- File: `shared/models/src/translators/UserTranslator.ts`
- Import PlatformUser types from User.ts
- Import adapter implementations
- Export `createUserAdapter()` function

**Task 6**: Implement `createUserAdapter()` function
```typescript
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
  }
}
```
- Type narrowing on platform field
- Instantiate correct adapter class
- Return UserAdapter type

**Task 7**: Write UserTranslator unit tests
- File: `shared/models/__tests__/translators/UserTranslator.test.ts`
- Test for each platform type
- Verify adapter type returned
- Test type safety

**Task 8**: Create `createUserAdapterFromRaw()` helper
- Accept raw API response object
- Use converters to normalize first
- Then call `createUserAdapter()`

### Phase 3: Chat Message Translator (Tasks 9-12)

**Task 9**: Create ChatMessageTranslator.ts file
- File: `shared/models/src/translators/ChatMessageTranslator.ts`
- Import PlatformChatMessage types from ChatMessage.ts
- Import adapter implementations
- Export `createChatMessageAdapter()` function

**Task 10**: Implement `createChatMessageAdapter()` function
```typescript
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
  }
}
```
- Type narrowing on platform field
- Instantiate correct adapter class
- Note: Adapters handle badge/emote normalization internally
- Return ChatMessageAdapter type

**Task 11**: Write ChatMessageTranslator unit tests
- File: `shared/models/__tests__/translators/ChatMessageTranslator.test.ts`
- Test for each platform type
- Test badge/emote normalization via adapter methods
- Test reply parent feature (Twitch)
- Test SuperChat feature (YouTube)

**Task 12**: Create `createChatMessageAdapterFromRaw()` helper
- Accept raw API response object
- Use converters to normalize first
- Then call `createChatMessageAdapter()`

### Phase 4: Event Translator (Tasks 13-16)

**Task 13**: Create EventTranslator.ts file
- File: `shared/models/src/translators/EventTranslator.ts`
- Import PlatformEvent types from Event.ts
- Import adapter implementations
- Export `createEventAdapter()` function

**Task 14**: Implement `createEventAdapter()` function
```typescript
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
  }
}
```
- Type narrowing on platform field
- Instantiate correct adapter class
- Return EventAdapter type

**Task 15**: Write EventTranslator unit tests
- File: `shared/models/__tests__/translators/EventTranslator.test.ts`
- Test for each platform type
- Test event type normalization
- Test feature data extraction

**Task 16**: Create `createEventAdapterFromRaw()` helper
- Accept raw API response object
- Use converters to normalize first
- Then call `createEventAdapter()`

### Phase 5: Barrel Export and PlatformStreamRecord Helper (Tasks 17-18)

**Task 17**: Create translators index file
- File: `shared/models/src/translators/index.ts`
- Export all translator functions
- Export all `*FromRaw()` helpers
```typescript
export { createStreamAdapter, createStreamAdapterFromRaw } from './StreamTranslator';
export { createUserAdapter, createUserAdapterFromRaw } from './UserTranslator';
export { createChatMessageAdapter, createChatMessageAdapterFromRaw } from './ChatMessageTranslator';
export { createEventAdapter, createEventAdapterFromRaw } from './EventTranslator';
```

**Task 18**: Create PlatformStreamRecord helper function
- File: `shared/models/src/translators/StreamTranslator.ts`
- Add helper function for creating PlatformStreamRecord objects
```typescript
export function createPlatformStreamRecord(
  commonId: string,
  platformStream: PlatformStream
): PlatformStreamRecord {
  return {
    id: crypto.randomUUID(),
    commonId,
    platform: platformStream.platform,
    data: platformStream,
    createdAt: new Date()
  };
}
```
- Import PlatformStreamRecord type from new stream module (to be created in Phase 11)
- Export from translators/index.ts
- Enables easy creation of database storage records from platform stream data

---

## Files to Create
- `shared/models/src/translators/StreamTranslator.ts` (~70 lines - added helper)
- `shared/models/src/translators/UserTranslator.ts` (~50 lines)
- `shared/models/src/translators/ChatMessageTranslator.ts` (~50 lines)
- `shared/models/src/translators/EventTranslator.ts` (~50 lines)
- `shared/models/src/translators/index.ts` (~8 lines - added helper export)
- `shared/models/__tests__/translators/StreamTranslator.test.ts` (~90 lines - added helper tests)
- `shared/models/__tests__/translators/UserTranslator.test.ts` (~60 lines)
- `shared/models/__tests__/translators/ChatMessageTranslator.test.ts` (~100 lines)
- `shared/models/__tests__/translators/EventTranslator.test.ts` (~80 lines)

## Files to Modify
- `shared/models/src/index.ts` (add translators export)

## Dependencies
- `PlatformStream`, `TwitchStream`, `KickStream`, `YouTubeStream` from `./Stream.ts`
- `PlatformUser`, `TwitchUser`, `KickUser`, `YouTubeUser` from `./User.ts`
- `PlatformChatMessage`, `TwitchChatMessage`, `KickChatMessage`, `YouTubeChatMessage` from `./ChatMessage.ts`
- `PlatformEvent`, `TwitchEvent`, `KickEvent`, `YouTubeEvent` from `./Event.ts`
- Adapter implementations from `./adapters/`
- `TwitchConverter`, `KickConverter`, `YouTubeConverter` from `./converters/`
- `CategoryCache` from `./cache/CategoryCache` (optional)
- `StreamAdapter`, `UserAdapter`, `ChatMessageAdapter`, `EventAdapter` from `./adapters/`

## Acceptance Criteria
- [x] All 4 translator files created with proper type narrowing
- [x] All `*FromRaw()` helpers implemented using converters
- [x] `createPlatformStreamRecord()` helper function created
- [x] All unit tests pass (134 tests total)
- [x] Badge/emote normalization verified via adapter tests
- [x] TypeScript compilation succeeds (no type errors)
- [x] Barrel export in translators/index.ts
- [x] Exported from shared/models/src/index.ts

## Implementation Notes

### Additional Adapters Created (Not in Original Plan)
As part of implementing Phase 7, we needed to create the following adapters that were previously missing:

1. **TwitchChatMessageAdapter** - Handles Twitch badge/emote normalization
2. **KickChatMessageAdapter** - Handles Kick badge/emote normalization
3. **YouTubeChatMessageAdapter** - Handles YouTube SuperChat support
4. **TwitchEventAdapter** - Maps TwitchEventType to unified EventType
5. **KickEventAdapter** - Maps KickEventType to unified EventType
6. **YouTubeEventAdapter** - Maps YouTubeEventType to unified EventType

### Converter Extensions Added
To support the new adapters, we extended existing converters:

- **TwitchConverter**: Added `convertChatMessage()` and `convertEvent()` methods
- **KickConverter**: Added `convertChatMessage()` and `convertEvent()` methods
- **YouTubeConverter**: Added `convertChatMessage()` and `convertEvent()` methods

### Type Safety Fixes
Fixed import/export issues with enum types:
- `TwitchEventType`, `KickEventType`, `YouTubeEventType` are now properly accessible

### Test Results
All 134 tests passing (including 47 new translator tests)

## Notes

### Badge/Emote Normalization
- Adapters implement normalization internally (already done in Phases 5-6)
- Translators don't need to handle this - just pass to adapter constructors
- Tests should verify adapter methods return normalized Badge[] and Emote[]

### CategoryCache Parameter
- Optional parameter for `createStreamAdapter()`
- Passed through to adapter constructors
- Currently unused (no DB cache), but kept for future UI integration
- If null/undefined, adapters just return categoryId directly

### Why Both Translator and `*FromRaw()` Helpers?
- **Translator**: Accepts already-normalized PlatformStream type (from converters)
- **`*FromRaw()` Helper**: Accepts raw API response → convert → translate
- Enables flexibility: consumer can call converter manually, or use helper for one-liner

### Type Safety
- TypeScript narrowing on `platform` field ensures correct adapter instantiation
- Return types are union of all adapter implementations (StreamAdapter interface)
- Compile-time type checking prevents passing wrong platform type to wrong adapter

### Testing Strategy
- Test each translator function with all three platform types
- Verify return type is correct adapter instance
- Verify adapter methods work (getPlatform(), getId(), etc.)
- For `*FromRaw()` helpers: test with mock API responses

## Integration with Other Phases
- **Phase 9 (Stream Matcher)**: Uses translators to create adapters for matched streams
- **Phase 12 (Integration Tests)**: Tests translator + adapter + converter chain
- **Platform Strategies**: (future) Use translators to normalize API responses

## Estimated Effort
6-8 hours (18 tasks, ~498 lines of code + tests)
