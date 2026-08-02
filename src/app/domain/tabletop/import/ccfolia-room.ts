import { ImportedCharacter } from '@axe/domain/character/import/imported-character';

export interface ImportedRoomResource {
  fileName: string;
  mime: string;
}

export interface ImportedRoomPanel {
  imageFileName: string;
  x: number;
  y: number;
  z: number;
  width: number;
  height: number;
  angle: number;
  order: number;
  locked: boolean;
  visible: boolean;
  memo: string;
}

export interface ImportedRoomFace {
  label: string;
  fileName: string;
}

export interface ImportedRoomPiece {
  character: ImportedCharacter;
  x: number;
  y: number;
  width: number;
  height: number;
  angle: number;
  active: boolean;
  secret: boolean;
  invisible: boolean;
  hideStatus: boolean;
  owner: string;
  iconFileName: string;
  faces: ImportedRoomFace[];
}

/**
 * 場面。ココフォリアでは盤面の絵（前景）と広さだけが切り替わり、パネルとコマは場面をまたいで残る。
 */
export interface ImportedRoomScene {
  name: string;
  order: number;
  backgroundFileName: string;
  foregroundFileName: string;
  fieldWidth: number;
  fieldHeight: number;
}

/** 取り込めなかった要素の件数。ココフォリア側にあって AXE に写せなかったものを利用者へ提示する。 */
export interface ImportedRoomSkipped {
  panels: number;
  decks: number;
  effects: number;
}

export interface ImportedRoom {
  version: string;
  fieldWidth: number;
  fieldHeight: number;
  backgroundFileName: string;
  foregroundFileName: string;
  scenes: ImportedRoomScene[];
  panels: ImportedRoomPanel[];
  pieces: ImportedRoomPiece[];
  resources: ImportedRoomResource[];
  skipped: ImportedRoomSkipped;
}

export function createEmptyImportedRoom(): ImportedRoom {
  return {
    version: '',
    fieldWidth: 0,
    fieldHeight: 0,
    backgroundFileName: '',
    foregroundFileName: '',
    scenes: [],
    panels: [],
    pieces: [],
    resources: [],
    skipped: { panels: 0, decks: 0, effects: 0 },
  };
}
