export interface ReplayRecordingMeta {
  id: number;
  roomName: string;
  startedAt: number;
  endedAt: number | null;
  eventCount: number;
  byteSize: number;
}

export interface ReplayRecordingInput {
  roomName: string;
  startedAt: number;
}

export type ReplayRecordingUpdate = Partial<Pick<ReplayRecordingMeta, 'roomName' | 'endedAt'>> & {
  manifest?: Uint8Array;
};

export interface ReplayChunkInput {
  recordingId: number;
  index: number;
  seqStart: number;
  seqEnd: number;
  eventCount: number;
  bytes: Uint8Array;
}

export interface ReplayChunkRecord extends ReplayChunkInput {
  id: number;
}

export interface ReplayKeyframeInput {
  recordingId: number;
  seq: number;
  at: number;
  blob: Blob;
}

export interface ReplayKeyframeRecord extends ReplayKeyframeInput {
  id: number;
  byteSize: number;
}

export interface ReplayRetention {
  /** null なら本数で消さない。 */
  maxCount: number | null;
  /** null なら容量で消さない。 */
  maxTotalBytes: number | null;
}

/** 既定は消さない。残すかどうかは記録した人が決める。 */
export const DEFAULT_REPLAY_RETENTION: ReplayRetention = {
  maxCount: null,
  maxTotalBytes: null,
};

export abstract class ReplayLogStore {
  abstract isAvailable(): boolean;
  abstract createRecording(input: ReplayRecordingInput): Promise<number | null>;
  abstract updateRecording(id: number, update: ReplayRecordingUpdate): Promise<void>;
  abstract listRecordings(): Promise<ReplayRecordingMeta[]>;
  abstract getRecording(id: number): Promise<ReplayRecordingMeta | null>;
  abstract getManifest(id: number): Promise<Uint8Array | null>;
  abstract appendChunk(input: ReplayChunkInput): Promise<boolean>;
  abstract listChunks(recordingId: number): Promise<ReplayChunkRecord[]>;
  abstract putKeyframe(input: ReplayKeyframeInput): Promise<boolean>;
  abstract listKeyframes(recordingId: number): Promise<ReplayKeyframeRecord[]>;
  abstract removeRecording(id: number): Promise<void>;
  abstract clear(): Promise<void>;
}

export function sortRecordingsByNewest(metas: readonly ReplayRecordingMeta[]): ReplayRecordingMeta[] {
  return [...metas].sort((a, b) => b.startedAt - a.startedAt || b.id - a.id);
}

export function selectExpiredRecordings(
  metas: readonly ReplayRecordingMeta[],
  retention: ReplayRetention = DEFAULT_REPLAY_RETENTION,
  protectedId: number | null = null
): number[] {
  const sorted = sortRecordingsByNewest(metas);
  const expired: number[] = [];
  let keptBytes = 0;
  let isFull = false;

  sorted.forEach((meta, index) => {
    if (meta.id === protectedId) {
      keptBytes += meta.byteSize;
      return;
    }
    if (index === 0) {
      keptBytes += meta.byteSize;
      return;
    }
    const overCount = retention.maxCount != null && index >= retention.maxCount;
    const overBytes = retention.maxTotalBytes != null && keptBytes + meta.byteSize > retention.maxTotalBytes;
    if (isFull || overCount || overBytes) {
      isFull = true;
      expired.push(meta.id);
      return;
    }
    keptBytes += meta.byteSize;
  });

  return expired;
}
