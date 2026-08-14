import { parseCcfoliaCharacter } from '@axe/domain/character/import/ccfolia-character-parser';
import { asString, toFiniteNumber } from '@axe/domain/character/import/imported-character';
import {
  createEmptyImportedRoom,
  ImportedRoom,
  ImportedRoomFace,
  ImportedRoomPanel,
  ImportedRoomPiece,
  ImportedRoomResource,
  ImportedRoomScene,
} from '@axe/domain/tabletop/import/ccfolia-room';

const IMAGE_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp']);

function asBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value != null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function countEntries(value: unknown): number {
  const record = asRecord(value);
  return record ? Object.keys(record).length : 0;
}

function parseResources(raw: unknown): ImportedRoomResource[] {
  const record = asRecord(raw);
  if (!record) return [];
  const resources: ImportedRoomResource[] = [];
  for (const [fileName, entry] of Object.entries(record)) {
    const mime = asString(asRecord(entry)?.['type']).trim();
    if (fileName.trim() === '' || !IMAGE_MIME_TYPES.has(mime)) continue;
    resources.push({ fileName, mime });
  }
  return resources;
}

function parsePanel(raw: unknown, index: number): ImportedRoomPanel | null {
  const record = asRecord(raw);
  if (!record) return null;
  const imageFileName = asString(record['imageUrl']).trim();
  if (imageFileName === '') return null;

  return {
    imageFileName,
    x: toFiniteNumber(record['x'], 0),
    y: toFiniteNumber(record['y'], 0),
    z: toFiniteNumber(record['z'], 0),
    width: Math.max(toFiniteNumber(record['width'], 1), 1),
    height: Math.max(toFiniteNumber(record['height'], 1), 1),
    angle: toFiniteNumber(record['angle'], 0),
    order: toFiniteNumber(record['order'], index),
    locked: asBoolean(record['locked'], false),
    visible: asBoolean(record['visible'], true),
    memo: asString(record['memo']),
  };
}

function parseFaces(raw: unknown): ImportedRoomFace[] {
  if (!Array.isArray(raw)) return [];
  const faces: ImportedRoomFace[] = [];
  for (const entry of raw) {
    const record = asRecord(entry);
    if (!record) continue;
    const fileName = asString(record['iconUrl']).trim();
    if (fileName === '') continue;
    faces.push({ label: asString(record['label']).trim(), fileName });
  }
  return faces;
}

function parseScene(raw: unknown, index: number): ImportedRoomScene | null {
  const record = asRecord(raw);
  if (!record) return null;
  return {
    name: asString(record['name']).trim(),
    order: toFiniteNumber(record['order'], index),
    backgroundFileName: asString(record['backgroundUrl']).trim(),
    foregroundFileName: asString(record['foregroundUrl']).trim(),
    fieldWidth: Math.max(Math.round(toFiniteNumber(record['fieldWidth'], 0)), 0),
    fieldHeight: Math.max(Math.round(toFiniteNumber(record['fieldHeight'], 0)), 0),
  };
}

function parsePiece(raw: unknown): ImportedRoomPiece | null {
  const record = asRecord(raw);
  if (!record) return null;
  const character = parseCcfoliaCharacter({ data: record });
  if (!character) return null;

  const iconFileName = character.iconUrl;
  character.iconUrl = '';

  return {
    character,
    x: toFiniteNumber(record['x'], 0),
    y: toFiniteNumber(record['y'], 0),
    width: Math.max(toFiniteNumber(record['width'], 1), 1),
    height: Math.max(toFiniteNumber(record['height'], 1), 1),
    angle: toFiniteNumber(record['angle'], 0),
    active: asBoolean(record['active'], true),
    secret: asBoolean(record['secret'], false),
    invisible: asBoolean(record['invisible'], false),
    hideStatus: asBoolean(record['hideStatus'], false),
    owner: asString(record['owner']).trim(),
    iconFileName,
    faces: parseFaces(record['faces']),
  };
}

/**
 * ココフォリアのルームデータ ZIP に含まれる `__data.json` かどうかを判定する。
 * 最小条件は `meta.version` と `entities` の 2 つ。
 */
export function isCcfoliaRoomData(parsed: unknown): boolean {
  const record = asRecord(parsed);
  if (!record) return false;
  if (asRecord(record['entities']) == null) return false;
  return asString(asRecord(record['meta'])?.['version']).trim() !== '';
}

/**
 * `__data.json` を AXE 側の正規化モデルへ変換する。
 * `decks` / `effects` / `scenes` は内部スキーマが未確定のため写さず、件数だけ skipped へ残す。
 */
export function parseCcfoliaRoom(parsed: unknown): ImportedRoom | null {
  if (!isCcfoliaRoomData(parsed)) return null;
  const record = parsed as Record<string, unknown>;
  const entities = asRecord(record['entities'])!;
  const roomEntity = asRecord(entities['room']) ?? {};

  const room = createEmptyImportedRoom();
  room.version = asString(asRecord(record['meta'])?.['version']).trim();
  room.fieldWidth = Math.max(Math.round(toFiniteNumber(roomEntity['fieldWidth'], 0)), 0);
  room.fieldHeight = Math.max(Math.round(toFiniteNumber(roomEntity['fieldHeight'], 0)), 0);
  room.backgroundFileName = asString(roomEntity['backgroundUrl']).trim();
  room.foregroundFileName = asString(roomEntity['foregroundUrl']).trim();
  room.resources = parseResources(record['resources']);

  const items = asRecord(entities['items']) ?? {};
  let index = 0;
  for (const value of Object.values(items)) {
    const panel = parsePanel(value, index);
    index++;
    if (panel) room.panels.push(panel);
    else room.skipped.panels++;
  }
  room.panels.sort((a, b) => a.order - b.order);

  const characters = asRecord(entities['characters']) ?? {};
  for (const value of Object.values(characters)) {
    const piece = parsePiece(value);
    if (piece) room.pieces.push(piece);
  }

  const scenes = asRecord(entities['scenes']) ?? {};
  let sceneIndex = 0;
  for (const value of Object.values(scenes)) {
    const scene = parseScene(value, sceneIndex);
    sceneIndex++;
    if (scene) room.scenes.push(scene);
  }
  room.scenes.sort((a, b) => a.order - b.order);

  room.skipped.decks = countEntries(entities['decks']);
  room.skipped.effects = countEntries(entities['effects']);

  return room;
}
