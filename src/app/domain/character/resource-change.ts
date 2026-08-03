export type ResourceChangeKind = 'damage' | 'heal';

export type ResourceChangeSeverity = 'small' | 'medium' | 'large';

const MEDIUM_RATIO = 0.15;
const LARGE_RATIO = 0.4;

export interface ResourceSnapshot {
  current: number;
  max: number;
}

export interface ResourceChange {
  identifier: string;
  name: string;
  kind: ResourceChangeKind;
  delta: number;
  label: string;
  ratio: number;
}

export function resourceChangeSeverity(ratio: number): ResourceChangeSeverity {
  if (!Number.isFinite(ratio) || ratio <= 0) return 'medium';
  if (ratio < MEDIUM_RATIO) return 'small';
  if (ratio < LARGE_RATIO) return 'medium';
  return 'large';
}

export function loudestChangeRatio(changes: readonly ResourceChange[]): number {
  return changes.reduce((loudest, change) => Math.max(loudest, change.ratio), 0);
}

export function diffResourceSnapshots(
  before: ReadonlyMap<string, ResourceSnapshot>,
  after: ReadonlyMap<string, ResourceSnapshot>,
  nameOf: (identifier: string) => string
): ResourceChange[] {
  const changes: ResourceChange[] = [];

  for (const [identifier, next] of after) {
    const previous = before.get(identifier);
    if (!previous) continue;

    const delta = next.current - previous.current + (next.max - previous.max);
    if (delta === 0) continue;

    const max = Math.max(previous.max, next.max);
    changes.push({
      identifier,
      name: nameOf(identifier),
      kind: delta < 0 ? 'damage' : 'heal',
      delta,
      label: `${delta < 0 ? '' : '+'}${trim(delta)}`,
      ratio: Number.isFinite(max) && max > 0 ? Math.abs(delta) / max : 0,
    });
  }
  return changes;
}

function trim(value: number): string {
  return Number(value.toFixed(2)).toString();
}
