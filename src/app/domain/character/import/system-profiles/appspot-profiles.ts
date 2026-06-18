import { parseAppspotCharacter } from '@axe/domain/character/import/appspot-character-parser';
import { ImportedCharacter } from '@axe/domain/character/import/imported-character';
import { resolveAppspotDicebot } from '@axe/domain/character/import/system-profiles/dicebot-map';
import { buildDx3AppspotCharacter } from '@axe/domain/character/import/system-profiles/dx3-appspot-profile';
import { buildShinobigamiAppspotCharacter } from '@axe/domain/character/import/system-profiles/shinobigami-appspot-profile';

export function parseAppspotCharacterForSystem(parsed: unknown, systemHint?: string): ImportedCharacter | null {
  const slug = (systemHint ?? '').trim().toLowerCase();

  if (slug === 'dx3') {
    const profile = buildDx3AppspotCharacter(parsed);
    if (profile) return profile;
  }
  if (slug === 'shinobigami') {
    const profile = buildShinobigamiAppspotCharacter(parsed);
    if (profile) return profile;
  }

  const character = parseAppspotCharacter(parsed);
  if (character && character.dicebot.trim() === '') {
    character.dicebot = resolveAppspotDicebot(slug);
  }
  return character;
}
