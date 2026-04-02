import { toHalfWidth } from '@axe/core/util/string-util';
import { GameCharacter } from '@axe/domain/character/game-character';

export interface ResourceEditOption {
  limitMinMax: boolean;
  zeroLimit: boolean;
  isErr: boolean;
}

export interface ResourceEdit {
  target: string;
  operator: string;
  diceResult: string;
  command: string;
  replace: string;
  isDiceRoll: boolean;
  calcAns: number;
  nowOrMax: string;
  option: ResourceEditOption | null;
  object: GameCharacter | null;
  targeted: boolean;
}

export interface BuffEdit {
  command: string;
  object: GameCharacter;
  targeted: boolean;
}

export function parseResourceEditOption(text: string): ResourceEditOption {
  const ans: ResourceEditOption = {
    limitMinMax: false,
    zeroLimit: false,
    isErr: false,
  };

  const mat = toHalfWidth(text).match(/([A-CE-Z]+)$/i);
  if (!mat) return ans;

  let option = mat[1];
  if (option.match(/L/i)) {
    option = option.replace(/L/i, '');
    ans.limitMinMax = true;
  }

  if (option.match(/Z/i)) {
    option = option.replace(/Z/i, '');
    ans.zeroLimit = true;
  }

  if (option.length !== 0) {
    ans.isErr = true;
  }
  return ans;
}

export function createDefaultResourceEdit(): ResourceEdit {
  return {
    target: '',
    operator: '',
    diceResult: '',
    command: '',
    replace: '',
    isDiceRoll: false,
    calcAns: 0,
    nowOrMax: 'now',
    option: null,
    object: null,
    targeted: false,
  };
}

export function convertCommandToResourceEdit(
  oneResourceEdit: ResourceEdit,
  text: string,
  object: GameCharacter,
  targeted: boolean
): boolean {
  oneResourceEdit.object = object;
  oneResourceEdit.targeted = targeted;

  const replaceText = ` ${text.replace('：', ':').replace('＋', '+').replace('－', '-').replace('＝', '=').replace('＞', '>')}`;
  const resourceEditRegExp = /[:]([^-+=>]+)([-+=>])(.*)/;
  const resourceEditResult = replaceText.match(resourceEditRegExp);
  if (!resourceEditResult) return false;
  if (resourceEditResult[2] !== '>' && resourceEditResult[3] === '') return false;

  const chkNowOrMaxString: string = resourceEditResult[1];
  let reg1: string;
  let reg1HalfWidth: string;

  const namematch = chkNowOrMaxString.match(/(.+)([\^＾]$)/);
  if (namematch) {
    reg1 = namematch[1];
    reg1HalfWidth = toHalfWidth(reg1);
    oneResourceEdit.nowOrMax = 'max';
  } else {
    reg1 = resourceEditResult[1];
    reg1HalfWidth = toHalfWidth(reg1);
    oneResourceEdit.nowOrMax = 'now';
  }

  oneResourceEdit.operator = resourceEditResult[2];

  if (object.status.canChangeName(reg1)) {
    oneResourceEdit.target = reg1;
  } else if (object.status.canChangeName(reg1HalfWidth)) {
    oneResourceEdit.target = reg1HalfWidth;
  } else {
    return false;
  }

  if (oneResourceEdit.operator === '>') {
    oneResourceEdit.replace = resourceEditResult[3];
    return true;
  }

  let reg3 = resourceEditResult[3].replace(/[A-CE-ZＡ-ＣＥ-Ｚ]+$/i, '');
  const commandPrefix = oneResourceEdit.operator === '-' ? '-' : '';
  oneResourceEdit.command = `${commandPrefix}${toHalfWidth(reg3)}+(1d1-1)`;

  reg3 = reg3.replace(/[A-CE-ZＡ-ＣＥ-Ｚ]+$/i, '');
  const optionCommand = parseResourceEditOption(resourceEditResult[3]);
  if (optionCommand.isErr) {
    return false;
  }
  oneResourceEdit.option = optionCommand;
  oneResourceEdit.isDiceRoll = !!toHalfWidth(reg3).match(/\d[dD]/);

  return true;
}

export function applyTextEdit(edit: ResourceEdit, character: GameCharacter): string {
  character.status.setText(edit.target, edit.replace);
  return `${edit.target}＞${edit.replace}    `;
}

export function applyResourceEdit(edit: ResourceEdit, character: GameCharacter): string {
  let optionText = '';
  let nowOrMax = edit.nowOrMax;

  const maxNum = character.status.getValue(edit.target, 'max');
  if (nowOrMax === 'max' && maxNum == null) {
    nowOrMax = 'now';
  }

  const oldNum =
    nowOrMax === 'now' ? character.status.getValue(edit.target, 'now') : character.status.getValue(edit.target, 'max');
  if (oldNum == null) return '';

  let newNum: number;
  if (edit.operator === '=') {
    newNum = edit.calcAns;
  } else {
    const zeroLimit = edit.option!.zeroLimit;
    if (zeroLimit && edit.operator === '+' && edit.calcAns < 0) {
      newNum = oldNum + 0;
      optionText = '(0制限)';
    } else if (zeroLimit && edit.operator === '-' && edit.calcAns > 0) {
      newNum = oldNum + 0;
      optionText = '(0制限)';
    } else {
      newNum = oldNum + edit.calcAns;
    }
  }

  if (edit.option!.limitMinMax && maxNum != null) {
    if (newNum > maxNum && nowOrMax === 'now') {
      newNum = maxNum;
      optionText = '(最大)';
    }
    if (newNum < 0) {
      newNum = 0;
      optionText = '(最小)';
    }
  }

  if (nowOrMax === 'now') {
    character.status.setValue(edit.target, 'now', newNum);
  } else {
    character.status.setValue(edit.target, 'max', newNum);
  }

  const operatorText = edit.operator === '-' ? '' : edit.operator;
  const changeMax = nowOrMax === 'max' ? '(最大値)' : '';
  return `${edit.target}${changeMax}:${oldNum}${operatorText}${edit.diceResult}＞${newNum}${optionText}    `;
}

export function applyBuffEdit(buff: BuffEdit, character: GameCharacter): string {
  const command = buff.command;
  let text = '';
  if (buff.targeted) {
    text += `[${character.name}] `;
  }

  if (command.match(/^[tTｔＴ]?&[RＲrｒ]-$/i)) {
    character.buffs.decreaseRound();
    text += 'バフRを減少    ';
  } else if (command.match(/^[tTｔＴ]?&[RＲrｒ][+]$/i)) {
    character.buffs.increaseRound();
    text += 'バフRを増加    ';
  } else if (command.match(/^[tTｔＴ]?&[DＤdｄ]$/i)) {
    character.buffs.deleteZeroRound();
    text += '0R以下のバフを消去    ';
  } else if (command.match(/^[tTｔＴ]?&.+-$/i)) {
    const match = command.match(/^[tTｔＴ]?&(.+)-$/i);
    const reg1 = match![1];
    if (character.buffs.delete(reg1)) {
      text += `${reg1}を消去    `;
    }
  } else {
    const splittext = command.replace(/^[tTｔＴ]?&/i, '').split('/');
    let round: number | undefined = undefined;
    let sub = '';
    const buffname = splittext[0];
    let bufftext = splittext[0];

    if (splittext.length > 1) {
      sub = splittext[1];
      bufftext = `${bufftext}/${splittext[1]}`;
    }
    if (splittext.length > 2) {
      if (splittext[2]) {
        round = parseInt(splittext[2]);
        if (Number.isNaN(round)) {
          round = 3;
        }
      } else {
        round = 3;
      }
      bufftext = `${bufftext}/${round}R`;
    }

    character.buffs.addRound(buffname, sub, round);
    text += `バフを付与 ${bufftext}    `;
  }

  return text;
}
