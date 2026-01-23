import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ObsStreamDetector } from '../../src/obs/ObsStreamDetector';
import { ObsOutputState } from '../../src/obs/types';
import { Stream } from '../../src/stream/Stream';

describe('ObsStreamDetector', () => {
  let detector: ObsStreamDetector;
  let mockClient: any;
  let mockStreamService: any;

  beforeEach(() => {
    mockClient = {
      connect: vi.fn(),
      disconnect: vi.fn(),
      on: vi.fn(),
      getStreamStatus: vi.fn()
    };

    mockStreamService = {
      createStream: vi.fn(),
      getStream: vi.fn(),
      getOrCreateStream: vi.fn(),
      updateStreamEnd: vi.fn(),
      deleteStream: vi.fn(),
      createPlatformStream: vi.fn(),
      getPlatformStreams: vi.fn(),
      removePlatformFromStream: vi.fn(),
      getStreamWithPlatforms: vi.fn()
    };

    const callbacks = {
      onStreamStart: vi.fn(),
      onStreamStop: vi.fn(),
      onStreamReconnecting: vi.fn(),
      onStreamReconnected: vi.fn(),
      onStreamStarting: vi.fn(),
      onStreamStopping: vi.fn()
    };

    detector = new ObsStreamDetector(mockClient, mockStreamService, callbacks);
  });

  describe('constructor', () => {
    it('should initialize with offline state', () => {
      const status = detector.getStatus();
      expect(status.isStreaming).toBe(false);
      expect(status.state).toBe('offline');
      expect(status.currentStream).toBeNull();
    });

    it('should register event handlers on client', () => {
      expect(mockClient.on).toHaveBeenCalledWith('connected', expect.any(Function));
      expect(mockClient.on).toHaveBeenCalledWith('StreamStateChanged', expect.any(Function));
      expect(mockClient.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockClient.on).toHaveBeenCalledWith('disconnected', expect.any(Function));
    });
  });

  describe('getStatus', () => {
    it('should return correct status when offline', () => {
      const status = detector.getStatus();
      expect(status).toEqual({
        isStreaming: false,
        state: 'offline',
        currentStream: null
      });
    });
  });

  describe('connect and disconnect', () => {
    it('should connect through client', async () => {
      mockClient.connect.mockResolvedValue(undefined);
      await detector.connect('ws://localhost:4455', 'password');
      expect(mockClient.connect).toHaveBeenCalledWith('ws://localhost:4455', 'password');
    });

    it('should disconnect through client', async () => {
      mockClient.disconnect.mockResolvedValue(undefined);
      await detector.disconnect();
      expect(mockClient.disconnect).toHaveBeenCalled();
    });
  });

  describe('handleStreamStateChanged', () => {
    it('should handle starting state', () => {
      const callbacks = (detector as any).callbacks;
      mockStreamService.createStream.mockResolvedValue(undefined);

      const stateChangedHandler = mockClient.on.mock.calls.find(call =>
        call[0] === 'StreamStateChanged'
      )?.[1];

      if (stateChangedHandler) {
        stateChangedHandler({
          outputActive: false,
          outputState: ObsOutputState.Starting
        });
      }

      expect(callbacks.onStreamStarting).toHaveBeenCalled();
    });

    it('should handle started state and create stream', async () => {
      const callbacks = (detector as any).callbacks;
      mockStreamService.createStream.mockResolvedValue(undefined);

      callbacks.onStreamStart.mockReset();
      mockClient.on.mockReset();

      const newDetector = new ObsStreamDetector(mockClient, mockStreamService, callbacks);

      const stateChangedHandler = mockClient.on.mock.calls.find(call =>
        call[0] === 'StreamStateChanged'
      )?.[1];

      if (stateChangedHandler) {
        await stateChangedHandler({
          outputActive: true,
          outputState: ObsOutputState.Started
        });
      }

      expect(callbacks.onStreamStart).toHaveBeenCalled();
      expect(mockStreamService.createStream).toHaveBeenCalled();
    });

    it('should handle stopping state', () => {
      const callbacks = (detector as any).callbacks;

      const stateChangedHandler = mockClient.on.mock.calls.find(call =>
        call[0] === 'StreamStateChanged'
      )?.[1];

      if (stateChangedHandler) {
        stateChangedHandler({
          outputActive: true,
          outputState: ObsOutputState.Stopping
        });
      }

      expect(callbacks.onStreamStopping).toHaveBeenCalled();
    });

    it('should handle reconnecting state', () => {
      const callbacks = (detector as any).callbacks;

      const stateChangedHandler = mockClient.on.mock.calls.find(call =>
        call[0] === 'StreamStateChanged'
      )?.[1];

      if (stateChangedHandler) {
        stateChangedHandler({
          outputActive: false,
          outputState: ObsOutputState.Reconnecting
        });
      }

      expect(callbacks.onStreamReconnecting).toHaveBeenCalled();
    });

    it('should handle stopped state and update stream', async () => {
      const callbacks = (detector as any).callbacks;
      mockStreamService.createStream.mockResolvedValue(undefined);
      mockStreamService.updateStreamEnd.mockResolvedValue(undefined);

      const stateChangedHandler = mockClient.on.mock.calls.find(call =>
        call[0] === 'StreamStateChanged'
      )?.[1];

      if (stateChangedHandler) {
        await stateChangedHandler({
          outputActive: true,
          outputState: ObsOutputState.Started
        });
      }

      callbacks.onStreamStop.mockReset();

      if (stateChangedHandler) {
        await stateChangedHandler({
          outputActive: false,
          outputState: ObsOutputState.Stopped
        });
      }

      expect(callbacks.onStreamStop).toHaveBeenCalled();
      expect(mockStreamService.updateStreamEnd).toHaveBeenCalled();
    });

    it('should handle reconnected state', async () => {
      const callbacks = (detector as any).callbacks;
      mockStreamService.createStream.mockResolvedValue(undefined);

      callbacks.onStreamReconnected.mockReset();

      const stateChangedHandler = mockClient.on.mock.calls.find(call =>
        call[0] === 'StreamStateChanged'
      )?.[1];

      if (stateChangedHandler) {
        await stateChangedHandler({
          outputActive: true,
          outputState: ObsOutputState.Started
        });
      }

      (detector as any).state = 'reconnecting';

      callbacks.onStreamReconnected.mockReset();

      if (stateChangedHandler) {
        await stateChangedHandler({
          outputActive: true,
          outputState: ObsOutputState.Reconnected
        });
      }

      expect(callbacks.onStreamReconnected).toHaveBeenCalled();
    });
  });

  describe('updateStateFromStatus', () => {
    it('should set live state when output is active', async () => {
      mockStreamService.createStream.mockResolvedValue(undefined);

      mockClient.getStreamStatus.mockResolvedValue({
        outputActive: true,
        outputReconnecting: false,
        outputTimecode: '00:00:00.000',
        outputDuration: 1000,
        outputCongestion: 0,
        outputBytes: 0,
        outputSkippedFrames: 0,
        outputTotalFrames: 0
      });

      const connectedHandler = mockClient.on.mock.calls.find(call =>
        call[0] === 'connected'
      )?.[1];

      if (connectedHandler) {
        await connectedHandler();
      }

      const status = detector.getStatus();
      expect(status.state).toBe('live');
    });

    it('should set reconnecting state when output is reconnecting', async () => {
      mockClient.getStreamStatus.mockResolvedValue({
        outputActive: true,
        outputReconnecting: true,
        outputTimecode: '00:00:00.000',
        outputDuration: 1000,
        outputCongestion: 0.5,
        outputBytes: 1000,
        outputSkippedFrames: 0,
        outputTotalFrames: 100
      });

      const connectedHandler = mockClient.on.mock.calls.find(call =>
        call[0] === 'connected'
      )?.[1];

      if (connectedHandler) {
        await connectedHandler();
      }

      const status = detector.getStatus();
      expect(status.state).toBe('reconnecting');
    });

    it('should set offline state when output is inactive', async () => {
      mockClient.getStreamStatus.mockResolvedValue({
        outputActive: false,
        outputReconnecting: false,
        outputTimecode: '00:00:00.000',
        outputDuration: 0,
        outputCongestion: 0,
        outputBytes: 0,
        outputSkippedFrames: 0,
        outputTotalFrames: 0
      });

      const connectedHandler = mockClient.on.mock.calls.find(call =>
        call[0] === 'connected'
      )?.[1];

      if (connectedHandler) {
        await connectedHandler();
      }

      const status = detector.getStatus();
      expect(status.state).toBe('offline');
    });
  });
});
