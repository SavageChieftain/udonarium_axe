import { DataElement } from '@axe/domain/data/data-element';
import { evalCalcFormula } from '@axe/features/data-element/game-data-element/game-data-element-calc';
import { buildCalcEnv } from '@axe/features/data-element/game-data-element/game-data-element-calc-env';

describe('buildCalcEnv', () => {
  it('数値の葉ノードを名前で引ける env を返す', () => {
    const detail = DataElement.create('detail', '');
    const hp = DataElement.create('HP', '15');
    detail.appendChild(hp);

    const env = buildCalcEnv(hp);
    expect(env['HP']).toBe(15);
  });

  it('数値でない葉ノードは env に入らない', () => {
    const detail = DataElement.create('detail', '');
    const memo = DataElement.create('memo', 'こんにちは');
    detail.appendChild(memo);

    const env = buildCalcEnv(memo);
    expect(env['memo']).toBeUndefined();
  });

  it('深い階層の葉ノードもフルパスで引ける', () => {
    const detail = DataElement.create('detail', '');
    const section = DataElement.create('基本', '');
    const group = DataElement.create('能力', '');
    const str = DataElement.create('筋力', '8');
    detail.appendChild(section);
    section.appendChild(group);
    group.appendChild(str);

    const env = buildCalcEnv(str);
    expect(env['基本/能力/筋力']).toBe(8);
    expect(env['筋力']).toBe(8);
  });

  it('同名の葉ノードが複数あるときは短縮キーは設定されない', () => {
    const detail = DataElement.create('detail', '');
    const sectionA = DataElement.create('A', '');
    const sectionB = DataElement.create('B', '');
    const valueA = DataElement.create('値', '3');
    const valueB = DataElement.create('値', '7');
    detail.appendChild(sectionA);
    detail.appendChild(sectionB);
    sectionA.appendChild(valueA);
    sectionB.appendChild(valueB);

    const env = buildCalcEnv(valueA);
    expect(env['A/値']).toBe(3);
    expect(env['B/値']).toBe(7);
    expect(env['値']).toBeUndefined();
  });

  it('evalCalcFormula と組み合わせて数式を解決できる', () => {
    const detail = DataElement.create('detail', '');
    const hp = DataElement.create('HP', '10');
    const buff = DataElement.create('buff', '5');
    detail.appendChild(hp);
    detail.appendChild(buff);

    const env = buildCalcEnv(hp);
    expect(evalCalcFormula('HP + buff', env)).toBe(15);
  });
});
