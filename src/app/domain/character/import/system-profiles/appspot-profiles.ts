import { parseAppspotCharacter } from '@axe/domain/character/import/appspot-character-parser';
import { ImportedCharacter } from '@axe/domain/character/import/imported-character';
import { resolveAppspotDicebot } from '@axe/domain/character/import/system-profiles/dicebot-map';
import { buildDx3AppspotCharacter } from '@axe/domain/character/import/system-profiles/dx3-appspot-profile';
import { buildPsychoFictionCharacter } from '@axe/domain/character/import/system-profiles/psychofiction-appspot';
import { PF_APPSPOT_SYSTEMS } from '@axe/domain/character/import/system-profiles/psychofiction-systems';

export function parseAppspotCharacterForSystem(parsed: unknown, systemHint?: string): ImportedCharacter | null {
  const slug = (systemHint ?? '').trim().toLowerCase();

  if (slug === 'dx3') {
    const profile = buildDx3AppspotCharacter(parsed);
    if (profile) return profile;
  }
  const pfConfig = PF_APPSPOT_SYSTEMS[slug];
  if (pfConfig) {
    const profile = buildPsychoFictionCharacter(parsed, pfConfig);
    if (profile) return profile;
  }

  const character = parseAppspotCharacter(parsed);
  if (character && character.dicebot.trim() === '') {
    character.dicebot = resolveAppspotDicebot(slug);
  }
  return character;
}
