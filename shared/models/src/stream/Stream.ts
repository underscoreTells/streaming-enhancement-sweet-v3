import type { StreamData } from './StreamData';
import type { StreamService } from './StreamService';
import { createStreamAdapter } from '../translators';
import type { Platform, StreamAdapter } from '../';

export class Stream {
  private data: StreamData;
  private service: StreamService;
  private cachedPlatforms: Map<Platform, StreamAdapter> | null = null;

  constructor(commonId: string, obsStartTime: Date, service: StreamService) {
    this.data = {
      commonId,
      obsStartTime,
      obsEndTime: null,
      createdAt: new Date()
    };
    this.service = service;
  }

  getCommonId(): string {
    return this.data.commonId;
  }

  getObsStartTime(): Date {
    return this.data.obsStartTime;
  }

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

  invalidateCache(): void {
    this.cachedPlatforms = null;
  }

  toStorage(): StreamData {
    return { ...this.data };
  }
}
