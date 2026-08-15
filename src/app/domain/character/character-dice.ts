import { GameCharacter } from '@axe/domain/character/game-character';
import {
  DataElement,
  DataElementAttribute,
  DataElementFieldType,
  DataElementRole,
  DataElementType,
} from '@axe/domain/data/data-element';
import { DiceSymbol } from '@axe/domain/dice/dice-symbol';

/**
 * The dice a character keeps.
 *
 * They live on the sheet rather than beside it, so they travel with the character: saved
 * with the room, carried out with the character and read back with either. A die kept
 * this way is data — how many there are and what is on each face — and becomes a die on
 * the table only when it is laid out.
 *
 * The shape follows the sheet's own: a section holds one group per die, whose name is the
 * die's, and the fields of that group are the count and one picture per face. Nothing new
 * has to be taught to the sheet editor, so the pictures can be changed there by hand.
 */

export const HELD_DICE_SECTION = '所持ダイス';
export const HELD_DICE_COUNT = '個数';

export interface HeldDieFace {
  /** What the face shows, which is also what the field is called. */
  label: string;
  imageIdentifier: string;
}

export interface HeldDie {
  name: string;
  count: number;
  faces: HeldDieFace[];
}

/** The dice on a character's sheet, in the order they were put there. */
export function heldDiceOf(character: GameCharacter): HeldDie[] {
  const section = heldDiceSection(character);
  if (!section) return [];

  const dice: HeldDie[] = [];
  for (const group of section.children) {
    if (!(group instanceof DataElement)) continue;
    const die = heldDieFromGroup(group);
    if (die) dice.push(die);
  }
  return dice;
}

/** A die standing on the table, read as one to keep. */
export function heldDieOfSymbol(symbol: DiceSymbol, count = 1): HeldDie {
  const faces = (symbol.imageDataElement?.children ?? [])
    .filter((face): face is DataElement => face instanceof DataElement)
    .map<HeldDieFace>((face) => ({ label: face.name, imageIdentifier: String(face.value ?? '') }));

  return { name: symbol.name, count, faces };
}

/**
 * Puts a die onto the sheet.
 *
 * A die of the same name is the same die, so it is counted rather than written again;
 * a table of six identical dice is a count of six, not six groups to read past.
 */
export function storeHeldDie(character: GameCharacter, die: HeldDie): void {
  if (die.faces.length < 1) return;

  const section = heldDiceSection(character) ?? createHeldDiceSection(character);
  if (!section) return;

  const existing = section.children.find(
    (group): group is DataElement => group instanceof DataElement && group.name === die.name
  );
  if (existing) {
    const count = existing.getFirstElementByName(HELD_DICE_COUNT);
    if (count) count.value = countOf(existing) + die.count;
    return;
  }

  section.appendChild(createGroup(character, die));
}

/** Takes a die off the sheet, or lowers its count when there are several. */
export function removeHeldDie(character: GameCharacter, name: string, count = 1): void {
  const section = heldDiceSection(character);
  const group = section?.children.find(
    (child): child is DataElement => child instanceof DataElement && child.name === name
  );
  if (!group) return;

  const left = countOf(group) - count;
  if (left > 0) {
    const field = group.getFirstElementByName(HELD_DICE_COUNT);
    if (field) field.value = left;
    return;
  }
  group.destroy();
}

function heldDiceSection(character: GameCharacter): DataElement | null {
  return character.detailDataElement?.getFirstElementByName(HELD_DICE_SECTION) ?? null;
}

function createHeldDiceSection(character: GameCharacter): DataElement | null {
  const detail = character.detailDataElement;
  if (!detail) return null;

  const section = DataElement.create(
    HELD_DICE_SECTION,
    '',
    { [DataElementAttribute.ROLE]: DataElementRole.SECTION },
    `${HELD_DICE_SECTION}_${character.identifier}`
  );
  detail.appendChild(section);
  return section;
}

function createGroup(character: GameCharacter, die: HeldDie): DataElement {
  const group = DataElement.create(die.name, '', { [DataElementAttribute.ROLE]: DataElementRole.GROUP });
  group.appendChild(
    DataElement.create(HELD_DICE_COUNT, die.count, {
      [DataElementAttribute.ROLE]: DataElementRole.FIELD,
      [DataElementAttribute.FIELD_TYPE]: DataElementFieldType.NUMBER,
    })
  );
  for (const face of die.faces) {
    group.appendChild(
      DataElement.create(face.label, face.imageIdentifier, {
        [DataElementAttribute.ROLE]: DataElementRole.FIELD,
        [DataElementAttribute.FIELD_TYPE]: DataElementFieldType.IMAGE,
        type: DataElementType.IMAGE,
      })
    );
  }
  return group;
}

function heldDieFromGroup(group: DataElement): HeldDie | null {
  const faces: HeldDieFace[] = [];
  for (const field of group.children) {
    if (!(field instanceof DataElement)) continue;
    if (field.name === HELD_DICE_COUNT) continue;
    faces.push({ label: field.name, imageIdentifier: String(field.value ?? '') });
  }
  if (faces.length < 1) return null;

  return { name: group.name, count: countOf(group), faces };
}

/** A count that cannot be read is one die: the group is there, so something is being kept. */
function countOf(group: DataElement): number {
  const value = Number(group.getFirstElementByName(HELD_DICE_COUNT)?.value ?? 1);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 1;
}
