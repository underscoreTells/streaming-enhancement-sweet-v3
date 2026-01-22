# OBS WebSocket Protocol Research

## Overview

OBS WebSocket provides a feature-rich RPC communication protocol for controlling OBS Studio. This document focuses on stream-related events and requests relevant for building stream detection and monitoring functionality.

### Protocol Version
- **obs-websocket version:** 5.x.x (tested with 5.5.2)
- **RPC Version:** 1 (current stable)
- **Encoding Options:** JSON (default) or MessagePack

### Connection Details

#### Default Connection
- **Host:** `localhost`
- **Port:** `4455` (default in OBS 28+)
- **Protocol:** WebSocket

#### Authentication Flow

OBS WebSocket uses SHA256-based challenge-response authentication:

1. Client connects to WebSocket server
2. Server sends `Hello` message (OpCode 0) with optional authentication challenge
3. Client responds with `Identify` message (OpCode 1) containing auth string if required
4. Server responds with `Identified` message (OpCode 2)
5. Client can now receive events and make requests

#### Authentication String Generation

When auth is required, the `Hello` message contains:
```json
{
  "challenge": "base64_encoded_challenge",
  "salt": "base64_encoded_salt"
}
```

To generate the auth string:
```
1. Concatenate: password + salt
2. SHA256 hash and base64 encode → base64_secret
3. Concatenate: base64_secret + challenge
4. SHA256 hash and base64 encode → authentication_string
```

#### Event Subscriptions

Clients can subscribe to specific event categories using a bitmask. For stream-related events, use:

```typescript
const EventSubscription = {
  Outputs: 1 << 6,  // Stream, Record, ReplayBuffer, Virtualcam events
  All: (1 << 0) | (1 << 1) | (1 << 2) | (1 << 3) | (1 << 4) | (1 << 5) | (1 << 6) | (1 << 7) | (1 << 8) | (1 << 9) | (1 << 10),
};

// Subscribe to output events only (recommended for stream monitoring)
const eventSubscriptions = EventSubscription.Outputs;

// Or subscribe to all events
const eventSubscriptions = EventSubscription.All;
```

Include in `Identify` message:
```json
{
  "op": 1,
  "d": {
    "rpcVersion": 1,
    "authentication": "auth_string_if_required",
    "eventSubscriptions": 64
  }
}
```

## Stream-Related Events

### StreamStateChanged

The state of the stream output has changed.

**Event Details:**
- **OpCode:** 5 (Event)
- **Event Intent:** EventSubscription::Outputs (64)
- **Complexity:** 2/5
- **Added in:** v5.0.0

**Event Message Structure:**
```json
{
  "op": 5,
  "d": {
    "eventType": "StreamStateChanged",
    "eventIntent": 64,
    "eventData": {
      "outputActive": true,
      "outputState": "OBS_WEBSOCKET_OUTPUT_STARTED"
    }
  }
}
```

**Event Data Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `outputActive` | Boolean | Whether the output is actively streaming |
| `outputState` | String | The specific state of the output (see ObsOutputState enum) |

**OutputState Enum Values:**

| State | Description | Use in Stream Detection |
|-------|-------------|------------------------|
| `OBS_WEBSOCKET_OUTPUT_UNKNOWN` | Unknown state | Error condition - needs investigation |
| `OBS_WEBSOCKET_OUTPUT_STARTING` | The output is starting | Stream is being initialized |
| `OBS_WEBSOCKET_OUTPUT_STARTED` | The input has started | **Stream is now LIVE** |
| `OBS_WEBSOCKET_OUTPUT_STOPPING` | The output is stopping | Stream is being terminated |
| `OBS_WEBSOCKET_OUTPUT_STOPPED` | The output has stopped | Stream is now OFFLINE |
| `OBS_WEBSOCKET_OUTPUT_RECONNECTING` | The output has disconnected and is reconnecting | Network issues - stream may be unstable |
| `OBS_WEBSOCKET_OUTPUT_RECONNECTED` | The output has reconnected successfully | Stream has recovered |
| `OBS_WEBSOCKET_OUTPUT_PAUSED` | The output is now paused | Stream is paused (rare for streaming) |
| `OBS_WEBSOCKET_OUTPUT_RESUMED` | The output has been resumed (unpaused) | Stream resumed from pause |

**Stream Detection Logic:**

A stream is considered "live" when:
- `outputActive` is `true`
- `outputState` is `OBS_WEBSOCKET_OUTPUT_STARTED`

A stream is considered "offline" when:
- `outputActive` is `false`
- `outputState` is `OBS_WEBSOCKET_OUTPUT_STOPPED`

**Example Event Timeline:**

```
1. User clicks "Start Streaming" in OBS
   → StreamStateChanged: { outputActive: false, outputState: "OBS_WEBSOCKET_OUTPUT_STARTING" }

2. Stream starts successfully
   → StreamStateChanged: { outputActive: true, outputState: "OBS_WEBSOCKET_OUTPUT_STARTED" }

3. Network issue occurs
   → StreamStateChanged: { outputActive: true, outputState: "OBS_WEBSOCKET_OUTPUT_RECONNECTING" }

4. Connection recovers
   → StreamStateChanged: { outputActive: true, outputState: "OBS_WEBSOCKET_OUTPUT_RECONNECTED" }

5. User clicks "Stop Streaming" in OBS
   → StreamStateChanged: { outputActive: true, outputState: "OBS_WEBSOCKET_OUTPUT_STOPPING" }

6. Stream stops
   → StreamStateChanged: { outputActive: false, outputState: "OBS_WEBSOCKET_OUTPUT_STOPPED" }
```

## Stream-Related Requests

### GetStreamStatus

Gets the current status of the stream output.

**Request Details:**
- **OpCode:** 6 (Request)
- **Complexity:** 2/5
- **Added in:** v5.0.0

**Request Message Structure:**
```json
{
  "op": 6,
  "d": {
    "requestType": "GetStreamStatus",
    "requestId": "unique-request-id"
  }
}
```

**Request Fields:** None (no requestData required)

**Response Structure:**
```json
{
  "op": 7,
  "d": {
    "requestType": "GetStreamStatus",
    "requestId": "unique-request-id",
    "requestStatus": {
      "result": true,
      "code": 100
    },
    "responseData": {
      "outputActive": true,
      "outputReconnecting": false,
      "outputTimecode": "01:23:45.678",
      "outputDuration": 5025678,
      "outputCongestion": 0.5,
      "outputBytes": 104857600,
      "outputSkippedFrames": 0,
      "outputTotalFrames": 150000
    }
  }
}
```

**Response Data Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `outputActive` | Boolean | Whether the stream output is currently active (live) |
| `outputReconnecting` | Boolean | Whether the stream is currently attempting to reconnect |
| `outputTimecode` | String | Current formatted timecode string (e.g., "01:23:45.678") |
| `outputDuration` | Number | Current duration in milliseconds |
| `outputCongestion` | Number | Congestion level (0-1, higher = more congested) |
| `outputBytes` | Number | Total bytes sent since stream started |
| `outputSkippedFrames` | Number | Number of dropped/skipped frames |
| `outputTotalFrames` | Number | Total frames delivered |

**Usage for Stream Detection:**

```typescript
// Check if stream is currently live
const isStreamLive = (status: GetStreamStatusResponse) => status.outputActive;

// Check stream health metrics
const getStreamHealth = (status: GetStreamStatusResponse) => ({
  droppedFrameRate: status.outputSkippedFrames / status.outputTotalFrames,
  congestion: status.outputCongestion,
  isReconnecting: status.outputReconnecting,
});

// Example: Alert if drop rate exceeds 5%
ifhealth = getStreamHealth(streamStatus);
if (health.droppedFrameRate > 0.05) {
  console.warn(`High frame drop rate: ${(health.droppedFrameRate * 100).toFixed(2)}%`);
}
```

### ToggleStream

Toggles the status of the stream output. If streaming, stops it. If not streaming, starts it.

**Request Details:**
- **OpCode:** 6 (Request)
- **Complexity:** 1/5
- **Added in:** v5.0.0

**Request Message Structure:**
```json
{
  "op": 6,
  "d": {
    "requestType": "ToggleStream",
    "requestId": "unique-request-id"
  }
}
```

**Request Fields:** None (no requestData required)

**Response Structure:**
```json
{
  "op": 7,
  "d": {
    "requestType": "ToggleStream",
    "requestId": "unique-request-id",
    "requestStatus": {
      "result": true,
      "code": 100
    },
    "responseData": {
      "outputActive": true
    }
  }
}
```

**Response Data Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `outputActive` | Boolean | New state of the stream output after toggle |

### StartStream

Starts the stream output.

**Request Details:**
- **OpCode:** 6 (Request)
- **Complexity:** 1/5
- **Added in:** v5.0.0

**Request Message Structure:**
```json
{
  "op": 6,
  "d": {
    "requestType": "StartStream",
    "requestId": "unique-request-id",
    "requestData": {
      "stream": {
        "type": "rtmp_custom",
        "server": "rtmp://live.example.com/app",
        "key": "stream-key-here"
      }
    }
  }
}
```

**Request Fields (Optional):**

| Field | Type | Description |
|-------|------|-------------|
| `stream` | Object | Optional stream service settings to override current settings |
| `stream.type` | String | Stream service type (e.g., "rtmp_common", "rtmp_custom") |
| `stream.server` | String | RTMP server URL |
| `stream.key` | String | Stream key |

**Response Structure:**
```json
{
  "op": 7,
  "d": {
    "requestType": "StartStream",
    "requestId": "unique-request-id",
    "requestStatus": {
      "result": true,
      "code": 100
    }
  }
}
```

**Response Data Fields:** None (success indicated by requestStatus.result)

**Note:** If stream is already started, this will return an error with code `500` (RequestStatus::OutputRunning).

### StopStream

Stops the stream output.

**Request Details:**
- **OpCode:** 6 (Request)
- **Complexity:** 1/5
- **Added in:** v5.0.0

**Request Message Structure:**
```json
{
  "op": 6,
  "d": {
    "requestType": "StopStream",
    "requestId": "unique-request-id"
  }
}
```

**Request Fields:** None (no requestData required)

**Response Structure:**
```json
{
  "op": 7,
  "d": {
    "requestType": "StopStream",
    "requestId": "unique-request-id",
    "requestStatus": {
      "result": true,
      "code": 100
    }
  }
}
```

**Response Data Fields:** None (success indicated by requestStatus.result)

**Note:** If stream is not running, this will return an error with code `501` (RequestStatus::OutputNotRunning).

### SendStreamCaption

Sends CEA-608 caption text over the stream output.

**Request Details:**
- **OpCode:** 6 (Request)
- **Complexity:** 2/5
- **Added in:** v5.0.0

**Request Message Structure:**
```json
{
  "op": 6,
  "d": {
    "requestType": "SendStreamCaption",
    "requestId": "unique-request-id",
    "requestData": {
      "captionText": "Sample caption text"
    }
  }
}
```

**Request Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `captionText` | String | The caption text to send over the stream |

**Response Structure:**
```json
{
  "op": 7,
  "d": {
    "requestType": "SendStreamCaption",
    "requestId": "unique-request-id",
    "requestStatus": {
      "result": true,
      "code": 100
    }
  }
}
```

**Response Data Fields:** None (success indicated by requestStatus.result)

## Code Examples

### Basic Connection and Event Subscription

```typescript
import WebSocket from 'ws';

async function connectToOBS(url: string = 'ws://localhost:4455', password?: string) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url, 'obswebsocket.json');

    let identified = false;

    ws.on('open', () => {
      console.log('Connected to OBS WebSocket');
    });

    ws.on('message', async (data) => {
      const message = JSON.parse(data.toString());

      switch (message.op) {
        case 0: { // Hello
          const { obsWebSocketVersion, rpcVersion, authentication } = message.d;
          console.log(`OBS WebSocket v${obsWebSocketVersion}, RPC v${rpcVersion}`);

          const identify: any = {
            op: 1,
            d: {
              rpcVersion: 1,
              eventSubscriptions: 64, // Subscribe to Outputs events only
            },
          };

          if (authentication) {
            identify.d.authentication = await generateAuthString(password, authentication.salt, authentication.challenge);
          }

          ws.send(JSON.stringify(identify));
          break;
        }

        case 2: { // Identified
          identified = true;
          console.log('Identified successfully');
          resolve(ws);
          break;
        }

        case 5: { // Event
          handleOBSEvent(message.d);
          break;
        }

        case 7: { // RequestResponse
          handleRequestResponse(message.d);
          break;
        }
      }
    });

    ws.on('error', reject);
    ws.on('close', () => {
      console.log('Disconnected from OBS WebSocket');
    });
  });
}

async function generateAuthString(password: string, salt: string, challenge: string): Promise<string> {
  const crypto = await import('crypto');

  // password + salt
  const secret = crypto.createHash('sha256')
    .update(password + salt)
    .digest();

  // base64_secret + challenge
  const authResponse = crypto.createHash('sha256')
    .update(Buffer.concat([secret, Buffer.from(challenge, 'base64')]))
    .digest();

  return authResponse.toString('base64');
}

function handleOBSEvent(eventData: any) {
  switch (eventData.eventType) {
    case 'StreamStateChanged':
      handleStreamStateChanged(eventData.eventData);
      break;
    default:
      console.log(`Unhandled event: ${eventData.eventType}`);
  }
}
```

### Stream State Detector Class

```typescript
type StreamState = 'offline' | 'starting' | 'live' | 'stopping' | 'reconnecting';

interface StreamDetectorOptions {
  onStreamStart?: () => void;
  onStreamStop?: () => void;
  onStreamReconnecting?: () => void;
  onStreamReconnected?: () => void;
}

class OBSStreamDetector {
  private currentState: StreamState = 'offline';
  private callbacks: StreamDetectorOptions;

  constructor(callbacks: StreamDetectorOptions = {}) {
    this.callbacks = callbacks;
  }

  handleStreamStateChanged(eventData: {
    outputActive: boolean;
    outputState: string;
  }): StreamState {
    const { outputActive, outputState } = eventData;
    let newState: StreamState;

    switch (outputState) {
      case 'OBS_WEBSOCKET_OUTPUT_STARTING':
        newState = 'starting';
        break;
      case 'OBS_WEBSOCKET_OUTPUT_STARTED':
        newState = 'live';
        break;
      case 'OBS_WEBSOCKET_OUTPUT_STOPPING':
        newState = 'stopping';
        break;
      case 'OBS_WEBSOCKET_OUTPUT_STOPPED':
        newState = 'offline';
        break;
      case 'OBS_WEBSOCKET_OUTPUT_RECONNECTING':
        newState = 'reconnecting';
        break;
      case 'OBS_WEBSOCKET_OUTPUT_RECONNECTED':
        newState = 'live'; // Reconnected means we're back to live
        break;
      default:
        newState = this.currentState;
    }

    this.triggerCallbacks(newState);
    this.currentState = newState;

    return newState;
  }

  private triggerCallbacks(newState: StreamState): void {
    if (newState === 'live' && this.currentState !== 'live' && this.callbacks.onStreamStart) {
      this.callbacks.onStreamStart();
    }

    if (newState === 'offline' && this.currentState !== 'offline' && this.callbacks.onStreamStop) {
      this.callbacks.onStreamStop();
    }

    if (newState === 'reconnecting' && this.currentState !== 'reconnecting' && this.callbacks.onStreamReconnecting) {
      this.callbacks.onStreamReconnecting();
    }

    if (newState === 'live' && this.currentState === 'reconnecting' && this.callbacks.onStreamReconnected) {
      this.callbacks.onStreamReconnected();
    }
  }

  getState(): StreamState {
    return this.currentState;
  }

  isLive(): boolean {
    return this.currentState === 'live';
  }
}
```

### Usage Example with WebSocket

```typescript
async function startStreamMonitoring(password?: string) {
  const detector = new OBSStreamDetector({
    onStreamStart: () => console.log('Stream has started!'),
    onStreamStop: () => console.log('Stream has stopped.'),
    onStreamReconnecting: () => console.warn('Stream is reconnecting...'),
    onStreamReconnected: () => console.log('Stream has reconnected!'),
  });

  const ws = await connectToOBS('ws://localhost:4455', password);

  // Initial status check
  const statusRequest = {
    op: 6,
    d: {
      requestType: 'GetStreamStatus',
      requestId: 'initial-status-check',
    },
  };

  ws.send(JSON.stringify(statusRequest));

  // Override event handler
  ws.on('message', (data) => {
    const message = JSON.parse(data.toString());

    if (message.op === 5) { // Event
      const { eventType, eventData } = message.d;

      if (eventType === 'StreamStateChanged') {
        detector.handleStreamStateChanged(eventData);
        console.log(`Stream state changed: ${detector.getState()}`);
      }
    }

    if (message.op === 7) { // RequestResponse
      const { requestType, requestStatus, responseData } = message.d;

      if (requestType === 'GetStreamStatus' && requestStatus.result) {
        console.log(`Stream is ${responseData.outputActive ? 'LIVE' : 'OFFLINE'}`);
        console.log(`Duration: ${responseData.outputDuration}ms`);
        console.log(`Bytes sent: ${responseData.outputBytes}`);
      }
    }
  });

  return ws;
}
```

### Starting/Stopping Streams

```typescript
async function toggleStream(ws: WebSocket): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const requestId = `toggle-${Date.now()}`;
    const handler = (data: Buffer) => {
      const message = JSON.parse(data.toString());

      if (
        message.op === 7 &&
        message.d.requestId === requestId
      ) {
        ws.off('message', handler);

        if (message.d.requestStatus.result) {
          resolve(message.d.responseData.outputActive);
        } else {
          reject(new Error(`Failed to toggle stream: ${message.d.requestStatus.code}`));
        }
      }
    };

    ws.on('message', handler);

    ws.send(JSON.stringify({
      op: 6,
      d: {
        requestType: 'ToggleStream',
        requestId,
      },
    }));
  });
}

async function startStream(ws: WebSocket, streamSettings?: any): Promise<void> {
  return new Promise((resolve, reject) => {
    const requestId = `start-${Date.now()}`;
    const handler = (data: Buffer) => {
      const message = JSON.parse(data.toString());

      if (
        message.op === 7 &&
        message.d.requestId === requestId
      ) {
        ws.off('message', handler);

        if (message.d.requestStatus.result) {
          resolve();
        } else {
          reject(new Error(`Failed to start stream: ${message.d.requestStatus.code}`));
        }
      }
    };

    ws.on('message', handler);

    const request: any = {
      op: 6,
      d: {
        requestType: 'StartStream',
        requestId,
      },
    };

    if (streamSettings) {
      request.d.requestData = { stream: streamSettings };
    }

    ws.send(JSON.stringify(request));
  });
}

async function stopStream(ws: WebSocket): Promise<void> {
  return new Promise((resolve, reject) => {
    const requestId = `stop-${Date.now()}`;
    const handler = (data: Buffer) => {
      const message = JSON.parse(data.toString());

      if (
        message.op === 7 &&
        message.d.requestId === requestId
      ) {
        ws.off('message', handler);

        if (message.d.requestStatus.result) {
          resolve();
        } else {
          reject(new Error(`Failed to stop stream: ${message.d.requestStatus.code}`));
        }
      }
    };

    ws.on('message', handler);

    ws.send(JSON.stringify({
      op: 6,
      d: {
        requestType: 'StopStream',
        requestId,
      },
    }));
  });
}
```

## Important Notes and Warnings

### Event Reliability

1. **Race Conditions:** When starting a stream, you may receive multiple state changes in rapid succession:
   - `OUTPUT_STARTING` → `OUTPUT_STARTED`
   - Always use `outputActive: true AND outputState: "OBS_WEBSOCKET_OUTPUT_STARTED"` to confirm stream is live

2. **Reconnection States:** A stream can transition between states multiple times during network issues:
   - `OBS_WEBSOCKET_OUTPUT_STARTED` → `OBS_WEBSOCKET_OUTPUT_RECONNECTING` → `OBS_WEBSOCKET_OUTPUT_RECONNECTED` → `OBS_WEBSOCKET_OUTPUT_STARTED`
   - Treat `OUTPUT_RECONNECTING` as a warning state, not an offline state

3. **Edge Case - Unknown State:** If `outputState` is `OBS_WEBSOCKET_OUTPUT_UNKNOWN`, treat as an error condition and poll for status

### Error Handling

#### Common Error Codes

| Code | Constant | Description |
|------|----------|-------------|
| 500 | `OutputRunning` | Attempted to start stream while already streaming |
| 501 | `OutputNotRunning` | Attempted to stop stream when not streaming |
| 502 | `OutputPaused` | Output is paused when it shouldn't be |
| 503 | `OutputNotPaused` | Output is not paused when it should be |
| 504 | `OutputDisabled` | Stream output is disabled in OBS settings |
| 600 | `ResourceNotFound` | Requested resource (scene, source, etc.) not found |
| 207 | `NotReady` | Server is not ready (e.g., during scene collection change) |

#### Handling Errors

```typescript
function handleRequestError(status: {
  result: boolean;
  code: number;
  comment?: string;
}): void {
  if (status.result) return;

  switch (status.code) {
    case 500:
      console.error('Stream is already running');
      break;
    case 501:
      console.error('Stream is not running');
      break;
    case 504:
      console.error('Stream output is disabled in OBS settings');
      break;
    case 207:
      console.warn('OBS is busy, try again in a moment');
      break;
    default:
      console.error(`Request failed: ${status.code} ${status.comment || ''}`);
  }
}
```

### Best Practices

1. **Initial Status Check:** Always poll `GetStreamStatus` after connecting to determine initial state before relying on events

2. **Debounce State Changes:** Stream states may change rapidly during startup/shutdown. Debounce or use a state machine to avoid processing intermediate states

3. **Subscribe Selectively:** Use `eventSubscriptions: 64` (Outputs only) to reduce irrelevant event traffic

4. **Handle Reconnection Gracefully:** If WebSocket disconnects, reconnect and re-check stream status rather than assuming state

5. **Monitor Stream Health:** Use `GetStreamStatus` periodically to monitor:
   - Dropped frame rate (`outputSkippedFrames / outputTotalFrames`)
   - Congestion level (`outputCongestion`)
   - Reconnection status (`outputReconnecting`)

6. **Throttle Health Checks:** Don't poll `GetStreamStatus` too frequently. 1-5 seconds is sufficient for most use cases

### Integration Considerations

1. **Multiple Outputs:** OBS can have stream, recording, replay buffer, and virtual cam running simultaneously. Each has its own events and status requests

2. **Stream Settings:** `StartStream` can accept custom stream settings, allowing you to dynamically change the RTMP server or key

3. **Caption Support:** Use `SendStreamCaption` to add accessibility features to your monitoring/tts integration

4. **Version Compatibility:** Always support reconnection with different RPC versions. Negotiate the highest supported version

### Limitations

1. **No Stream Title/Category:** OBS WebSocket does not provide stream title, category, or game information. This must be obtained from the streaming platform's API (Twitch, YouTube, Kick)

2. **No Viewer Count:** Viewer count must be obtained from platform API, not OBS WebSocket

3. **Port Configuration:** The default port (4455) can be changed in OBS settings. Always allow configuration

4. **Authentication Required:** On public installations, OBS WebSocket is often password-protected. Always handle authentication gracefully

## Reference: Message Flow Diagram

```
Client                    OBS WebSocket Server
  |                            |
  |------ CONNECT ------------>|  WebSocket connection established
  |                            |
  |<----- HELLO (OpCode 0) ----|  Contains rpcVersion, auth challenge (if enabled)
  |                            |
  |------- IDENTIFY (OpCode 1)->|  Contains auth string (if required), subscriptions
  |                            |
  |<---- IDENTIFIED (OpCode 2)---|  Connection ready for events/requests
  |                            |
  |------- GetStreamStatus --->|  Request stream status
  |                            |
  |<--- Response (OpCode 7)----|  Status including outputActive, duration, etc.
  |                            |
  |                            |
  |<--- STREAM STARTED EVENT --|  User starts streaming
  |      (OpCode 5)            |  eventData: { outputActive: true, outputState: "STARTED" }
  |                            |
  |                            |
  |--- SEND CAPTION REQUEST -->|  Send caption to stream
  |                            |
  |<--- Response (OpCode 7)----|  Success/Failure
  |                            |
  |                            |
  |<--- STREAM STOPPED EVENT --|  User stops streaming
  |      (OpCode 5)            |  eventData: { outputActive: false, outputState: "STOPPED" }
  |                            |
```

## Summary

For stream detection and monitoring in the Streaming Enhancement Sweet v3 project, the key OBS WebSocket protocol elements are:

1. **Event:** `StreamStateChanged` - Primary event for tracking stream lifecycle
2. **Request:** `GetStreamStatus` - Poll current status and health metrics
3. **Requests:** `StartStream`, `StopStream`, `ToggleStream` - Control stream from code

The stream state machine should track:
- `offline` → `starting` → `live` → `stopping` → `offline`
- `live` → `reconnecting` → `live` (or `offline` if reconnection fails)

Always verify `outputActive AND outputState === "OBS_WEBSOCKET_OUTPUT_STARTED"` to confirm stream is truly live, as these states can change during startup/transition periods.
