import { GameCharacter } from '@axe/domain/character/game-character';
import { DataElement } from '@axe/domain/data/data-element';

export function portraitElementAt(character: GameCharacter, index: number): DataElement | null {
  const children = character.imageDataElement?.children ?? [];
  return index >= 0 && index < children.length ? children[index] : null;
}

export function portraitNameOf(element: DataElement | null | undefined): string {
  const name = element?.currentValue;
  return name == null ? '' : String(name);
}

export function setPortraitNameOf(element: DataElement, name: string): void {
  element.currentValue = name.trim();
}
