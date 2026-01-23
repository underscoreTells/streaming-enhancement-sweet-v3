import type { Platform } from '../Platform';
import type { PlatformStream } from '../Stream';

export interface PlatformStreamRecord {
  id: string;
  commonId: string;
  platform: Platform;
  data: PlatformStream;
  createdAt: Date;
}
