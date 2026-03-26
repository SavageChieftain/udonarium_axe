import { SyncObject } from '@axe/core/sync/decorator';
import { GameObject } from '@axe/core/sync/game-object';
import { ObjectStore } from '@axe/core/sync/object-store';
import { DataElement } from '@axe/domain/data/data-element';

@SyncObject('markdown')
export class MarkDown extends GameObject {
  clickTimeStamp = 0;

  changeMarkDownCheckBox(cliskId: string, timeStamp: number) {
    const match = cliskId.match(/^(.*)_mark_(\d{8})$/);

    if (!match) return;

    const parentId = match[1];
    const boxNum = match[2];
    const object = ObjectStore.instance.get<DataElement>(parentId);

    if (!object) return;

    // 2回連続イベントが発生した際の回避処置
    if (this.clickTimeStamp == timeStamp) {
      return;
    } else {
      this.clickTimeStamp = timeStamp;
    }

    const objectValue: string = object.value as string;

    const clickIndex = parseInt(boxNum);

    const splitText = objectValue.split(/[[［][xXｘＸ]?[\]］]/g);
    const matchText = objectValue.match(/[[［][xXｘＸ]?[\]］]/g);

    let changeText = matchText![clickIndex];

    if (changeText.match(/[[［][xXｘＸ][\]］]/)) {
      changeText = '[]';
    } else {
      changeText = '[x]';
    }

    let newText = '';
    let i;
    for (i = 0; i < matchText!.length; i++) {
      if (i != clickIndex) {
        newText += splitText[i] + matchText![i];
      } else {
        newText += splitText[i] + changeText;
      }
    }
    for (; i < splitText.length; i++) {
      newText += splitText[i];
    }

    object.value = newText;
  }

  markDownCheckBox(text: string, baseId: string) {
    let textOut = '';
    const text2 = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
    const text3 = text2
      .replace(/[[［][xXｘＸ][\]］]/g, '<input type="checkbox" checked="checked" class="markDounBox" />')
      .replace(/[[［][\]］]/g, '<input type="checkbox" class="markDounBox" />');

    const splitText = text3.split('<input ');
    for (let i = 0; i < splitText.length; i++) {
      textOut += splitText[i];
      if (i < splitText.length - 1) {
        const num = ('00000000' + i).slice(-8);
        textOut += `<input id="${baseId}_mark_${num}" `;
      }
      if (i >= 99999999) {
        break;
      }
    }

    return textOut;
  }

  markDownTable(text: string) {
    const splitLine = text.split('\n');
    let textOut = '';

    let tableMaking = false;
    for (let i = 0; i < splitLine.length; i++) {
      const splitVar = splitLine[i].split(/[|｜]/);
      if (splitVar.length == 1) {
        if (!tableMaking) {
          textOut += `${splitLine[i]}\n`;
        } else {
          textOut += '</div>';
          textOut += `${splitLine[i]}\n`;
          tableMaking = false;
        }
      } else {
        if (!tableMaking) {
          textOut += splitVar[0];
          textOut +=
            '<div class="markdown_table" style="display: table; table-layout: fixed; border: 1px solid #000000;">';
          textOut += '  <div class="markdown_table_row" style="display: table-row; border: 1px solid #000000;">';
          for (let j = 1; j < splitVar.length - 1; j++) {
            textOut += `    <div class="markdown_table_cell" style="display: table-cell; border: 1px solid #000000;">${splitVar[j]}</div>`;
          }
          textOut += '  </div>';
          tableMaking = true;
        } else {
          textOut += '  <div class="markdown_table_row" style="display: table-row; border: 1px solid #000000;">';
          for (let j = 1; j < splitVar.length - 1; j++) {
            textOut += `    <div class="markdown_table_cell" style="display: table-cell; border: 1px solid #000000;">${splitVar[j]}</div>`;
          }
          textOut += '  </div>';
        }
      }
    }
    if (tableMaking) {
      textOut += '</div>';
    }
    return textOut;
  }
}
