import { ImportedCharacter } from '@axe/domain/character/import/imported-character';
import {
  buildPsychoFictionCharacter,
  isPsychoFictionAppspotCharacter,
} from '@axe/domain/character/import/system-profiles/psychofiction-appspot';
import { PF_APPSPOT_SYSTEMS } from '@axe/domain/character/import/system-profiles/psychofiction-systems';

export function isInsaneAppspotCharacter(parsed: unknown): boolean {
  return isPsychoFictionAppspotCharacter(parsed, 'ability');
}

export function buildInsaneAppspotCharacter(parsed: unknown): ImportedCharacter | null {
  return buildPsychoFictionCharacter(parsed, PF_APPSPOT_SYSTEMS['insane']);
}
