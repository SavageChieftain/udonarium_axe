import { Card } from '@axe/domain/card/card';
import { CardStack } from '@axe/domain/card/card-stack';
import { GameCharacter } from '@axe/domain/character/game-character';
import { DiceSymbol } from '@axe/domain/dice/dice-symbol';
import { GameTableMask } from '@axe/domain/tabletop/game-table-mask';
import { GameTableScratchMask } from '@axe/domain/tabletop/game-table-scratch-mask';
import { RangeArea } from '@axe/domain/tabletop/range';
import { Terrain } from '@axe/domain/tabletop/terrain';
import { TextNote } from '@axe/domain/tabletop/text-note';

/**
 * GameCharacterSheetComponent が「詳細を表示」対象として扱える全種類。
 * 同コンポーネントが複数の TabletopObject 種別を 1 画面で扱う設計を反映している。
 * 9 種別の union 注釈を 3 箇所で繰り返さないようにここに集約する。
 */
export type CharacterSheetTarget =
  GameCharacter | DiceSymbol | Card | CardStack | Terrain | TextNote | RangeArea | GameTableMask | GameTableScratchMask;
