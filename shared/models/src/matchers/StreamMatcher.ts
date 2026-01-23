import type { StreamService } from '../stream/StreamService';
import type { Stream } from '../stream/Stream';
import type { Platform } from '../Platform';
import type { PlatformStream } from '../Stream';

interface DateRange {
  startTime: Date;
  endTime: Date;
}

function calculateOverlapPercent(streamA: DateRange, streamB: DateRange): number {
  const overlapStart = Math.max(streamA.startTime.getTime(), streamB.startTime.getTime());
  const overlapEnd = Math.min(streamA.endTime.getTime(), streamB.endTime.getTime());
  const overlapMs = Math.max(0, overlapEnd - overlapStart);

  const durationA = streamA.endTime.getTime() - streamA.startTime.getTime();
  const durationB = streamB.endTime.getTime() - streamB.startTime.getTime();

  if (durationA === 0 || durationB === 0) {
    return 0;
  }

  const shorterDuration = Math.min(durationA, durationB);
  return overlapMs / shorterDuration;
}

function getEndTime(platformStream: { endTime?: Date | null }): Date {
  return platformStream.endTime || new Date();
}

async function shouldMatch(
  stream: Stream,
  platformStream: PlatformStream,
  threshold: number = 0.85
): Promise<boolean> {
  const streamStart = stream.getObsStartTime();
  const streamEnd = (await stream.getObsEndTime()) || new Date();

  const platformEnd = getEndTime(platformStream);

  const overlapPercent = calculateOverlapPercent(
    { startTime: streamStart, endTime: streamEnd },
    { startTime: platformStream.startTime, endTime: platformEnd }
  );

  return overlapPercent >= threshold;
}

export interface StreamMatcher {
  matchAllPlatformStreams(
    streamService: StreamService,
    twitchStreams: PlatformStream[],
    kickStreams: PlatformStream[],
    youtubeStreams: PlatformStream[]
  ): Promise<Stream[]>;

  matchNewPlatformStreams(
    streamService: StreamService,
    existingStreams: Stream[],
    newPlatformStreams: PlatformStream[]
  ): Promise<{
    addedToExisting: Map<string, PlatformStream[]>;
    newStreams: Stream[];
  }>;

  splitStream(
    streamService: StreamService,
    stream: Stream
  ): Promise<Stream[]>;

  calculateOverlapPercent(streamA: DateRange, streamB: DateRange): number;
}

export function createStreamMatcher(thresholdPercent: number = 0.85): StreamMatcher {
  const matchAllPlatformStreams = async (
    streamService: StreamService,
    twitchStreams: PlatformStream[],
    kickStreams: PlatformStream[],
    youtubeStreams: PlatformStream[]
  ): Promise<Stream[]> => {
    const allPlatformStreams = [
      ...twitchStreams.map((s) => ({ stream: s, platform: s.platform as Platform })),
      ...kickStreams.map((s) => ({ stream: s, platform: s.platform as Platform })),
      ...youtubeStreams.map((s) => ({ stream: s, platform: s.platform as Platform })),
    ];

    allPlatformStreams.sort(
      (a, b) => a.stream.startTime.getTime() - b.stream.startTime.getTime()
    );

    const groups: Array<{
      streams: Array<{ stream: PlatformStream; platform: Platform }>;
    }> = [];

    for (const item of allPlatformStreams) {
      let matched = false;

      for (const group of groups) {
        const groupStart = group.streams[0].stream.startTime;
        const groupEndTimes = group.streams.map((s) => getEndTime(s.stream)).filter(
          (d): d is Date => d.getTime() > 0
        );
        const groupEnd = groupEndTimes.length > 0
          ? new Date(Math.max(...groupEndTimes.map((d) => d.getTime())))
          : new Date();

        const overlapPercent = calculateOverlapPercent(
          { startTime: groupStart, endTime: groupEnd },
          { startTime: item.stream.startTime, endTime: getEndTime(item.stream) }
        );

        if (overlapPercent >= thresholdPercent) {
          group.streams.push(item);
          matched = true;
          break;
        }
      }

      if (!matched) {
        groups.push({ streams: [item] });
      }
    }

    const result: Stream[] = [];

    for (const group of groups) {
      const allStartTimes = group.streams.map((s) => s.stream.startTime);
      const allEndTimes = group.streams.map((s) => s.stream.endTime).filter(
        (e): e is Date => e !== null && e !== undefined
      );

      const earliestStart = new Date(Math.min(...allStartTimes.map((d) => d.getTime())));
      const latestEnd = allEndTimes.length > 0
        ? new Date(Math.max(...allEndTimes.map((d) => d.getTime())))
        : null;

      const commonId = crypto.randomUUID();
      await streamService.createStream(commonId, earliestStart);

      const stream = await streamService.getStream(commonId) as Stream;

      for (const item of group.streams) {
        await streamService.createPlatformStream(commonId, item.stream);
      }

      if (latestEnd) {
        await streamService.updateStreamEnd(commonId, latestEnd);
      }

      result.push(stream);
    }

    return result;
  };

  const matchNewPlatformStreams = async (
    streamService: StreamService,
    existingStreams: Stream[],
    newPlatformStreams: PlatformStream[]
  ): Promise<{
    addedToExisting: Map<string, PlatformStream[]>;
    newStreams: Stream[];
  }> => {
    const addedToExisting = new Map<string, PlatformStream[]>();
    const newStreamPromises: Promise<Stream>[] = [];

    for (const newPlatformStream of newPlatformStreams) {
      let matched = false;

      for (const existingStream of existingStreams) {
        const streamStart = existingStream.getObsStartTime();
        const streamEnd = (await existingStream.getObsEndTime()) || new Date();

        const overlapPercent = calculateOverlapPercent(
          { startTime: streamStart, endTime: streamEnd },
          { startTime: newPlatformStream.startTime, endTime: getEndTime(newPlatformStream) }
        );

        if (overlapPercent >= thresholdPercent) {
          await streamService.createPlatformStream(existingStream.getCommonId(), newPlatformStream);

          const commonId = existingStream.getCommonId();
          if (!addedToExisting.has(commonId)) {
            addedToExisting.set(commonId, []);
          }
          addedToExisting.get(commonId)!.push(newPlatformStream);

          matched = true;
          break;
        }
      }

      if (!matched) {
        const commonId = crypto.randomUUID();
        newStreamPromises.push(
          streamService.createStream(commonId, newPlatformStream.startTime).then(async () => {
            await streamService.createPlatformStream(commonId, newPlatformStream);
            return await streamService.getStream(commonId) as Stream;
          })
        );
      }
    }

    const newStreams = await Promise.all(newStreamPromises);

    return { addedToExisting, newStreams };
  };

  const splitStream = async (
    streamService: StreamService,
    stream: Stream
  ): Promise<Stream[]> => {
    const platformRecords = await stream.getPlatforms();

    const streamStart = stream.getObsStartTime();
    const streamEnd = (await stream.getObsEndTime()) || new Date();

    let splitPlatform: { platform: Platform; adapter: any } | null = null;

    for (const [platform, adapter] of platformRecords.entries()) {
      const platformData = adapter.toStorage() as PlatformStream;

      const overlapPercent = calculateOverlapPercent(
        { startTime: streamStart, endTime: streamEnd },
        { startTime: platformData.startTime, endTime: getEndTime(platformData) }
      );

      if (overlapPercent < thresholdPercent) {
        splitPlatform = { platform, adapter };
        break;
      }
    }

    if (!splitPlatform) {
      return [stream];
    }

    const platformData = splitPlatform.adapter.toStorage() as PlatformStream;
    const newCommonId = crypto.randomUUID();
    await streamService.createStream(newCommonId, platformData.startTime);

    const newStream = await streamService.getStream(newCommonId) as Stream;
    await streamService.createPlatformStream(newCommonId, platformData);

    await streamService.removePlatformFromStream(stream.getCommonId(), splitPlatform.platform);

    const remainingPlatformsResult = await stream.getPlatforms();

    if (remainingPlatformsResult.size > 0) {
      const endTimes: Date[] = [];
      for (const adapter of remainingPlatformsResult.values()) {
        const data = adapter.toStorage() as PlatformStream;
        if (data.endTime) {
          endTimes.push(data.endTime);
        }
      }
      if (endTimes.length > 0) {
        const latestEnd = new Date(Math.max(...endTimes.map((d) => d.getTime())));
        await streamService.updateStreamEnd(stream.getCommonId(), latestEnd);
      }
    } else {
      await streamService.deleteStream(stream.getCommonId());
      return [newStream];
    }

    return [stream, newStream];
  };

  return {
    matchAllPlatformStreams,
    matchNewPlatformStreams,
    splitStream,
    calculateOverlapPercent
  };
}
