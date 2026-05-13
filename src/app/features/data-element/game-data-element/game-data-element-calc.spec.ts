import { evalCalcFormula } from '@axe/features/data-element/game-data-element/game-data-element-calc';

describe('evalCalcFormula', () => {
  it('数値リテラルを評価できること', () => {
    expect(evalCalcFormula('42', {})).toBe(42);
    expect(evalCalcFormula('3.14', {})).toBeCloseTo(3.14);
  });

  it('四則演算を評価できること', () => {
    expect(evalCalcFormula('2 + 3', {})).toBe(5);
    expect(evalCalcFormula('10 - 4', {})).toBe(6);
    expect(evalCalcFormula('3 * 4', {})).toBe(12);
    expect(evalCalcFormula('10 / 4', {})).toBe(2.5);
  });

  it('演算子の優先順位を正しく扱えること', () => {
    expect(evalCalcFormula('2 + 3 * 4', {})).toBe(14);
    expect(evalCalcFormula('(2 + 3) * 4', {})).toBe(20);
  });

  it('累乗 (**) を評価できること', () => {
    expect(evalCalcFormula('2 ** 10', {})).toBe(1024);
  });

  it('単項マイナスを評価できること', () => {
    expect(evalCalcFormula('-5', {})).toBe(-5);
    expect(evalCalcFormula('-(2 + 3)', {})).toBe(-5);
  });

  it('変数を代入できること', () => {
    expect(evalCalcFormula('HP + MP', { HP: 30, MP: 20 })).toBe(50);
  });

  it('角括弧内のパス参照を変数として評価できること', () => {
    expect(evalCalcFormula('[戦闘特技/最終能力/コスト] + 2', { '戦闘特技/最終能力/コスト': 3 })).toBe(5);
  });

  it('変数名が大文字小文字を区別しないこと', () => {
    expect(evalCalcFormula('hp + mp', { HP: 10, MP: 5 })).toBe(15);
  });

  it('組み込み関数を評価できること', () => {
    expect(evalCalcFormula('floor(3.7)', {})).toBe(3);
    expect(evalCalcFormula('ceil(3.1)', {})).toBe(4);
    expect(evalCalcFormula('round(3.5)', {})).toBe(4);
    expect(evalCalcFormula('abs(-7)', {})).toBe(7);
    expect(evalCalcFormula('min(3, 1, 2)', {})).toBe(1);
    expect(evalCalcFormula('max(3, 1, 2)', {})).toBe(3);
  });

  it('未定義変数は NaN を返すこと', () => {
    expect(evalCalcFormula('UNDEFINED', {})).toBeNaN();
  });

  it('空文字は NaN を返すこと', () => {
    expect(evalCalcFormula('', {})).toBeNaN();
  });

  it('複雑な式を評価できること', () => {
    const env = { 基本値: 10, レベル: 5 };
    expect(evalCalcFormula('基本値 + floor(レベル / 2)', env)).toBe(12);
  });
});
