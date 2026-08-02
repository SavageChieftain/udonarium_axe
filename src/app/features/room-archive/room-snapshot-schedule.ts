export const SNAPSHOT_IDLE_DELAY_MS = 20_000;
export const SNAPSHOT_MAX_DELAY_MS = 180_000;
export const SNAPSHOT_BUSY_RETRY_MS = 5_000;

const HEAVY_CAPTURE_MS = 1_000;
const VERY_HEAVY_CAPTURE_MS = 3_000;

export interface SnapshotDelays {
  idle: number;
  max: number;
}

export function snapshotDelays(lastCaptureMs: number): SnapshotDelays {
  const factor = lastCaptureMs >= VERY_HEAVY_CAPTURE_MS ? 6 : lastCaptureMs >= HEAVY_CAPTURE_MS ? 3 : 1;
  return { idle: SNAPSHOT_IDLE_DELAY_MS * factor, max: SNAPSHOT_MAX_DELAY_MS * factor };
}
