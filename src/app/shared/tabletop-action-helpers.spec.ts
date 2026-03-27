import { DiceType } from '@axe/domain/dice/dice-symbol';

import {
  getDiceMenuItems,
  getRangeMenuItems,
  getTrumpCardCodes,
  TRUMP_BACK_IMAGE_PATH,
  TERRAIN_TEXTURE_PATH,
} from './tabletop-action-helpers';

describe('tabletop-action-helpers', () => {
  it('getTrumpCardCodes: トランプ54枚分のコードを返す', () => {
    const codes = getTrumpCardCodes();

    expect(codes).toHaveLength(54);
    expect(codes[0]).toBe('c01');
    expect(codes[12]).toBe('c13');
    expect(codes[13]).toBe('d01');
    expect(codes[51]).toBe('s13');
    expect(codes[52]).toBe('x01');
    expect(codes[53]).toBe('x02');
  });

  it('getDiceMenuItems: ダイス作成メニュー定義を返す', () => {
    expect(getDiceMenuItems()).toEqual([
      { menuName: 'D4', diceName: 'D4', type: DiceType.D4, imagePathPrefix: '4_dice' },
      { menuName: 'D6', diceName: 'D6', type: DiceType.D6, imagePathPrefix: '6_dice' },
      { menuName: 'D8', diceName: 'D8', type: DiceType.D8, imagePathPrefix: '8_dice' },
      { menuName: 'D10', diceName: 'D10', type: DiceType.D10, imagePathPrefix: '10_dice' },
      { menuName: 'D10 (00-90)', diceName: 'D10', type: DiceType.D10_10TIMES, imagePathPrefix: '100_dice' },
      { menuName: 'D12', diceName: 'D12', type: DiceType.D12, imagePathPrefix: '12_dice' },
      { menuName: 'D20', diceName: 'D20', type: DiceType.D20, imagePathPrefix: '20_dice' },
    ]);
  });

  it('getRangeMenuItems: 射程範囲メニュー定義を返す', () => {
    expect(getRangeMenuItems()).toEqual([
      { menuName: 'コーン', typeName: 'CORN' },
      { menuName: '直線', typeName: 'LINE' },
      { menuName: '円', typeName: 'CIRCLE' },
      { menuName: '正方形', typeName: 'SQUARE' },
      { menuName: 'ダイヤ', typeName: 'DIAMOND' },
    ]);
  });

  it('定数パス: 地形とトランプ裏面の画像パスを提供する', () => {
    expect(TERRAIN_TEXTURE_PATH).toBe('./assets/images/tex.jpg');
    expect(TRUMP_BACK_IMAGE_PATH).toBe('./assets/images/trump/z02.gif');
  });
});