import { ImportedCharacter } from '@axe/domain/character/import/imported-character';
import { asString } from '@axe/domain/character/import/system-profiles/coc-charasheet-shared';
import { buildSwordWorldCharasheet } from '@axe/domain/character/import/system-profiles/swordworld-charasheet-shared';

const SW1_SKILL_COLUMNS = [
  { suffix: 'lv', label: 'レベル' },
  { suffix: 'kouka', label: '効果' },
  { suffix: 'zentei', label: '前提' },
  { suffix: 'eishou', label: '詠唱' },
];

export function isSwordWorldCharasheetCharacter(parsed: unknown): boolean {
  if (parsed == null || typeof parsed !== 'object') return false;
  const record = parsed as Record<string, unknown>;
  return typeof record['pc_name'] === 'string' && asString(record['game']).trim().toLowerCase() === 'swordworld';
}

export function buildSwordWorldCharasheetCharacter(parsed: unknown): ImportedCharacter | null {
  return buildSwordWorldCharasheet(parsed, {
    game: 'swordworld',
    dicebot: 'SwordWorld',
    skillLabel: '技能',
    skillPrefix: 'JK',
    skillColumns: SW1_SKILL_COLUMNS,
  });
}
