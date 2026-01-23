import WebSocket from 'ws';
import { randomUUID } from 'crypto';
import {
  OpCode,
  ObsHelloMessage,
  ObsIdentifyMessage,
  ObsIdentifiedMessage,
  ObsRequestMessage,
  ObsResponseMessage,
  ObsEventMessage,
  ObsMessage,
  ObsStreamStatus,
  ObsStreamStateChangedEvent
} from './types';
import type {
  ObsWebSocketClient as IObsWebSocketClient,
  ObsWebSocketEvent
} from './interface';

export class ObsWebSocketClient implements IObsWebSocketClient {
  private ws: WebSocket | null = null;
  private connected = false;
  private messageHandlers = new Map<ObsWebSocketEvent, Array<(...args: any[]) => void>>();
  private pendingRequests = new Map<string, {
    resolve: (value: ObsResponseMessage) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }>();
  private requestTimeout = 30000;

  constructor(private url: string = 'ws://localhost:4455') {}

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
          for (const pending of this.pendingRequests.values()) {
            clearTimeout(pending.timeout);
            pending.reject(new Error('Connection closed'));
          }
          this.pendingRequests.clear();
        });

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

  async disconnect(): Promise<void> {
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

  on(event: ObsWebSocketEvent, handler: (...args: any[]) => void): void {
    let handlers = this.messageHandlers.get(event);
    if (!handlers) {
      handlers = [];
      this.messageHandlers.set(event, handlers);
    }
    handlers.push(handler);
  }

  private once(event: ObsWebSocketEvent, handler: (...args: any[]) => void): void {
    const wrappedHandler = (...args: any[]) => {
      handler(...args);
      const handlers = this.messageHandlers.get(event);
      if (handlers) {
        const index = handlers.indexOf(wrappedHandler);
        if (index !== -1) {
          handlers.splice(index, 1);
        }
      }
    };
    this.on(event, wrappedHandler);
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

  private async handleMessage(message: ObsMessage): Promise<void> {
    this.emit('message', message);

    switch (message.op) {
      case OpCode.Hello:
      case OpCode.Identified:
        this.emit('message', message);
        break;

      case OpCode.RequestResponse:
        const response = message as ObsResponseMessage;
        const pending = this.pendingRequests.get(response.d.requestId);
        if (pending) {
          clearTimeout(pending.timeout);
          this.pendingRequests.delete(response.d.requestId);
          pending.resolve(response);
        }
        break;

      case OpCode.Event:
        const event = message as ObsEventMessage;
        if (event.d.eventType === 'StreamStateChanged') {
          this.emit('StreamStateChanged', event.d.eventData as ObsStreamStateChangedEvent);
        }
        this.emit('message', message);
        break;
    }
  }

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
        eventSubscriptions: 64
      }
    };

    this.ws!.send(JSON.stringify(identify));
  }

  private async generateAuthString(password: string, salt: string, challenge: string): Promise<string> {
    const crypto = await import('crypto');

    const secretHash = crypto.createHash('sha256')
      .update(password + salt)
      .digest();

    const base64Secret = secretHash.toString('base64');

    const authResponse = crypto.createHash('sha256')
      .update(base64Secret + challenge)
      .digest();

    return authResponse.toString('base64');
  }
}
