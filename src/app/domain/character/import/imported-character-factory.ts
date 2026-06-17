import { GameCharacter } from '@axe/domain/character/game-character';
import {
  ImportedCharacter,
  ImportedField,
  ImportedParam,
  ImportedSection,
  ImportedStatus,
} from '@axe/domain/character/import/imported-character';
import { ChatPalette } from '@axe/domain/chat/chat-palette';
import { DEFAULT_CHAT_COLOR_CODES } from '@axe/domain/chat/constants';
import {
  DataElement,
  DataElementAttribute,
  DataElementFieldType,
  DataElementRole,
  DataElementType,
} from '@axe/domain/data/data-element';

const SECTION_RESOURCE = 'リソース';
const SECTION_PARAM = 'パラメータ';
const SECTION_PROFILE = 'プロフィール';
const GROUP_BASIC = '基本';

/**
 * 正規化モデル ImportedCharacter から AXE のキャラコマ (GameCharacter) を組み立てる純粋ファクトリ。
 * CharacterTemplateFactory.createDefault と同じ DI 非依存の組み立て規約に従う。
 * 画像は事前に ImageStorage へ解決済みの identifier を渡す（解決は application 層の責務）。
 */
export class ImportedCharacterFactory {
  static create(imported: ImportedCharacter, imageIdentifier: string): GameCharacter {
    const character = new GameCharacter();
    character.createDataElements();
    character.initialize();
    ImportedCharacterFactory.build(character, imported, imageIdentifier);
    return character;
  }

  private static build(character: GameCharacter, imported: ImportedCharacter, imageIdentifier: string): void {
    character.createDataElements();

    const name = imported.name.trim() === '' ? 'インポートキャラクター' : imported.name.trim();
    const size = imported.size >= 1 ? imported.size : 1;

    character.commonDataElement!.appendChild(DataElement.create('name', name, {}, `name_${character.identifier}`));
    character.commonDataElement!.appendChild(DataElement.create('size', size, {}, `size_${character.identifier}`));
    character.commonDataElement!.appendChild(DataElement.create('altitude', 0, {}, `altitude_${character.identifier}`));

    const imageIdentifierElement = character.imageDataElement!.getFirstElementByName('imageIdentifier');
    if (imageIdentifierElement) imageIdentifierElement.value = imageIdentifier;

    const usedNames = new Set<string>();
    ImportedCharacterFactory.appendStatuses(character, imported.statuses, usedNames);
    ImportedCharacterFactory.appendParams(character, imported, usedNames);
    ImportedCharacterFactory.appendSections(character, imported.sections);

    if (imported.color !== '') character.chatColorCode = [imported.color, ...DEFAULT_CHAT_COLOR_CODES];

    ImportedCharacterFactory.appendChatPalette(character, imported);
    character.addExtendData();
  }

  private static appendStatuses(character: GameCharacter, statuses: ImportedStatus[], usedNames: Set<string>): void {
    if (statuses.length === 0) return;
    const section = ImportedCharacterFactory.createSection(character, SECTION_RESOURCE);
    const group = ImportedCharacterFactory.createGroup(character, GROUP_BASIC, SECTION_RESOURCE);
    section.appendChild(group);

    for (const status of statuses) {
      const fieldName = ImportedCharacterFactory.uniqueName(status.label, usedNames);
      group.appendChild(
        DataElement.create(fieldName, status.max, {
          [DataElementAttribute.ROLE]: DataElementRole.FIELD,
          [DataElementAttribute.FIELD_TYPE]: DataElementFieldType.RESOURCE,
          type: DataElementType.NUMBER_RESOURCE,
          currentValue: String(status.value),
        })
      );
    }
  }

  private static appendParams(character: GameCharacter, imported: ImportedCharacter, usedNames: Set<string>): void {
    const fields: ImportedParam[] = [...imported.params];
    if (imported.initiative != null) {
      fields.unshift({ label: 'イニシアチブ', value: String(imported.initiative) });
    }

    const hasParamFields = fields.length > 0;
    const hasProfileFields = imported.memo.trim() !== '' || imported.externalUrl.trim() !== '';
    if (!hasParamFields && !hasProfileFields) return;

    if (hasParamFields) {
      const section = ImportedCharacterFactory.createSection(character, SECTION_PARAM);
      const group = ImportedCharacterFactory.createGroup(character, GROUP_BASIC, SECTION_PARAM);
      section.appendChild(group);
      for (const field of fields) {
        const fieldName = ImportedCharacterFactory.uniqueName(field.label, usedNames);
        const numeric = field.value.trim() !== '' && Number.isFinite(Number(field.value));
        group.appendChild(
          DataElement.create(fieldName, numeric ? Number(field.value) : field.value, {
            [DataElementAttribute.ROLE]: DataElementRole.FIELD,
            [DataElementAttribute.FIELD_TYPE]: numeric ? DataElementFieldType.NUMBER : DataElementFieldType.TEXT,
          })
        );
      }
    }

    if (hasProfileFields) {
      const section = ImportedCharacterFactory.createSection(character, SECTION_PROFILE);
      section.setAttribute('cs-colspan', '2');
      const group = ImportedCharacterFactory.createGroup(character, GROUP_BASIC, SECTION_PROFILE);
      section.appendChild(group);

      if (imported.memo.trim() !== '') {
        group.appendChild(
          DataElement.create(ImportedCharacterFactory.uniqueName('メモ', usedNames), imported.memo, {
            [DataElementAttribute.ROLE]: DataElementRole.FIELD,
            [DataElementAttribute.FIELD_TYPE]: DataElementFieldType.LONG_TEXT,
            type: DataElementType.NOTE,
          })
        );
      }
      if (imported.externalUrl.trim() !== '') {
        group.appendChild(
          DataElement.create(ImportedCharacterFactory.uniqueName('参照元', usedNames), imported.externalUrl.trim(), {
            [DataElementAttribute.ROLE]: DataElementRole.FIELD,
            [DataElementAttribute.FIELD_TYPE]: DataElementFieldType.TEXT,
          })
        );
      }
    }
  }

  /**
   * システム固有データ（技能・コンボ・武器など）を section > group > field として detail へ展開する。
   * 要素 identifier は uuid 任せにして、同名フィールド（多数の name など）でも衝突しないようにする。
   */
  private static appendSections(character: GameCharacter, sections: ImportedSection[]): void {
    for (const section of sections) {
      if (section.groups.length === 0) continue;
      const sectionElement = DataElement.create(section.label, '', {
        [DataElementAttribute.ROLE]: DataElementRole.SECTION,
      });
      sectionElement.setAttribute('cs-colspan', '2');
      character.detailDataElement!.appendChild(sectionElement);

      for (const group of section.groups) {
        const groupElement = DataElement.create(group.label, '', {
          [DataElementAttribute.ROLE]: DataElementRole.GROUP,
        });
        sectionElement.appendChild(groupElement);
        for (const field of group.fields) {
          groupElement.appendChild(ImportedCharacterFactory.createImportedField(field));
        }
      }
    }
  }

  private static createImportedField(field: ImportedField): DataElement {
    const attributes: Record<string, string | number> = {
      [DataElementAttribute.ROLE]: DataElementRole.FIELD,
    };
    if (field.kind === 'number') {
      attributes[DataElementAttribute.FIELD_TYPE] = DataElementFieldType.NUMBER;
    } else if (field.kind === 'note') {
      attributes[DataElementAttribute.FIELD_TYPE] = DataElementFieldType.LONG_TEXT;
      attributes['type'] = DataElementType.NOTE;
    } else {
      attributes[DataElementAttribute.FIELD_TYPE] = DataElementFieldType.TEXT;
    }
    return DataElement.create(field.label, field.value, attributes);
  }

  private static appendChatPalette(character: GameCharacter, imported: ImportedCharacter): void {
    const palette = new ChatPalette(`ChatPalette_${character.identifier}`);
    if (imported.dicebot.trim() !== '') palette.dicebot = imported.dicebot.trim();
    palette.setPalette(imported.commands.trim());
    palette.initialize();
    character.appendChild(palette);
  }

  private static createSection(character: GameCharacter, name: string): DataElement {
    const section = DataElement.create(
      name,
      '',
      { [DataElementAttribute.ROLE]: DataElementRole.SECTION },
      `${name}_${character.identifier}`
    );
    character.detailDataElement!.appendChild(section);
    return section;
  }

  private static createGroup(character: GameCharacter, name: string, sectionName: string): DataElement {
    return DataElement.create(
      name,
      '',
      { [DataElementAttribute.ROLE]: DataElementRole.GROUP },
      `${sectionName}_${name}_${character.identifier}`
    );
  }

  private static uniqueName(label: string, usedNames: Set<string>): string {
    const base = label.trim() === '' ? '項目' : label.trim();
    let name = base;
    let counter = 2;
    while (usedNames.has(name)) {
      name = `${base}_${counter}`;
      counter++;
    }
    usedNames.add(name);
    return name;
  }
}
