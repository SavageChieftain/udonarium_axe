import { DiceType } from '@axe/domain/dice/dice-symbol';

export const TERRAIN_TEXTURE_PATH = './assets/images/tex.jpg';
export const TRUMP_BACK_IMAGE_PATH = './assets/images/trump/z02.gif';

export interface DiceMenuItem {
  menuName: string;
  diceName: string;
  type: DiceType;
  imagePathPrefix: string;
}

export interface RangeMenuItem {
  menuName: string;
  typeName: string;
}

export function getTrumpCardCodes(): string[] {
  const cardCodes: string[] = [];
  for (const suit of ['c', 'd', 'h', 's']) {
    for (let index = 1; index <= 13; index++) {
      cardCodes.push(suit + ('00' + index).slice(-2));
    }
  }
  cardCodes.push('x01', 'x02');
  return cardCodes;
}

export function getDiceMenuItems(): DiceMenuItem[] {
  return [
    { menuName: 'D4', diceName: 'D4', type: DiceType.D4, imagePathPrefix: '4_dice' },
    { menuName: 'D6', diceName: 'D6', type: DiceType.D6, imagePathPrefix: '6_dice' },
    { menuName: 'D8', diceName: 'D8', type: DiceType.D8, imagePathPrefix: '8_dice' },
    { menuName: 'D10', diceName: 'D10', type: DiceType.D10, imagePathPrefix: '10_dice' },
    { menuName: 'D10 (00-90)', diceName: 'D10', type: DiceType.D10_10TIMES, imagePathPrefix: '100_dice' },
    { menuName: 'D12', diceName: 'D12', type: DiceType.D12, imagePathPrefix: '12_dice' },
    { menuName: 'D20', diceName: 'D20', type: DiceType.D20, imagePathPrefix: '20_dice' },
  ];
}

export function getRangeMenuItems(): RangeMenuItem[] {
  return [
    { menuName: 'feature.tabletop.action.rangeShapeLine', typeName: 'LINE' },
    { menuName: 'feature.tabletop.action.rangeShapeCorn', typeName: 'CORN' },
    { menuName: 'feature.tabletop.action.rangeShapeTriangle', typeName: 'TRIANGLE' },
    { menuName: 'feature.tabletop.action.rangeShapeSquare', typeName: 'SQUARE' },
    { menuName: 'feature.tabletop.action.rangeShapePentagon', typeName: 'PENTAGON' },
    { menuName: 'feature.tabletop.action.rangeShapeHexagon', typeName: 'HEXAGON' },
    { menuName: 'feature.tabletop.action.rangeShapeCircle', typeName: 'CIRCLE' },
  ];
}
