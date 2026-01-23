# Phase 11: OBS WebSocket Integration

## Overview
Build a two-layer OBS WebSocket integration:
1. **ObsWebSocketClient**: Thin wrapper around `ws` library for connection, authentication, and message handling
2. **ObsStreamDetector**: Service layer with state machine that manages stream lifecycle and emits callbacks

This follows the research in @docs/research/obs-websocket-protocol.md.

## Current State Analysis
- **Completed**: Phase 10 (User Matcher - determined infeasible, removed)
- **Existing**: No OBS code yet
- **Research**: Complete OBS WebSocket protocol documentation (901 lines)
- **Decision**: Use `ws` library (not obs-websocket-js), build custom thin wrapper + service layer

## Architecture Decisions

### Two-Layer Design
```
ws library (external npm package)
    ↓
ObsWebSocketClient (Layer 1: Thin Wrapper)
    - Connection management
    - Authentication flow (Hello → Identify → Identified)
    - Raw message parsing
    - Request/response handling
    ↓
ObsStreamDetector (Layer 2: Service Layer)
    - State machine (offline → starting → live → stopping → reconnecting)
    - Stream lifecycle callbacks
    - Stream status polling
    - Higher-level stream detection logic
```

### Dependencies to Add
```json
{
  "devDependencies": {
    "ws": "^8.16.0",
    "@types/ws": "^8.5.10"
  }
}
```

### Type Definitions
Shared OBS message types from protocol research:
- `OpCode` enum (0=Hello, 1=Identify, 2=Identified, 5=Event, 6=Request, 7=Response)
- `ObsRequest` / `ObsResponse` interfaces
- `ObsStreamStatus` interface
- `ObsOutputState` enum
- `StreamStateChanged` event data

---

## Task Breakdown (27 tasks)

### Phase 1: Type Definitions (Tasks 1-7)

**Task 1**: Create obs/types.ts file
- File: `shared/models/src/obs/types.ts`
- Define all OBS message types from protocol research
```typescript
export enum OpCode {
  Hello = 0,
  Identify = 1,
  Identified = 2,
  Event = 5,
  Request = 6,
  RequestResponse = 7
}

export enum ObsOutputState {
  Unknown = 'OBS_WEBSOCKET_OUTPUT_UNKNOWN',
  Starting = 'OBS_WEBSOCKET_OUTPUT_STARTING',
  Started = 'OBS_WEBSOCKET_OUTPUT_STARTED',
  Stopping = 'OBS_WEBSOCKET_OUTPUT_STOPPING',
  Stopped = 'OBS_WEBSOCKET_OUTPUT_STOPPED',
  Reconnecting = 'OBS_WEBSOCKET_OUTPUT_RECONNECTING',
  Reconnected = 'OBS_WEBSOCKET_OUTPUT_RECONNECTED',
  Paused = 'OBS_WEBSOCKET_OUTPUT_PAUSED',
  Resumed = 'OBS_WEBSOCKET_OUTPUT_RESUMED'
}

export interface ObsHelloMessage {
  op: OpCode.Hello;
  d: {
    obsWebSocketVersion: string;
    rpcVersion: number;
    authentication?: {
      salt: string;
      challenge: string;
    };
  };
}

export interface ObsIdentifyMessage {
  op: OpCode.Identify;
  d: {
    rpcVersion: number;
    authentication?: string;
    eventSubscriptions?: number;
  };
}

export interface ObsIdentifiedMessage {
  op: OpCode.Identified;
  d: {
 NEGOTIATED_RPC_VERSION: number; // Note: actual field name has underscore
  };
}

export interface ObsRequestMessage {
  op: OpCode.Request;
  d: {
    requestType: string;
    requestId: string;
    requestData?: any;
  };
}

export interface ObsResponseMessage {
  op: OpCode.RequestResponse;
  d: {
    requestType: string;
    requestId: string;
    requestStatus: {
      result: boolean;
      code: number;
      comment?: string;
    };
    responseData?: any;
  };
}

export interface ObsEventMessage {
  op: OpCode.Event;
  d: {
    eventType: string;
    eventIntent: number;
    eventData: any;
  };
}

export interface ObsStreamStatus {
  outputActive: boolean;
  outputReconnecting: boolean;
  outputTimecode: string;
  outputDuration: number;  // milliseconds
  outputCongestion: number;  // 0-1
  outputBytes: number;
  outputSkippedFrames: number;
  outputTotalFrames: number;
}

export interface ObsStreamStateChangedEvent {
  outputActive: boolean;
  outputState: ObsOutputState;
}

export type ObsMessage =
  | ObsHelloMessage
  | ObsIdentifyMessage
  | ObsIdentifiedMessage
  | ObsRequestMessage
  | ObsResponseMessage
  | ObsEventMessage;
```

**Task 3**: Create stream/ directory and core stream types
- Create `shared/models/src/stream/` directory
- Create `shared/models/src/stream/StreamData.ts` - Database DTO:
```typescript
export interface StreamData {
  commonId: string;
  obsStartTime: Date;
  obsEndTime: Date | null;
  createdAt: Date;
}
```
- Create `shared/models/src/stream/PlatformStreamRecord.ts`:
```typescript
export interface PlatformStreamRecord {
  id: string;
  commonId: string;
  platform: Platform;
  data: PlatformStream;
  createdAt: Date;
}
```

**Task 4**: Create StreamService interface
- Create `shared/models/src/stream/StreamService.ts`:
```typescript
export interface StreamService {
  // Stream CRUD
  createStream(commonId: string, obsStartTime: Date): Promise<Stream>;
  getStream(commonId: string): Promise<Stream>;
  updateStreamEnd(commonId: string, obsEndTime: Date): Promise<void>;
  deleteStream(commonId: string): Promise<void>;

  // Platform streams
  createPlatformStream(commonId: string, platformStream: PlatformStream): Promise<PlatformStreamRecord>;
  getPlatformStreams(commonId: string): Promise<PlatformStreamRecord[]>;
  removePlatformFromStream(commonId: string, platform: Platform): Promise<void>;

  // Stream with platforms
  getStreamWithPlatforms(commonId: string): Promise<Stream>;
}
```

**Task 5**: Create Stream class with lazy loading
- Create `shared/models/src/stream/Stream.ts`:
```typescript
export class Stream {
  private data: StreamData;
  private service: StreamService;
  private cachedPlatforms: Map<Platform, StreamAdapter> | null = null;

  constructor(commonId: string, obsStartTime: Date) {
    this.data = {
      commonId,
      obsStartTime,
      obsEndTime: null,
      createdAt: new Date()
    };
  }

  getCommonId(): string { return this.data.commonId; }
  getObsStartTime(): Date { return this.data.obsStartTime; }

  getObsEndTime(): Date | null {
    return this.data.obsEndTime;
  }

  setObsEndTime(endTime: Date): void {
    this.data.obsEndTime = endTime;
  }

  async getPlatforms(): Promise<Map<Platform, StreamAdapter>> {
    if (this.cachedPlatforms === null) {
      const records = await this.service.getPlatformStreams(this.data.commonId);
      const map = new Map<Platform, StreamAdapter>();

      for (const record of records) {
        const adapter = createStreamAdapter(record.data);
        map.set(record.platform, adapter);
      }

      this.cachedPlatforms = map;
    }

    return this.cachedPlatforms;
  }
}
```

**Task 7**: Create obs/interface.ts for exports
- Create `shared/models/src/stream/index.ts`:
```typescript
export * from './StreamData';
export * from './PlatformStreamRecord';
export * from './Stream';
export * from './StreamService';
```

**Task 8**: Create obs/interface.ts for exports
```typescript
export interface ObsWebSocketClient {
  connect(url: string, password?: string): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;

  on(event: 'connected', handler: () => void): void;
  on(event: 'disconnected', handler: () => void);
  on(event: 'error', handler: (error: Error) => void): void;
  on(event: 'StreamStateChanged', handler: (event: ObsStreamStateChangedEvent) => void): void;
  on(event: 'message', handler: (message: ObsMessage) => void): void;

  send(request: ObsRequestMessage): Promise<ObsResponseMessage>;
  getStreamStatus(): Promise<ObsStreamStatus>;
}

export type StreamState = 'offline' | 'starting' | 'live' | 'stopping' | 'reconnecting';

export interface StreamDetectorCallbacks {
  onStreamStart?: (stream: Stream) => void;
  onStreamStop?: (stream: Stream, endTime: Date) => void;
  onStreamReconnecting?: () => void;
  onStreamReconnected?: () => void;
  onStreamStarting?: () => void;
  onStreamStopping?: () => void;
}

export type ObsWebSocketEvent =
  | 'connected'
  | 'disconnected'
  | 'error'
  | 'StreamStateChanged'
  | 'message';
```

**Task 3**: Create obs/index.ts barrel export
- Export all types, interfaces, classes
```typescript
export * from './types';
export * from './interface';
export * from './ObsWebSocketClient';
export * from './ObsStreamDetector';
```

### Phase 2: ObsWebSocketClient Implementation (Tasks 8-14)

**Task 9**: Create ObsWebSocketClient.ts file
- File: `shared/models/src/obs/ObsWebSocketClient.ts`
- Import ws as WebSocket
- Import all types from ./types
- Implement ObsWebSocketClient interface

**Task 10**: Implement constructor and properties
```typescript
import WebSocket from 'ws';
import { randomUUID } from 'crypto';

export class ObsWebSocketClient implements ObsWebSocketClient {
  private ws: WebSocket | null = null;
  private connected = false;
  private messageHandlers = new Map<ObsWebSocketEvent, Array<(...args: any[]) => void>>();
  private pendingRequests = new Map<string, {
    resolve: (value: ObsResponseMessage) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }>();
  private requestTimeout = 30000;  // 30 seconds

  constructor(private url: string = 'ws://localhost:4455') {}
```

**Task 6**: Implement `connect()` method
```typescript
async connect(password?: string): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      this.ws = new WebSocket(this.url, 'obswebsocket.json');

      this.ws.on('open', () => {
        console.log('OBS WebSocket connected');
      });

      this.ws.on('message', async (data: Buffer) => {
        await this.handleMessage(JSON.parse(data.toString()));
      });

      this.ws.on('error', (error: Error) => {
        this.emit('error', error);
        reject(error);
      });

      this.ws.on('close', () => {
        this.connected = false;
        this.ws = null;
        this.emit('disconnected');
        // Reject all pending requests
        for (const pending of this.pendingRequests.values()) {
          clearTimeout(pending.timeout);
          pending.reject(new Error('Connection closed'));
        }
        this.pendingRequests.clear();
      });

      // Wait for 'Hello' and handle auth
      this.once('message', (message: ObsMessage) => {
        if (message.op === OpCode.Hello) {
          this.handleHello(message as ObsHelloMessage, password)
            .then(() => {
              this.connected = true;
              this.emit('connected');
              resolve();
            })
            .catch(reject);
        }
      });

    } catch (error) {
      reject(error);
    }
  });
}
```

**Task 12**: Implement `handleHello()` and authentication
```typescript
private async handleHello(hello: ObsHelloMessage, password?: string): Promise<void> {
  const { rpcVersion, authentication } = hello.d;
  console.log(`OBS WebSocket: RPC v${rpcVersion}`);

  let authString: string | undefined;

  if (authentication && password) {
    authString = await this.generateAuthString(password, authentication.salt, authentication.challenge);
  }

  const identify: ObsIdentifyMessage = {
    op: OpCode.Identify,
    d: {
      rpcVersion,
      authentication: authString,
      eventSubscriptions: 64  // Output events only
    }
  };

  this.ws!.send(JSON.stringify(identify));
}
```

**Task 13**: Implement `generateAuthString()` (SHA256-based)
```typescript
private async generateAuthString(password: string, salt: string, challenge: string): Promise<string> {
  const crypto = await import('crypto');

  // SHA256(password + salt) → base64
  const secretHash = crypto.createHash('sha256')
    .update(password + salt)
    .digest();

  const base64Secret = secretHash.toString('base64');

  // SHA256(base64Secret + challenge) → base64
  const authResponse = crypto.createHash('sha256')
    .update(base64Secret + challenge)
    .digest();

  return authResponse.toString('base64');
}
```

**Task 14**: Implement `disconnect()`, `isConnected()`, and `emit()` methods
```typescript
disconnect(): Promise<void> {
  this.connected = false;
  if (this.ws) {
    this.ws.close();
    this.ws = null;
  }
  return Promise.resolve();
}

isConnected(): boolean {
  return this.connected && this.ws !== null;
}

private emit(event: ObsWebSocketEvent, ...args: any[]): void {
  const handlers = this.messageHandlers.get(event);
  if (handlers) {
    for (const handler of handlers) {
      try {
        handler(...args);
      } catch (error) {
        console.error(`Error in ${event} handler:`, error);
      }
    }
  }
}

on(event: ObsWebSocketEvent, handler: (...args: any[]) => void): void {
  let handlers = this.messageHandlers.get(event);
  if (!handlers) {
    handlers = [];
    this.messageHandlers.set(event, handlers);
  }
  handlers.push(handler);
}
```

**Task 15**: Implement `send()` and `getStreamStatus()`
```typescript
async send(request: ObsRequestMessage): Promise<ObsResponseMessage> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      this.pendingRequests.delete(request.d.requestId);
      reject(new Error(`Request timeout: ${request.d.requestType}`));
    }, this.requestTimeout);

    this.pendingRequests.set(request.d.requestId, { resolve, reject, timeout });

    if (!this.ws) {
      reject(new Error('Not connected'));
      return;
    }

    this.ws.send(JSON.stringify(request));
  });
}

async getStreamStatus(): Promise<ObsStreamStatus> {
  const request: ObsRequestMessage = {
    op: OpCode.Request,
    d: {
      requestType: 'GetStreamStatus',
      requestId: `status-${randomUUID()}`
    }
  };

  const response = await this.send(request);

  if (!response.d.requestStatus.result) {
    throw new Error(`GetStreamStatus failed: ${response.d.requestStatus.code}`);
  }

  return response.d.responseData as ObsStreamStatus;
}
```

### Phase 3: ObsStreamDetector Implementation (Tasks 16-20)

**Task 16**: Create ObsStreamDetector.ts file
- File: `shared/models/src/obs/ObsStreamDetector.ts`
- Import ObsWebSocketClient, Stream, StreamService
- Implement state machine

**Task 17**: Define state machine types and constructor with StreamService
```typescript
export class ObsStreamDetector {
  private state: StreamState = 'offline';
  private client: ObsWebSocketClient;
  private streamService: StreamService;
  private currentStream: Stream | null = null;
  private callbacks: StreamDetectorCallbacks;

  constructor(
    client: ObsWebSocketClient,
    streamService: StreamService,
    callbacks: StreamDetectorCallbacks = {}
  ) {
    this.client = client;
    this.streamService = streamService;
    this.callbacks = callbacks;
    this.setupEventHandlers();
  }
```

**Task 13**: Implement `setupEventHandlers()` method
```typescript
private setupEventHandlers(): void {
  this.client.on('connected', async () => {
    // Poll initial status on connect
    try {
      const status = await this.client.getStreamStatus();
      this.updateStateFromStatus(status);
    } catch (error) {
      console.error('Failed to get initial stream status:', error);
    }
  });

  this.client.on('StreamStateChanged', (event: ObsStreamStateChangedEvent) => {
    this.handleStreamStateChanged(event);
  });

  this.client.on('error', (error: Error) => {
    console.error('OBS WebSocket error:', error);
  });

  this.client.on('disconnected', () => {
    this.state = 'offline';
    this.startTime = null;
  });
}
```

**Task 18**: Implement `handleStreamStateChanged()` method with StreamService
```typescript
private handleStreamStateChanged(event: ObsStreamStateChangedEvent): void {
  const { outputActive, outputState } = event;
  let newState: StreamState;

  switch (outputState) {
    case ObsOutputState.Starting:
      newState = 'starting';
      this.callbacks.onStreamStarting?.();
      break;

    case ObsOutputState.Started:
    case ObsOutputState.Reconnected:
      newState = 'live';
      if (this.state !== 'live') {
        const startTime = new Date();
        
        // Create new Stream via StreamService
        const commonId = crypto.randomUUID();
        this.currentStream = new Stream(commonId, startTime);
        this.streamService.createStream(commonId, startTime).then(() => {
          this.callbacks.onStreamStart?.(this.currentStream!);
        });

        if (this.state === 'reconnecting') {
          this.callbacks.onStreamReconnected?.();
        }
      }
      break;

    case ObsOutputState.Stopping:
      newState = 'stopping';
      this.callbacks.onStreamStopping?.();
      break;

    case ObsOutputState.Stopped:
      newState = 'offline';
      if (this.currentStream) {
        const endTime = new Date();
        this.currentStream.setObsEndTime(endTime);
        this.streamService.updateStreamEnd(this.currentStream.getCommonId(), endTime).then(() => {
          this.callbacks.onStreamStop?.(this.currentStream!, endTime);
        });
        this.currentStream = null;
      }
      break;

    case ObsOutputState.Reconnecting:
      newState = 'reconnecting';
      this.callbacks.onStreamReconnecting?.();
      break;

    default:
      newState = this.state;
  }

  this.state = newState;
}
```

**Task 19**: Implement `updateStateFromStatus()` helper
```typescript
private updateStateFromStatus(status: ObsStreamStatus): void {
  if (status.outputActive) {
    if (status.outputReconnecting) {
      this.state = 'reconnecting';
    } else {
      this.state = 'live';
      if (!this.startTime) {
        // Stream started before detector connected
        // We can't know exact start time, use duration to estimate
        const estimatedStart = new Date(Date.now() - status.outputDuration);
        this.startTime = estimatedStart;
        this.endTime = null;
      }
    }
  } else {
    this.state = 'offline';
    this.startTime = null;
    this.endTime = null;
  }
}
```

**Task 21**: Implement `connect()`, `disconnect()`, and `getStatus()` methods
```typescript
async connect(url: string, password?: string): Promise<void> {
  await this.client.connect(url, password);
}

async disconnect(): Promise<void> {
  await this.client.disconnect();
}

getStatus(): {
  isStreaming: boolean;
  state: StreamState;
  currentStream: Stream | null;
} {
  return {
    isStreaming: this.state === 'live',
    state: this.state,
    currentStream: this.currentStream
  };
}
```

### Phase 4: Unit Tests (Tasks 22-27)

**Task 22**: Create ObsWebSocketClient test file
- File: `shared/models/__tests__/obs/ObsWebSocketClient.test.ts`
- Mock ws module (use vi.mock or manual mock)

**Task 23**: Test ObsWebSocketClient connection flow
- Test connect() with no auth
- Test connect() with auth
- Test authentication string generation (SHA256)
- Test handshake: Hello → Identify → Identified
- Test connection error handling

**Task 24**: Test ObsWebSocketClient messaging
- Test send() request/response
- Test request timeout (30s)
- Test getStreamStatus() method
- Test event emission (connected, disconnected, error, StreamStateChanged)
- Test message handlers registered correctly

**Task 25**: Create ObsStreamDetector test file
- File: `shared/models/__tests__/obs/ObsStreamDetector.test.ts`
- Mock ObsWebSocketClient

**Task 26**: Test ObsStreamDetector state machine
- Test state transitions: offline → starting → live → stopping → offline
- Test callbacks triggered at correct times
- Test reconnecting state transition: live → reconnecting → live
- Test getStatus() returns correct data
- Test initial status polling on connect

**Task 27**: Test ObsStreamDetector with mock events
- Test StreamStateChanged events from client
- Test offline state on disconnect
- Test error handling

### Phase 5: Package Export (Task 28)

**Task 28**: Update shared/models exports
- Update `shared/models/src/index.ts` to export stream and obs modules
```typescript
export * from './stream';
export * from './obs';
```

---

## Files to Create
- `shared/models/src/obs/types.ts` (~150 lines)
- `shared/models/src/obs/interface.ts` (~40 lines)
- `shared/models/src/obs/ObsWebSocketClient.ts` (~200 lines)
- `shared/models/src/obs/ObsStreamDetector.ts` (~180 lines)
- `shared/models/src/obs/index.ts` (~6 lines)
- `shared/models/src/stream/` (new directory)
  - `StreamData.ts` (~20 lines)
  - `PlatformStreamRecord.ts` (~25 lines)
  - `Stream.ts` (~70 lines)
  - `StreamService.ts` (~30 lines - interface)
  - `index.ts` (~5 lines)
- `shared/models/__tests__/obs/ObsWebSocketClient.test.ts` (~250 lines)
- `shared/models/__tests__/obs/ObsStreamDetector.test.ts` (~200 lines)

## Files to Modify
- `shared/models/package.json` (add ws, @types/ws as devDependencies)
- `shared/models/src/index.ts` (add obs export)

## Dependencies
- **New**: `ws`: ^8.16.0 (dev dependency for thin WebSocket wrapper)
- **New**: `@types/ws`: ^8.5.10 (dev dependency for TypeScript types)
- `crypto` (Node.js built-in - randomUUID, createHash)
- **Phase 7**: `createStreamAdapter` from translators
- **PlatformStream** types from `./Stream.ts`

## Dependencies on Other Phases
- **Phase 7**: Uses translators for StreamAdapter creation
- **Phase 9**: Depends on StreamService and Stream class for matching

## Acceptance Criteria
- Stream class created with lazy platform loading via StreamService
- StreamService interface defined with comprehensive CRUD operations
- PlatformStreamRecord type for separate platform stream storage
- ObsWebSocketClient connects to OBS WebSocket with auth
- Authentication generates correct SHA256-based auth string
- ObsWebSocketClient sends requests and handles responses
- ObsStreamDetector implements state machine correctly
- ObsStreamDetector integrates with StreamService (creates Streams on obsStart)
- ObsStreamDetector callbacks pass Stream objects
- All state transitions trigger appropriate callbacks
- ObsStreamDetector polls status on connect
- All unit tests pass (30-35 tests)
- TypeScript compilation succeeds
- Manual testing: Connect to real OBS, detect stream start/stop

## Notes

### Why Thin Wrapper + Service Layer?
- **ObsWebSocketClient**: Minimal WS abstraction (connection, auth, parsing)
- **ObsStreamDetector**: Business logic (state machine, callbacks)
- Separation of concerns: Easy to test, easy to replace WS implementation
- Service layer can be reused with platform strategies (future)

### Why Not Use obs-websocket-js Library?
- obs-websocket-js is deprecated/unmaintained
- Building custom wrapper gives full control
- Thin wrapper uses ws (well-maintained, 50M+ downloads)
- Simplifies dependencies (one lib instead of wrapper + obs-websocket-js)

### WebSocket Reconnection
- ObsWebSocketClient does NOT auto-reconnect (keep it simple)
- ObsStreamDetector handles reconnecting state (OBS notifies via events)
- Consumers can call `client.connect()` again if needed
- Future: Add auto-reconnect to ObsStreamDetector if needed

### State Machine Notes
- **Starting**: OBS initializing stream (wait, do nothing)
- **Live (Started)**: Stream is actually running (trigger onStreamStart)
- **Reconnecting**: Network issues, OBS trying to reconnect (warning, not offline)
- **Stopping**: OBS terminating stream (wait, do nothing)
- **Offline (Stopped)**: Stream stopped (trigger onStreamStop)
- **Rule**: Only trigger onStreamStart on first "live" state, not on every state change
- **Rule**: Only trigger onStreamStop on "offline" state, not on pausing

### Message Pattern (Hello → Identify → Identified)
1. Client connects via WebSocket
2. Server sends `Hello` (OpCode 0) with `authentication` object if password required
3. Client generates `authString` (SHA256-based)
4. Client sends `Identify` (OpCode 1) with authString and `eventSubscriptions`
5. Server sends `Identified` (OpCode 2)
6. Client can now send requests and receive events

### Testing Strategy
- **Mock ws module**: Use vi.mock (Vitest) or manual mock class
- **Test auth generation**: Verify SHA256 logic with known test vectors
- **Test state machine**: Verify all transitions and callbacks
- **Integration**: (optional) Test with real OBS running locally in CI

### Error Handling
- Connection errors passed to `on('error')` handler
- Request timeout (30s default) rejects promise
- Unknown state treated as current state (no transition)
- Errors in callbacks caught and logged (don't crash detector)

### Using ObsStreamDetector
```typescript
const client = new ObsWebSocketClient('ws://localhost:4455');
const detector = new ObsStreamDetector(client, {
  onStreamStart: (startTime) => {
    console.log('Stream started:', startTime);
    // Create Stream object with obsStartTime
  },
  onStreamStop: (endTime) => {
    console.log('Stream stopped:', endTime);
    // Close Stream object with obsEndTime
  },
  onStreamReconnecting: () => {
    console.warn('Stream reconnecting...');
  }
});

await detector.connect('ws://localhost:4455', 'password');
```

## Integration with Other Phases
- **Phase 7**: Uses `createStreamAdapter()` for PlatformStreamRecord creation
- **Phase 9**: Depends on StreamService and Stream class (matcher uses database)
- **Phase 12**: Integration tests with real StreamService mock
- **Phase 13**: Document StreamService architecture, database schema

## Live Streaming Flow (Revised)

**When OBS starts**:
```
OBS WebSocket → ObsStreamDetector → onStreamStart callback
     ↓
ObsStreamDetector creates Stream(commonId, obsStartTime)
     ↓
StreamService.createStream(commonId, obsStartTime)
     ↓
Stream stored in database (streams table)
```

**When platform goes live**:
```
Platform strategy detects stream → fetches API data
     ↓
Create PlatformStreamRecord(commonId, PlatformStream)
     ↓
StreamService.createPlatformStream(commonId, PlatformStream)
     ↓
PlatformStream stored in database (platform_streams table)
```

**When OBS stops**:
```
OBS WebSocket → ObsStreamDetector → onStreamStop callback
     ↓
ObsStreamDetector updates Stream.obsEndTime
     ↓
StreamService.updateStreamEnd(commonId, obsEndTime)
     ↓
Stream record updated in database
```

**Key Point:** StreamService handles all database operations. Tracker doesn't need to know about Platforms until they're fetched separately.

## Estimated Effort
12-14 hours (28 tasks, ~1050 lines of code + tests)
**Increased from 10-12 hours** due to Stream/StreamService implementation

## Risks and Mitigations
- **Risk 1**: obs-websocket-protocol research outdated
  - **Mitigation**: Test with actual OBS Studio on connection/auth
  - **Mitigation**: Verify with OBS docs (https://github.com/obsproject/obs-websocket/blob/master/docs/generated/protocol.md)

- **Risk 2**: WebSocket library incompatibility
  - **Mitigation**: ws is widely used, should work fine
  - **Mitigation**: Test with node version compatible with project (Node 20+)

- **Risk 3**: State machine edge cases (rapid state changes)
  - **Mitigation**: Only trigger callbacks on state changes, not every event
  - **Mitigation**: Debounce if needed (add in future if issues arise)

- **Risk 4**: SHA256 auth generation incorrect
  - **Mitigation**: Test with known vectors from OBS protocol docs
  - **Mitigation**: Test with real OBS password

- **Risk 5**: Initial status race condition (connect before stream starts)
  - **Mitigation**: Poll GetStreamStatus on connect/reconnect
  - **Mitigation**: If stream already live, set estimated start time from duration

## Manual Testing Checklist
- [ ] Connect to OBS with no password
- [ ] Connect to OBS with password
- [ ] Start OBS stream → onStreamStart callback fires
- [ ] Stop OBS stream → onStreamStop callback fires
- [ ] Simulate network disconnect → onStreamReconnecting fires
- [ ] Reconnect → onStreamReconnected fires
- [ ] Check status during stream → getStatus() returns correct data
- [ ] Disconnect client → state returns to offline
