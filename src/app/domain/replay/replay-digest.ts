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

/**
 * 人別のダイスの出方。出目が記録に残っている分だけを数える。
 *
 * 平均・最高・最低は **1 回の振りの目の合計** で見る。1D100 は十の位と一の位の 2 面に
 * 分かれて残るので、面ごとに数えると 70 と 8 の平均 39 のような数になってしまう。
 * また、卓の途中でシステムが変わると尺度も変わるので、いちばん多く振った系統の分だけを見る。
 */
export interface ReplayDigestFortune {
  readonly userId: string;
  readonly name: string;
  /** 出目が読めた振りの回数。 */
  readonly rolls: number;
  /** 平均などを取った系統。振った系統が複数あるときは、いちばん多いもの。 */
  readonly system: string;
  /** その系統で振った回数。平均・最高・最低はこの回数の分。 */
  readonly counted: number;
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

interface ChangeEntry {
  kind: string;
  delta: number;
  name: string;
}

export function buildReplayDigest(
  events: readonly ReplayEvent[],
  manifest: Pick<ReplayManifest, 'roomName' | 'startedAt' | 'endedAt' | 'actors' | 'targets'>,
  viewer: ReplayViewer
): ReplayDigest {
  const visible = events.filter((event) => canViewReplayEvent(event, viewer));
  if (visible.length < 1) return { ...EMPTY_REPLAY_DIGEST, roomName: manifest.roomName, startedAt: manifest.startedAt };

  const speakers = new Map<string, { name: string; messages: number; diceRolls: number }>();
  const fortunes = new Map<string, MutableFortune>();
  const ledger = new Map<string, MutableLedgerRow>();
  let messages = 0;
  let diceRolls = 0;
  let effects = 0;
  let rounds = 0;
  let hasDiceDetail = false;
  let hasLedger = false;

  for (const event of visible) {
    switch (event.kind) {
      case ReplayEventKind.ChatMessage:
        messages++;
        countSpeech(speakers, event, manifest, 'messages');
        break;
      case ReplayEventKind.ChatDice: {
        diceRolls++;
        countSpeech(speakers, event, manifest, 'diceRolls');
        const detail = parseDiceRollDetail(asString(event.detail['dicebot']));
        if (detail && collectFortune(fortunes, event, manifest, detail)) hasDiceDetail = true;
        break;
      }
      case ReplayEventKind.EffectCast:
        effects++;
        break;
      case ReplayEventKind.TurnChange: {
        const round = Number(event.detail['round'] ?? 0);
        if (Number.isFinite(round)) rounds = Math.max(rounds, round);
        break;
      }
      case ReplayEventKind.ObjectValue: {
        // 増減は 2 通りの経路で残りうる。まとめて数えられる `changes` の側だけを見る。
        const changes = changesOf(event.detail['changes']);
        if (changes.length < 1) break;
        if (collectLedger(ledger, event, manifest, changes)) hasLedger = true;
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
  const ledgerRows = [...ledger.values()].map(sealLedgerRow).sort((a, b) => b.damage - a.damage || b.heal - a.heal);

  return {
    roomName: manifest.roomName,
    startedAt: manifest.startedAt,
    numbers: {
      // 卓の長さは読む人で変わらない。見えない出来事しか無い時間も卓の時間のうち。
      elapsedMs: elapsedOf(manifest, visible),
      messages,
      diceRolls,
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

interface SystemRolls {
  count: number;
  total: number;
  best: number;
  worst: number;
}

interface MutableFortune {
  userId: string;
  name: string;
  rolls: number;
  bySystem: Map<string, SystemRolls>;
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
): boolean {
  const userId = event.actorId;
  if (userId.length < 1) return false;

  const row =
    fortunes.get(userId) ??
    ({
      userId,
      name: actorNameOf(manifest, event),
      rolls: 0,
      bySystem: new Map<string, SystemRolls>(),
      criticals: 0,
      fumbles: 0,
      successes: 0,
      failures: 0,
    } satisfies MutableFortune);

  row.rolls++;
  const value = rollValueOf(detail);
  if (value !== null) {
    const rolls = row.bySystem.get(detail.system) ?? { count: 0, total: 0, best: value, worst: value };
    rolls.count++;
    rolls.total += value;
    rolls.best = Math.max(rolls.best, value);
    rolls.worst = Math.min(rolls.worst, value);
    row.bySystem.set(detail.system, rolls);
  }
  if (detail.outcome === 'critical') row.criticals++;
  if (detail.outcome === 'fumble') row.fumbles++;
  if (detail.outcome === 'success') row.successes++;
  if (detail.outcome === 'failure') row.failures++;

  fortunes.set(userId, row);
  return true;
}

/** 1 回の振りの目の合計。面が 1 つも読めなければ null。0 も出目なので既定値では潰さない。 */
function rollValueOf(detail: DiceRollDetail): number | null {
  let total = 0;
  let counted = 0;
  for (const face of detail.faces) {
    if (!Number.isFinite(face.value)) continue;
    total += face.value;
    counted++;
  }
  return counted > 0 ? total : null;
}

function sealFortune(row: MutableFortune): ReplayDigestFortune {
  let system = '';
  let rolls: SystemRolls | null = null;
  for (const [name, entry] of row.bySystem) {
    if (rolls && entry.count <= rolls.count) continue;
    system = name;
    rolls = entry;
  }

  return {
    userId: row.userId,
    name: row.name,
    rolls: row.rolls,
    system,
    counted: rolls?.count ?? 0,
    average: rolls && rolls.count > 0 ? Number((rolls.total / rolls.count).toFixed(2)) : 0,
    best: rolls?.best ?? 0,
    worst: rolls?.worst ?? 0,
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
): boolean {
  const targetId = event.targetId ?? '';
  if (targetId.length < 1) return false;

  const row = ledger.get(targetId) ?? {
    targetId,
    name: targetNameOf(manifest, targetId, event.seq),
    damage: 0,
    heal: 0,
    biggestHit: 0,
    biggestHitLabel: '',
  };

  let counted = false;
  for (const change of changes) {
    const amount = Math.abs(change.delta);
    if (!Number.isFinite(amount) || amount === 0) continue;
    // 増減は damage か heal のどちらか。読めない区分を回復に寄せると、削られた卓が癒やされた卓になる。
    if (change.kind !== 'damage' && change.kind !== 'heal') continue;
    counted = true;
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

  if (!counted) return false;
  ledger.set(targetId, row);
  return true;
}

function sealLedgerRow(row: MutableLedgerRow): ReplayDigestLedgerRow {
  return {
    ...row,
    damage: trim(row.damage),
    heal: trim(row.heal),
    biggestHit: trim(row.biggestHit),
  };
}

/** 端数のある増減を足すと二進小数の粕が出る。表に出す前に落とす。 */
function trim(value: number): number {
  return Number(value.toFixed(2));
}

function elapsedOf(manifest: Pick<ReplayManifest, 'startedAt' | 'endedAt'>, visible: readonly ReplayEvent[]): number {
  const recorded = (manifest.endedAt ?? 0) - manifest.startedAt;
  if (recorded > 0) return recorded;
  return Math.max(0, visible[visible.length - 1].t);
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
  if (battered) awards.push({ key: 'battered', name: battered.name, value: battered.damage });

  return awards;
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
