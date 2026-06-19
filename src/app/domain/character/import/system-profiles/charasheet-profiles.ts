import { parseCharasheetCharacter } from '@axe/domain/character/import/charasheet-character-parser';
import { ImportedCharacter } from '@axe/domain/character/import/imported-character';
import {
  buildAra2CharasheetCharacter,
  isAra2CharasheetCharacter,
} from '@axe/domain/character/import/system-profiles/ara2-charasheet-profile';
import {
  buildCoc6CharasheetCharacter,
  isCoc6CharasheetCharacter,
} from '@axe/domain/character/import/system-profiles/coc6-charasheet-profile';
import {
  buildCoc7CharasheetCharacter,
  isCoc7CharasheetCharacter,
} from '@axe/domain/character/import/system-profiles/coc7-charasheet-profile';
import { resolveCharasheetDicebot } from '@axe/domain/character/import/system-profiles/dicebot-map';

function asString(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return '';
}

export function parseCharasheetCharacterForSystem(parsed: unknown): ImportedCharacter | null {
  if (isCoc6CharasheetCharacter(parsed)) return buildCoc6CharasheetCharacter(parsed);
  if (isCoc7CharasheetCharacter(parsed)) return buildCoc7CharasheetCharacter(parsed);
  if (isAra2CharasheetCharacter(parsed)) return buildAra2CharasheetCharacter(parsed);

  const character = parseCharasheetCharacter(parsed);
  if (character && character.dicebot.trim() === '') {
    character.dicebot = resolveCharasheetDicebot(asString((parsed as Record<string, unknown>)['game']));
  }
  return character;
}
