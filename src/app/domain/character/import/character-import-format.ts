import { isAppspotCharacter } from '@axe/domain/character/import/appspot-character-parser';
import { isCcfoliaCharacter, parseCcfoliaCharacter } from '@axe/domain/character/import/ccfolia-character-parser';
import { isCharasheetCharacter } from '@axe/domain/character/import/charasheet-character-parser';
import { ImportedCharacter } from '@axe/domain/character/import/imported-character';
import { parseAppspotCharacterForSystem } from '@axe/domain/character/import/system-profiles/appspot-profiles';
import { parseCharasheetCharacterForSystem } from '@axe/domain/character/import/system-profiles/charasheet-profiles';

/**
 * 貼り付けテキスト（JSON）から取り込みフォーマットを自動判別して正規化モデルへ変換する。
 * 対応形式: ココフォリア コマJSON / キャラクター保管所 JSON / キャラクターシート倉庫 JSON。
 * 判別不能なら null。
 *
 * いあきゃら・Charaeno・ゆとシート・TRPGスタジオ・CharaXiv 等の作成系サービスは
 * ココフォリア形式を出力するため、本ディスパッチャ 1 本で広範にカバーできる。
 */
export function parseImportedCharacterJson(json: unknown, systemHint?: string): ImportedCharacter | null {
  if (isCcfoliaCharacter(json)) return parseCcfoliaCharacter(json);
  if (isCharasheetCharacter(json)) return parseCharasheetCharacterForSystem(json);
  if (isAppspotCharacter(json)) return parseAppspotCharacterForSystem(json, systemHint);
  return null;
}

export function parseImportedCharacterText(text: string): ImportedCharacter | null {
  const trimmed = text.trim();
  if (trimmed === '') return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return null;
  }
  return parseImportedCharacterJson(parsed);
}
