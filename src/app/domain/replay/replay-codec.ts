import { decode, encode } from '@axe/core/util/message-pack';
import { REPLAY_FORMAT_VERSION, type ReplayEvent, type ReplayManifest } from '@axe/domain/replay/replay-event';

interface ChunkEnvelope {
  v: number;
  events: unknown[];
}

interface ManifestEnvelope {
  v: number;
  manifest: unknown;
}

export function isSupportedReplayFormat(version: unknown): boolean {
  return typeof version === 'number' && version >= 1 && version <= REPLAY_FORMAT_VERSION;
}

export function encodeReplayEvents(events: readonly ReplayEvent[]): Uint8Array {
  const envelope: ChunkEnvelope = { v: REPLAY_FORMAT_VERSION, events: events.map(toWire) };
  return encode(envelope);
}

export function decodeReplayEvents(bytes: Uint8Array): ReplayEvent[] {
  const envelope = decode(bytes) as ChunkEnvelope | null;
  if (!envelope || !isSupportedReplayFormat(envelope.v) || !Array.isArray(envelope.events)) return [];
  return envelope.events.map(fromWire);
}

export function encodeReplayManifest(manifest: ReplayManifest): Uint8Array {
  const envelope: ManifestEnvelope = { v: REPLAY_FORMAT_VERSION, manifest };
  return encode(envelope);
}

export function decodeReplayManifest(bytes: Uint8Array): ReplayManifest | null {
  const envelope = decode(bytes) as ManifestEnvelope | null;
  if (!envelope || !isSupportedReplayFormat(envelope.v)) return null;
  return (envelope.manifest as ReplayManifest) ?? null;
}

function toWire(event: ReplayEvent): Record<string, unknown> {
  const wire: Record<string, unknown> = {
    seq: event.seq,
    at: event.at,
    t: event.t,
    kind: event.kind,
    actorId: event.actorId,
    detail: event.detail,
    visibility: event.visibility,
  };
  if (event.targetId != null) wire['targetId'] = event.targetId;
  if (event.patch != null) wire['patch'] = event.patch;
  if (event.merged != null) wire['merged'] = event.merged;
  return wire;
}

function fromWire(wire: unknown): ReplayEvent {
  return wire as ReplayEvent;
}
