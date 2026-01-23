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
    NEGOTIATED_RPC_VERSION: number;
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
  outputDuration: number;
  outputCongestion: number;
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
