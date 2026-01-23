# Phase Plan - Status: Complete ✅
# Phase 12: Integration Tests

## Overview
End-to-end integration testing for the Shared Data Models feature. Tests validate that all components work together: API responses → converters → translators → adapters → matchers → OBS integration.

## Current State Analysis
- **Completed**: Phases 1-7, 9, 11 (implementation)
- **Unit tests**: 87 tests passing (converters, adapters, types)
- **Missing**: Integration tests that verify complete flows and component interactions

## Coverage Targets
- **Overall coverage**: 95%+ for adapters/translators/matchers
- **Critical paths**: 100% coverage for stream matching, OBS integration
- **Edge cases**: At least 1 test per known edge case

---

## Task Breakdown (18 tasks)

### Phase 1: Adapter Integration Tests (Tasks 1-4)

**Task 1**: Create adapter integration test file
- File: `shared/models/__tests__/integration/adapters.test.ts`
- Import all translators, converters, adapter interfaces

**Task 2**: Test platform adapter creation chain
```typescript
// Test: Twitch API response → converter → translator → adapter
const twitchApiData = {
  id: '123456789',
  user_name: 'testuser',
  title: 'Test Stream',
  game_id: '509658',
  tags: ['tag1', 'tag2'],
  // ... other Twitch fields
};

const twitchStream = TwitchConverter.convertFromAPI(twitchApiData);
const adapter = createStreamAdapter(twitchStream);

assert.strictEqual(adapter.getPlatform(), 'twitch');
assert.strictEqual(adapter.getId(), '123456789');
assert.strictEqual(adapter.getTitle(), 'Test Stream');
```
- Test for all platforms (Twitch, Kick, YouTube)
- Test StreamAdapter, UserAdapter, ChatMessageAdapter, EventAdapter

**Task 3**: Test dynamic feature access across platforms
```typescript
// Test: Twitch channel points feature
const twitchAdapter = createStreamAdapter(twitchStream);
const points = twitchAdapter.getFeature('twitchChannelPoints');
assert.ok(points !== null);
assert.strictEqual(points.current, 500);

// Test: Feature not available on other platforms
const kickAdapter = createStreamAdapter(kickStream);
const pointsOnKick = kickAdapter.getFeature('twitchChannelPoints');
assert.strictEqual(pointsOnKick, null);

// Test: Kick tips feature
const tips = kickAdapter.getFeature('kickTips');
assert.ok(tips !== null);
```

**Task 4**: Test Badge and Emote normalization (Critical)
```typescript
// Test: Twitch raw badges → normalized Badge[]
const twitchChat = {
  platform: 'twitch',
  badges: [{ _id: 'broadcaster', _version: '1' }],
  emotes: [{ _id: '123', _name: 'Kappa', positions: [[0, 4]] }],
  // ... other fields
};

const adapter = createChatMessageAdapter(twitchChat);
 const badges = adapter.getBadges();

assert.strictEqual(badges.length, 1);
assert.strictEqual(badges[0].id, 'broadcaster');
assert.strictEqual(badges[0].name, 'Broadcaster');
assert.strictEqual(badges[0].type, BadgeType.Owner);
assert.strictEqual(badges[0].version, '1');

const emotes = adapter.getEmotes();
assert.strictEqual(emotes.length, 1);
assert.strictEqual(emotes[0].id, '123');
assert.strictEqual(emotes[0].name, 'Kappa');
assert.strictEqual(emotes[0].type, EmoteType.Twitch);
assert.deepStrictEqual(emotes[0].positions, [[0, 4]]);
```
- Test for all platform badge/emote types
- Test edge cases: empty arrays, null values, missing fields

### Phase 2: Stream Matcher Integration (Tasks 5-7)

**Task 5**: Create stream matcher integration test file
- File: `shared/models/__tests__/integration/stream-matcher.test.ts`
- Import StreamMatcher, converters

**Task 6**: Test API response → Stream matching chain
```typescript
// Simulate fetching historical streams from multiple platform APIs
const twitchApiData = [/* array of Twitch API responses */];
const kickApiData = [/* array of Kick API responses */];

// Convert to platform types
const twitchStreams = twitchApiData.map(data => TwitchConverter.convertFromAPI(data));
const kickStreams = kickApiData.map(data => KickConverter.convertFromAPI(data));

// Match streams
const matcher = createStreamMatcher();
const matchedStreams = matcher.matchStreams(
  twitchStreams,
  kickStreams,
  [],
  'userId123'
);

// Verify matching worked
assert.ok(matchedStreams.length > 0);
assert.ok(matchedStreams[0].streams.has('twitch'));
assert.ok(matchedStreams[0].streams.has('kick'));
assert.ok(crypto.validateV4UUID(matchedStreams[0].commonId));
```

**Task 7**: Test matcher edge cases
```typescript
// Test: No overlap → separate Stream objects
const twitchStream1 = createTwitchStream({ start: '14:00', end: '16:00' });
const kickStream1 = createKickStream({ start: '18:00', end: '20:00' });

const noOverlap = matcher.matchStreams(
  [twitchStream1],
  [kickStream1],
  [],
  'userId'
);

assert.strictEqual(noOverlap.length, 2);  // Two separate streams

// Test: Simultaneous three-platform streaming
const twitch = createTwitchStream({ start: '14:00', end: '16:00' });
const kick = createKickStream({ start: '14:05', end: '16:35' });
const youtube = createYouTubeStream({ start: '13:55', end: '16:40' });

const threeWay = matcher.matchStreams([twitch], [kick], [youtube], 'userId');

assert.strictEqual(threeWay.length, 1);
assert.strictEqual(threeWay[0].streams.size, 3);  // All three platforms
```

### Phase 3: OBS WebSocket Integration Tests (Tasks 8-10)

**Task 8**: Create OBS integration test file
- File: `shared/models/__tests__/integration/obs-websocket.test.ts`
- Mock ws module for integration testing

**Task 9**: Test OBS → ObsStreamDetector → Stream creation lifecycle
```typescript
// Mock WebSocket client
const mockWs = createMockWebSocket();
const client = new ObsWebSocketClient();
client.setUnderlyingSocket(mockWs);  // Test helper to inject mock

const streamStartCallback = vi.fn();
const streamStopCallback = vi.fn();

const detector = new ObsStreamDetector(client, {
  onStreamStart: streamStartCallback,
  onStreamStop: streamStopCallback
});

// Simulate OBS connection flow
mock.emit('open');
await waitFor(() => client.isConnected());  // Wait for Hello/Identify

// Simulate stream start event
mock.emit('message', JSON.stringify({
  op: 5,  // Event
  d: {
    eventType: 'StreamStateChanged',
    eventData: {
      outputActive: true,
      outputState: 'OBS_WEBSOCKET_OUTPUT_STARTED'
    }
  }
}));

// Verify callback fired
await waitFor(() => streamStartCallback.mock.calls.length > 0);
const startTime = streamStartCallback.mock.calls[0][0];
assert.ok(startTime instanceof Date);

// Verify detector status
const status = detector.getStatus();
assert.strictEqual(status.isStreaming, true);
assert.strictEqual(status.state, 'live');
assert.deepStrictEqual(status.startTime, startTime);

// Simulate stream stop event
mock.emit('message', JSON.stringify({
  op: 5,
  d: {
    eventType: 'StreamStateChanged',
    eventData: {
      outputActive: false,
      outputState: 'OBS_WEBSOCKET_OUTPUT_STOPPED'
    }
  }
}));

await waitFor(() => streamStopCallback.mock.calls.length > 0);
```

**Task 10**: Test OBS reconnection scenario
```typescript
const reconnectingCallback = vi.fn();
const reconnectedCallback = vi.fn();

const detector = new ObsStreamDetector(client, {
  onStreamReconnecting: reconnectingCallback,
  onStreamReconnected: reconnectedCallback
});

// Start stream
await simulateStreamStart();
assert.strictEqual(detector.getStatus().state, 'live');

// Simulate network issue → reconnecting
mock.emit('message', JSON.stringify({
  op: 5,
  d: {
    eventType: 'StreamStateChanged',
    eventData: {
      outputActive: true,
      outputState: 'OBS_WEBSOCKET_OUTPUT_RECONNECTING'
    }
  }
}));

await waitFor(() => reconnectingCallback.mock.calls.length > 0);
assert.strictEqual(detector.getStatus().state, 'reconnecting');

// Reconnect
mock.emit('message', JSON.stringify({
  op: 5,
  d: {
    eventType: 'StreamStateChanged',
    eventData: {
      outputActive: true,
      outputState: 'OBS_WEBSOCKET_OUTPUT_RECONNECTED'
    }
  }
}));

await waitFor(() => reconnectedCallback.mock.calls.length > 0);
assert.strictEqual(detector.getStatus().state, 'live');
```

### Phase 4: End-to-End Integration Test (Tasks 11-14)

**Task 11**: Create complete flow integration test
- File: `shared/models/__tests__/integration/e2e.test.ts`
- Test complete chain: OBS start → platform stream detection → matching → adapter usage

**Task 12**: Test multi-platform session lifecycle
```typescript
// Scenario: OBS starts → Twitch goes live → Kick goes live → Kick ends → Twitch ends → OBS stops
const detector = new ObsStreamDetector(mockObsClient);
const sessions: Stream[] = [];

detector.onStreamStart = (obsStartTime) => {
  // Create new Stream session when OBS starts
  sessions.push({
    commonId: crypto.randomUUID(),
    obsStartTime,
    obsEndTime: null,
    streams: new Map()
  });
};

// Simulate OBS stream start
await simulateObsStreamStart();
assert.strictEqual(sessions.length, 1);

// Simulate Twitch going live
const twitchStream = createTwitchStream({ /* ... */ });
const twitchAdapter = createStreamAdapter(twitchStream);
sessions[0].streams.set('twitch', twitchAdapter);

// Simulate Kick going live 5 min later
const kickStream = createKickStream({ /* ... */ });
const kickAdapter = createStreamAdapter(kickStream);
sessions[0].streams.set('kick', kickAdapter);

// Verify both platforms in same Stream session
assert.strictEqual(sessions[0].streams.size, 2);
assert.strictEqual(sessions[0].streams.has('twitch'), true);
assert.strictEqual(sessions[0].streams.has('kick'), true);

// Simulate Kick stopping
sessions[0].streams.delete('kick');

// Simulate Twitch stopping, then OBS stopping
sessions[0].streams.delete('twitch');
await simulateObsStreamStop();
sessions[0].obsEndTime = new Date();

// Verify session is complete
assert.ok(sessions[0].obsEndTime !== null);
assert.strictEqual(sessions[0].streams.size, 0);
```

**Task 13**: Test historical stream reconstruction
```typescript
// Scenario: User fetches past streams from Twitch and Kick APIs
const twitchHistory = [
  createTwitchStream({ start: '2024-01-01T14:00:00Z', end: '2024-01-01T16:00:00Z' }),
  createTwitchStream({ start: '2024-01-02T14:00:00Z', end: '2024-01-02T16:00:00Z' })
];

const kickHistory = [
  createKickStream({ start: '2024-01-01T13:55:00Z', end: '2024-01-01T16:05:00Z' }),  // Overlaps with first Twitch stream
  createKickStream({ start: '2024-01-02T18:00:00Z', end: '2024-01-02T20:00:00Z' })  // No overlap
];

// Match streams
const matcher = createStreamMatcher();
const sessions = matcher.matchStreams(
  twitchHistory,
  kickHistory,
  [],
  'streamerUserId'
);

// Verify matching results
assert.strictEqual(sessions.length, 3);

// Session 1: Twitch (2024-01-01T14:00-16:00) + Kick (2024-01-01T13:55-16:05)
assert.strictEqual(sessions[0].streams.size, 2);
assert.ok(sessions[0].streams.has('twitch'));
assert.ok(sessions[0].streams.has('kick'));

// Session 2: Twitch only (2024-01-02T14:00-16:00) - no Kick overlap
assert.strictEqual(sessions[1].streams.size, 1);
assert.ok(sessions[1].streams.has('twitch'));

// Session 3: Kick only (2024-01-02T18:00-20:00) - no Twitch overlap
assert.strictEqual(sessions[2].streams.size, 1);
assert.ok(sessions[2].streams.has('kick'));
```

**Task 14**: Test error handling and edge cases
```typescript
// Test: Invalid platform type in translator
assert.throws(() => {
  createStreamAdapter({ platform: 'invalid' } as any);
}, /Unknown platform/);

// Test: Empty stream lists in matcher
const sessions = matcher.matchStreams([], [], [], 'userId');
assert.deepStrictEqual(sessions, []);

// Test: Single stream only
const single = matcher.matchStreams(
  [createTwitchStream({ start: '14:00', end: '16:00' })],
  [],
  [],
  'userId'
);
assert.strictEqual(single.length, 1);
assert.strictEqual(single[0].streams.size, 1);

// Test: Active streams (no end time)
const activeStream = createTwitchStream({ start: '14:00', end: null });
const activeSessions = matcher.matchStreams([activeStream], [], [], 'userId');
assert.strictEqual(activeSessions[0].obsEndTime, null);
```

### Phase 5: Test Coverage Analysis (Tasks 15-18)

**Task 15**: Run coverage report
- Command: `npm run test:coverage`
- Verify coverage thresholds met:
  - `shared/models/src/converters/`: 95%+
  - `shared/models/src/adapters/`: 95%+
  - `shared/models/src/translators/`: 95%+
  - `shared/models/src/matchers/`: 95%+
  - `shared/models/src/obs/`: 90%+ (ws mocking reduces coverage slightly)

**Task 16**: Address coverage gaps
- Review uncovered lines in coverage report
- Add tests for uncovered edge cases
- Focus on error handling paths (try-catch blocks, validation)

**Task 17**: Performance tests (optional, not required for coverage)
```typescript
describe('Performance Tests', () => {
  test('Stream matcher handles 1000 streams efficiently', () => {
    const streams = createManyStreams(1000);
    const start = Date.now();
    const sessions = matcher.matchStreams(streams.twitch, streams.kick, [], 'userId');
    const elapsed = Date.now() - start;

    assert.ok(elapsed < 1000);  // Should complete in < 1 second
    assert.ok(sessions.length > 0);
  });
});
```

**Task 18**: Create integration test documentation
- File: `shared/models/__tests__/README.md`
- Document how to run integration tests
- Document manual testing checklist (connect to real OBS, etc.)
- Document mock data sources (API samples from research docs)

---

## Files to Create
- `shared/models/__tests__/integration/adapters.test.ts` (~200 lines)
- `shared/models/__tests__/integration/stream-matcher.test.ts` (~150 lines)
- `shared/models/__tests__/integration/obs-websocket.test.ts` (~250 lines)
- `shared/models/__tests__/integration/e2e.test.ts` (~300 lines)
- `shared/models/__tests__/integration/performance.test.ts` (~50 lines)
- `shared/models/__tests__/README.md` (~100 lines)
- `shared/models/__tests__/test-helpers.ts` (~100 lines) - shared mock data factories

## Files to Modify
- `shared/models/package.json` (add test:cover:json or similar scripts if needed)

## Dependencies
- Existing: vitest, @vitest/coverage-v8
- All implemented phases (converters, translators, adapters, matchers, obs)

## Acceptance Criteria
- All integration tests pass (30-40 tests total)
- Coverage report shows 95%+ for adapters/translators/matchers
- No uncovered critical paths (error handling, edge cases)
- All documented edge cases have test coverage
- Performance tests complete in < 1s for 1000 streams
- Manual testing checklist documented
- ESLint passes with no errors
- TypeScript compilation succeeds

## Notes

### Integration vs Unit Tests
- **Unit tests**: Test individual functions/classes in isolation
- **Integration tests**: Test complete flows across multiple modules
- We now have both: unit tests (Phases 1-6, 7, 9, 11 unit test tasks) + integration tests (this phase)

### Mock Data Strategy
- Use real API response samples from research docs where possible
- Create mock data factories in `test-helpers.ts` for reusability
- Mock ws module for OBS tests (don't require actual OBS running)

### Test Helper Examples
```typescript
// test-helpers.ts
export function createTwitchStream(overrides: Partial<TwitchStream> = {}): TwitchStream {
  return {
    platform: 'twitch',
    twitchId: '123456',
    username: 'testuser',
    title: 'Test Stream',
    categoryId: '509658',
    tags: [],
    isMature: false,
    language: 'en',
    thumbnailUrl: null,
    channelPoints: 0,
    ...overrides
  };
}

function createMockWebSocket() {
  const callbacks: Record<string, Array<(data: any) => void>> = {};

  return {
    on(event: string, callback: (data: any) => void) {
      callbacks[event] = callbacks[event] || [];
      callbacks[event].push(callback);
    },
    emit(event: string, data: any) {
      const handlers = callbacks[event];
      if (handlers) {
        handlers.forEach(h => h(data));
      }
    },
    // ... other mock methods
  };
}
```

### Coverage Gaps to Watch For
- Error handling: try-catch blocks, validation failures
- Edge cases: null values, empty arrays, missing fields
- Platform-specific features: Badge/Emote normalization, SuperChat, bits
- State machine transitions: OBS reconnecting, partial overlap matching

### Running Tests
```bash
# Run all tests
npm test

# Run integration tests only
npm test -- --run integration

# Run with coverage
npm run test:coverage

# Watch mode
npm test -- --watch
```

### Manual Testing (Optional)
- Connect to real OBS instance with ObsStreamDetector
- Start/stop OBS stream and verify callbacks fire
- Monitor state transitions in logs
- Test with actual stream (viewer count, duration, etc.)
- Not required for phase completion, but recommended for confidence

## Integration with Other Phases
- **Phase 1-7, 9, 11**: All phases must be complete before integration tests can run
- **Phase 13 (Documentation)**: Document test coverage and manual testing procedures
- **Platform Strategies (future)**: Use integration tests as examples for platform-specific integration

## Estimated Effort
8-10 hours (18 tasks, ~1150 lines of code + documentation)
