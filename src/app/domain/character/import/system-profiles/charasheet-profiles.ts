import { parseCharasheetCharacter } from '@axe/domain/character/import/charasheet-character-parser';
import { CHARASHEET_LABEL_MAPS } from '@axe/domain/character/import/charasheet-label-maps.generated';
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
import {
  buildDx3CharasheetCharacter,
  isDx3CharasheetCharacter,
} from '@axe/domain/character/import/system-profiles/dx3-charasheet-profile';
import {
  buildElysionCharasheetCharacter,
  isElysionCharasheetCharacter,
} from '@axe/domain/character/import/system-profiles/elysion-charasheet-profile';
import {
  buildGorderCharasheetCharacter,
  isGorderCharasheetCharacter,
} from '@axe/domain/character/import/system-profiles/gorder-charasheet-profile';
import {
  buildGracreCharasheetCharacter,
  isGracreCharasheetCharacter,
} from '@axe/domain/character/import/system-profiles/gracre-charasheet-profile';
import {
  buildMkCharasheetCharacter,
  isMkCharasheetCharacter,
} from '@axe/domain/character/import/system-profiles/mk-charasheet-profile';
import {
  buildNechroCharasheetCharacter,
  isNechroCharasheetCharacter,
} from '@axe/domain/character/import/system-profiles/nechro-charasheet-profile';
import {
  buildNw3CharasheetCharacter,
  isNw3CharasheetCharacter,
} from '@axe/domain/character/import/system-profiles/nw3-charasheet-profile';
import {
  buildParablaCharasheetCharacter,
  isParablaCharasheetCharacter,
} from '@axe/domain/character/import/system-profiles/parabla-charasheet-profile';
import {
  buildRyutamaCharasheetCharacter,
  isRyutamaCharasheetCharacter,
} from '@axe/domain/character/import/system-profiles/ryutama-charasheet-profile';
import {
  buildSengenCharasheetCharacter,
  isSengenCharasheetCharacter,
} from '@axe/domain/character/import/system-profiles/sengen-charasheet-profile';
import {
  buildSwordWorldCharasheetCharacter,
  isSwordWorldCharasheetCharacter,
} from '@axe/domain/character/import/system-profiles/swordworld-charasheet-profile';
import {
  buildSwordWorld2CharasheetCharacter,
  isSwordWorld2CharasheetCharacter,
} from '@axe/domain/character/import/system-profiles/swordworld2-charasheet-profile';
import {
  buildUtakazeCharasheetCharacter,
  isUtakazeCharasheetCharacter,
} from '@axe/domain/character/import/system-profiles/utakaze-charasheet-profile';

function asString(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return '';
}

export function parseCharasheetCharacterForSystem(
  parsed: unknown,
  labelMap?: Record<string, string>
): ImportedCharacter | null {
  if (isCoc6CharasheetCharacter(parsed)) return buildCoc6CharasheetCharacter(parsed);
  if (isCoc7CharasheetCharacter(parsed)) return buildCoc7CharasheetCharacter(parsed);
  if (isAra2CharasheetCharacter(parsed)) return buildAra2CharasheetCharacter(parsed);
  if (isDx3CharasheetCharacter(parsed)) return buildDx3CharasheetCharacter(parsed);
  if (isElysionCharasheetCharacter(parsed)) return buildElysionCharasheetCharacter(parsed);
  if (isGracreCharasheetCharacter(parsed)) return buildGracreCharasheetCharacter(parsed);
  if (isGorderCharasheetCharacter(parsed)) return buildGorderCharasheetCharacter(parsed);
  if (isMkCharasheetCharacter(parsed)) return buildMkCharasheetCharacter(parsed);
  if (isSwordWorld2CharasheetCharacter(parsed)) return buildSwordWorld2CharasheetCharacter(parsed);
  if (isSwordWorldCharasheetCharacter(parsed)) return buildSwordWorldCharasheetCharacter(parsed);
  if (isNechroCharasheetCharacter(parsed)) return buildNechroCharasheetCharacter(parsed);
  if (isNw3CharasheetCharacter(parsed)) return buildNw3CharasheetCharacter(parsed);
  if (isParablaCharasheetCharacter(parsed)) return buildParablaCharasheetCharacter(parsed);
  if (isRyutamaCharasheetCharacter(parsed)) return buildRyutamaCharasheetCharacter(parsed);
  if (isSengenCharasheetCharacter(parsed)) return buildSengenCharasheetCharacter(parsed);
  if (isUtakazeCharasheetCharacter(parsed)) return buildUtakazeCharasheetCharacter(parsed);

  const game = asString((parsed as Record<string, unknown>)['game'])
    .trim()
    .toLowerCase();
  const character = parseCharasheetCharacter(parsed, labelMap ?? CHARASHEET_LABEL_MAPS[game] ?? {});
  if (character && character.dicebot.trim() === '') {
    character.dicebot = resolveCharasheetDicebot(game);
  }
  return character;
}
