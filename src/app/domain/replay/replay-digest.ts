/**
 * 記録 1 本から「今日のまとめ」を作る。
 *
 * 数えるのは記録に残っているものだけ。足りない分は黙って埋めず、数えないままにする。
 * とくに **誰が誰に与えたダメージかは出さない** — `actorId` は値をいじった人であって、
 * 攻撃した人ではない。GM が敵の HP を減らせば actorId は GM になる。
 * 受けた側だけを数え、与えた側は名指ししない。
 *
 * 名前は入れず、見出しの鍵（i18n キー）と数だけを返す。文言は呼ぶ側が決める。
 */

import { type DiceRollDetail, parseDiceRollDetail } from '@axe/domain/dice/dice-roll-detail';
import {
  canViewReplayEvent,
  findActorAt,
  findTargetAt,
  type ReplayEvent,
  ReplayEventKind,
  type ReplayManifest,
  type ReplayViewer,
} from '@axe/domain/replay/replay-event';

export interface ReplayDigestNumbers {
  readonly elapsedMs: number;
  readonly messages: number;
  readonly diceRolls: number;
  readonly effects: number;
  readonly rounds: number;
  readonly speakers: number;
}

export interface ReplayDigestSpeaker {
  readonly userId: string;
  readonly name: string;
  readonly messages: number;
  readonly diceRolls: number;
}

/** 人別のダイスの出方。企画どおり、出目が記録に残っている分だけを数える。 */
export interface ReplayDigestFortune {
  readonly userId: string;
  readonly name: string;
  /** 出目が読めた振りの回数。 */
  readonly rolls: number;
  readonly dice: number;
  readonly average: number;
  readonly best: number;
  readonly worst: number;
  readonly criticals: number;
  readonly fumbles: number;
  readonly successes: number;
  readonly failures: number;
}

/** コマ別の受けた増減。与えた側は出さない。 */
export interface ReplayDigestLedgerRow {
  readonly targetId: string;
  readonly name: string;
  readonly damage: number;
  readonly heal: number;
  readonly biggestHit: number;
  readonly biggestHitLabel: string;
}

export interface ReplayDigestAward {
  readonly key: string;
  readonly name: string;
  readonly value: number;
}

export interface ReplayDigest {
  readonly roomName: string;
  readonly startedAt: number;
  readonly numbers: ReplayDigestNumbers;
  readonly speakers: readonly ReplayDigestSpeaker[];
  readonly fortunes: readonly ReplayDigestFortune[];
  readonly ledger: readonly ReplayDigestLedgerRow[];
  readonly awards: readonly ReplayDigestAward[];
  /** 出目が 1 つも残っていない記録。運勢の欄を「出せません」と言うために持つ。 */
  readonly hasDiceDetail: boolean;
  /** 増減の記録が 1 つも無い。ダメージ帳を「出せません」と言うために持つ。 */
  readonly hasLedger: boolean;
}

export const EMPTY_REPLAY_DIGEST: ReplayDigest = {
  roomName: '',
  startedAt: 0,
  numbers: { elapsedMs: 0, messages: 0, diceRolls: 0, effects: 0, rounds: 0, speakers: 0 },
  speakers: [],
  fortunes: [],
  ledger: [],
  awards: [],
  hasDiceDetail: false,
  hasLedger: false,
};

/** 称号を出すのに要る最低限。1 回振っただけの人を不運王にしない。 */
const MIN_ROLLS_FOR_AWARD = 3;
const MAX_AWARDS = 4;

interface ChangeEntry {
  kind: string;
  delta: number;
  name: string;
}

export function buildReplayDigest(
  events: readonly ReplayEvent[],
  manifest: Pick<ReplayManifest, 'roomName' | 'startedAt' | 'actors' | 'targets'>,
  viewer: ReplayViewer
): ReplayDigest {
  const visible = events.filter((event) => canViewReplayEvent(event, viewer));
  if (visible.length < 1) return { ...EMPTY_REPLAY_DIGEST, roomName: manifest.roomName, startedAt: manifest.startedAt };

  const speakers = new Map<string, { name: string; messages: number; diceRolls: number }>();
  const fortunes = new Map<string, MutableFortune>();
  const ledger = new Map<string, MutableLedgerRow>();
  let effects = 0;
  let rounds = 0;
  let hasDiceDetail = false;
  let hasLedger = false;

  for (const event of visible) {
    switch (event.kind) {
      case ReplayEventKind.ChatMessage:
        countSpeech(speakers, event, manifest, 'messages');
        break;
      case ReplayEventKind.ChatDice: {
        countSpeech(speakers, event, manifest, 'diceRolls');
        const detail = parseDiceRollDetail(asString(event.detail['dicebot']));
        if (detail) {
          hasDiceDetail = true;
          collectFortune(fortunes, event, manifest, detail);
        }
        break;
      }
      case ReplayEventKind.EffectCast:
        effects++;
        break;
      case ReplayEventKind.TurnChange:
        rounds = Math.max(rounds, Number(event.detail['round'] ?? 0));
        break;
      case ReplayEventKind.ObjectValue: {
        // 増減は 2 通りの経路で残りうる。まとめて数えられる `changes` の側だけを見る。
        const changes = changesOf(event.detail['changes']);
        if (changes.length < 1) break;
        hasLedger = true;
        collectLedger(ledger, event, manifest, changes);
        break;
      }
      default:
        break;
    }
  }

  const speakerRows = [...speakers.entries()]
    .map(([userId, row]) => ({ userId, ...row }))
    .sort((a, b) => b.messages - a.messages || b.diceRolls - a.diceRolls || a.name.localeCompare(b.name));
  const fortuneRows = [...fortunes.values()].map(sealFortune).sort((a, b) => b.rolls - a.rolls);
  const ledgerRows = [...ledger.values()]
    .map((row) => ({ ...row }))
    .sort((a, b) => b.damage - a.damage || b.heal - a.heal);

  return {
    roomName: manifest.roomName,
    startedAt: manifest.startedAt,
    numbers: {
      elapsedMs: Math.max(0, visible[visible.length - 1].t - visible[0].t),
      messages: speakerRows.reduce((total, row) => total + row.messages, 0),
      diceRolls: speakerRows.reduce((total, row) => total + row.diceRolls, 0),
      effects,
      rounds,
      speakers: speakerRows.filter((row) => row.messages > 0).length,
    },
    speakers: speakerRows,
    fortunes: fortuneRows,
    ledger: ledgerRows,
    awards: buildAwards(speakerRows, fortuneRows, ledgerRows),
    hasDiceDetail,
    hasLedger,
  };
}

interface MutableFortune {
  userId: string;
  name: string;
  rolls: number;
  dice: number;
  total: number;
  best: number;
  worst: number;
  criticals: number;
  fumbles: number;
  successes: number;
  failures: number;
}

interface MutableLedgerRow {
  targetId: string;
  name: string;
  damage: number;
  heal: number;
  biggestHit: number;
  biggestHitLabel: string;
}

function countSpeech(
  speakers: Map<string, { name: string; messages: number; diceRolls: number }>,
  event: ReplayEvent,
  manifest: Pick<ReplayManifest, 'actors'>,
  key: 'messages' | 'diceRolls'
): void {
  const userId = event.actorId;
  if (userId.length < 1) return;
  const row = speakers.get(userId) ?? { name: actorNameOf(manifest, event), messages: 0, diceRolls: 0 };
  row[key]++;
  if (row.name.length < 1) row.name = actorNameOf(manifest, event);
  speakers.set(userId, row);
}

function collectFortune(
  fortunes: Map<string, MutableFortune>,
  event: ReplayEvent,
  manifest: Pick<ReplayManifest, 'actors'>,
  detail: DiceRollDetail
): void {
  const userId = event.actorId;
  if (userId.length < 1) return;

  const row =
    fortunes.get(userId) ??
    ({
      userId,
      name: actorNameOf(manifest, event),
      rolls: 0,
      dice: 0,
      total: 0,
      best: 0,
      worst: 0,
      criticals: 0,
      fumbles: 0,
      successes: 0,
      failures: 0,
    } satisfies MutableFortune);

  row.rolls++;
  for (const face of detail.faces) {
    if (!Number.isFinite(face.value)) continue;
    row.dice++;
    row.total += face.value;
    row.best = row.best < 1 ? face.value : Math.max(row.best, face.value);
    row.worst = row.worst < 1 ? face.value : Math.min(row.worst, face.value);
  }
  if (detail.outcome === 'critical') row.criticals++;
  if (detail.outcome === 'fumble') row.fumbles++;
  if (detail.outcome === 'success') row.successes++;
  if (detail.outcome === 'failure') row.failures++;

  fortunes.set(userId, row);
}

function sealFortune(row: MutableFortune): ReplayDigestFortune {
  return {
    userId: row.userId,
    name: row.name,
    rolls: row.rolls,
    dice: row.dice,
    average: row.dice > 0 ? Number((row.total / row.dice).toFixed(2)) : 0,
    best: row.best,
    worst: row.worst,
    criticals: row.criticals,
    fumbles: row.fumbles,
    successes: row.successes,
    failures: row.failures,
  };
}

function collectLedger(
  ledger: Map<string, MutableLedgerRow>,
  event: ReplayEvent,
  manifest: Pick<ReplayManifest, 'targets'>,
  changes: readonly ChangeEntry[]
): void {
  const targetId = event.targetId ?? '';
  if (targetId.length < 1) return;

  const row = ledger.get(targetId) ?? {
    targetId,
    name: targetNameOf(manifest, targetId, event.seq),
    damage: 0,
    heal: 0,
    biggestHit: 0,
    biggestHitLabel: '',
  };

  for (const change of changes) {
    const amount = Math.abs(change.delta);
    if (!Number.isFinite(amount) || amount === 0) continue;
    if (change.kind === 'damage') {
      row.damage += amount;
      if (amount > row.biggestHit) {
        row.biggestHit = amount;
        row.biggestHitLabel = change.name;
      }
    } else {
      row.heal += amount;
    }
  }

  ledger.set(targetId, row);
}

function buildAwards(
  speakers: readonly ReplayDigestSpeaker[],
  fortunes: readonly ReplayDigestFortune[],
  ledger: readonly ReplayDigestLedgerRow[]
): ReplayDigestAward[] {
  const awards: ReplayDigestAward[] = [];
  const rolled = fortunes.filter((row) => row.rolls >= MIN_ROLLS_FOR_AWARD);

  const unlucky = pick(rolled, (row) => row.fumbles);
  if (unlucky) awards.push({ key: 'unlucky', name: unlucky.name, value: unlucky.fumbles });

  const blessed = pick(rolled, (row) => row.criticals);
  if (blessed) awards.push({ key: 'blessed', name: blessed.name, value: blessed.criticals });

  const talkative = pick(speakers, (row) => row.messages);
  if (talkative && speakers.length > 1)
    awards.push({ key: 'talkative', name: talkative.name, value: talkative.messages });

  const battered = pick(ledger, (row) => row.damage);
  if (battered) awards.push({ key: 'battered', name: battered.name, value: Math.round(battered.damage) });

  return awards.slice(0, MAX_AWARDS);
}

/** いちばん多い 1 人。並びが同じ数なら出さない — 誰か 1 人を指せてこその称号。 */
function pick<T>(rows: readonly T[], valueOf: (row: T) => number): T | null {
  if (rows.length < 1) return null;
  const sorted = [...rows].sort((a, b) => valueOf(b) - valueOf(a));
  const top = valueOf(sorted[0]);
  if (top < 1) return null;
  if (sorted.length > 1 && valueOf(sorted[1]) === top) return null;
  return sorted[0];
}

function actorNameOf(manifest: Pick<ReplayManifest, 'actors'>, event: ReplayEvent): string {
  return findActorAt(manifest, event.actorId, event.seq)?.name ?? '';
}

function targetNameOf(manifest: Pick<ReplayManifest, 'targets'>, identifier: string, seq: number): string {
  return findTargetAt(manifest, identifier, seq)?.name ?? '';
}

function changesOf(raw: unknown): ChangeEntry[] {
  if (!Array.isArray(raw)) return [];
  const entries: ChangeEntry[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const record = item as Record<string, unknown>;
    const delta = Number(record['delta'] ?? 0);
    if (!Number.isFinite(delta)) continue;
    entries.push({ kind: asString(record['kind']), delta, name: asString(record['name']) });
  }
  return entries;
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}
