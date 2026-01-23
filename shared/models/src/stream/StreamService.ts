import type { Stream } from './Stream';
import type { Platform } from '../Platform';
import type { PlatformStream } from '../Stream';
import type { PlatformStreamRecord } from './PlatformStreamRecord';

export interface StreamService {
  createStream(commonId: string, obsStartTime: Date): Promise<void>;
  getStream(commonId: string): Promise<Stream | null>;
  getOrCreateStream(commonId: string, obsStartTime: Date): Promise<Stream>;
  updateStreamEnd(commonId: string, obsEndTime: Date): Promise<void>;
  deleteStream(commonId: string): Promise<void>;

  createPlatformStream(commonId: string, platformStream: PlatformStream): Promise<PlatformStreamRecord>;
  getPlatformStreams(commonId: string): Promise<PlatformStreamRecord[]>;
  removePlatformFromStream(commonId: string, platform: Platform): Promise<void>;

  getStreamWithPlatforms(commonId: string): Promise<Stream>;
}
