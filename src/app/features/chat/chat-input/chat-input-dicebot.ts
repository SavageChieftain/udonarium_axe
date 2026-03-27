import { inject } from '@angular/core';
import { PointerDeviceService } from '@axe/core/pointer-device.service';
import { DiceBot } from '@axe/domain/dice/dice-bot';
import { TextViewComponent } from '@axe/shared/components/text-view/text-view.component';
import { PanelOption, PanelService } from '@axe/shared/panel.service';

const DICEBOT_INTRO =
  '【ダイスボット】チャットにダイス用の文字を入力するとダイスロールが可能\n' +
  '入力例）２ｄ６＋１　攻撃！\n' +
  '出力例）2d6+1　攻撃！\n' +
  '　　　　  diceBot: (2d6) → 7\n' +
  '上記のようにダイス文字の後ろに空白を入れて発言する事も可能。\n' +
  '以下、使用例\n' +
  '　3D6+1>=9 ：3d6+1で目標値9以上かの判定\n' +
  '　1D100<=50 ：D100で50％目標の下方ロールの例\n' +
  '　3U6[5] ：3d6のダイス目が5以上の場合に振り足しして合計する(上方無限)\n' +
  '　3B6 ：3d6のダイス目をバラバラのまま出力する（合計しない）\n' +
  '　10B6>=4 ：10d6を振り4以上のダイス目の個数を数える\n' +
  '　2R6[>3]>=5 ：2D6のダイス目が3より大きい場合に振り足して、5以上のダイス目の個数を数える\n' +
  '　(8/2)D(4+6)<=(5*3)：個数・ダイス・達成値には四則演算も使用可能\n' +
  '　c(10-4*3/2+2)：c(計算式）で計算だけの実行も可能\n' +
  '　choice[a,b,c]：列挙した要素から一つを選択表示。ランダム攻撃対象決定などに\n' +
  '　S3d6 ： 各コマンドの先頭に「S」を付けると他人結果の見えないシークレットロール\n' +
  '　3d6/2 ： ダイス出目を割り算（端数処理はゲームシステム依存）。切り上げは /2C、四捨五入は /2R、切り捨ては /2F\n' +
  '　D66 ： D66ダイス。順序はゲームに依存。D66N：そのまま、D66A：昇順、D66D：降順\n' +
  '\n' +
  '詳細は下記URLのコマンドガイドを参照\n' +
  'https://docs.bcdice.org/\n' +
  '===================================\n';

export class ChatInputDiceBotHelper {
  private readonly pointerDeviceService = inject(PointerDeviceService);
  private readonly panelService = inject(PanelService);

  gameHelp = '';

  load(gameType: string): void {
    DiceBot.getHelpMessage(gameType).then(() => {});
  }

  isGameTypeInList(gameType: string, diceBotInfos: typeof DiceBot.diceBotInfos): boolean {
    if (diceBotInfos.length === 0) return true;
    return diceBotInfos.some((info) => info.id === gameType);
  }

  showHelp(gameType: string): void {
    DiceBot.getHelpMessage(gameType).then((help) => {
      this.gameHelp = help;
      let gameName = 'ダイスボット';
      for (const diceBotInfo of DiceBot.diceBotInfos) {
        if (diceBotInfo.id === gameType) gameName = 'ダイスボット<' + diceBotInfo.name + '＞';
      }
      gameName += 'の説明';
      const coordinate = this.pointerDeviceService.pointers[0];
      const option: PanelOption = { left: coordinate.x, top: coordinate.y, width: 600, height: 500 };
      const textView = this.panelService.open(TextViewComponent, option);
      textView.title = gameName;
      textView.text = DICEBOT_INTRO + this.gameHelp;
    });
  }
}
