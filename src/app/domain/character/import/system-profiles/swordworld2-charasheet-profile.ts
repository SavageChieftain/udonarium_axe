import { ImportedCharacter } from '@axe/domain/character/import/imported-character';
import { asString } from '@axe/domain/character/import/system-profiles/charasheet-shared';
import { buildSwordWorldCharasheet } from '@axe/domain/character/import/system-profiles/swordworld-charasheet-shared';

const SW2_SKILL_COLUMNS = [
  { suffix: 'lv', label: 'レベル' },
  { suffix: 'kouka', label: '効果' },
  { suffix: 'zentei', label: '前提' },
];

export function isSwordWorld2CharasheetCharacter(parsed: unknown): boolean {
  if (parsed == null || typeof parsed !== 'object') return false;
  const record = parsed as Record<string, unknown>;
  return typeof record['pc_name'] === 'string' && asString(record['game']).trim().toLowerCase() === 'swordworld2';
}

export function buildSwordWorld2CharasheetCharacter(parsed: unknown): ImportedCharacter | null {
  return buildSwordWorldCharasheet(parsed, {
    game: 'swordworld2',
    dicebot: 'SwordWorld2.0',
    skillLabel: '技能',
    skillPrefix: 'ST',
    skillColumns: SW2_SKILL_COLUMNS,
  });
}
