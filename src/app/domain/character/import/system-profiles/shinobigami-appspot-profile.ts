import { ImportedCharacter } from '@axe/domain/character/import/imported-character';
import {
  buildPsychoFictionCharacter,
  isPsychoFictionAppspotCharacter,
} from '@axe/domain/character/import/system-profiles/psychofiction-appspot';
import { PF_APPSPOT_SYSTEMS } from '@axe/domain/character/import/system-profiles/psychofiction-systems';

export function isShinobigamiAppspotCharacter(parsed: unknown): boolean {
  return isPsychoFictionAppspotCharacter(parsed, 'ninpou');
}

export function buildShinobigamiAppspotCharacter(parsed: unknown): ImportedCharacter | null {
  return buildPsychoFictionCharacter(parsed, PF_APPSPOT_SYSTEMS['shinobigami']);
}
