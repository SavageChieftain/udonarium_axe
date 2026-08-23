import { DataElement, DataElementAttribute, DataElementFieldType } from '@axe/domain/data/data-element';
import { evalCalcFormula } from '@axe/domain/data/data-element-calc';
import { buildCalcEnv, evaluateCalcElement } from '@axe/domain/data/data-element-calc-env';

describe('buildCalcEnv', () => {
  it('returns an environment that looks numeric leaves up by name', () => {
    const detail = DataElement.create('detail', '');
    const hp = DataElement.create('HP', '15');
    detail.appendChild(hp);

    const env = buildCalcEnv(hp);
    expect(env['HP']).toBe(15);
  });

  it('leaves out anything that is not a number', () => {
    const detail = DataElement.create('detail', '');
    const memo = DataElement.create('memo', 'こんにちは');
    detail.appendChild(memo);

    const env = buildCalcEnv(memo);
    expect(env['memo']).toBeUndefined();
  });

  it('looks a deep leaf up by its full path', () => {
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

  it('sets no short name where two leaves share one', () => {
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

  it('resolves a formula together with the evaluator', () => {
    const detail = DataElement.create('detail', '');
    const hp = DataElement.create('HP', '10');
    const buff = DataElement.create('buff', '5');
    detail.appendChild(hp);
    detail.appendChild(buff);

    const env = buildCalcEnv(hp);
    expect(evalCalcFormula('HP + buff', env)).toBe(15);
  });
});

describe('a resource among the sources', () => {
  function makeResource(name: string, current: number, max: number): DataElement {
    const element = DataElement.create(name, max, { type: 'numberResource', currentValue: current });
    return element;
  }

  it('stands at what it is now rather than at the top of its bar', () => {
    const detail = DataElement.create('detail', '');
    detail.appendChild(makeResource('HP', 4, 20));

    const env = buildCalcEnv(detail);

    expect(env['HP']).toBe(4);
  });
});

describe('evaluateCalcElement', () => {
  function makeCalc(name: string, formula: string): DataElement {
    const element = DataElement.create(name, '');
    element.setAttribute(DataElementAttribute.FIELD_TYPE, DataElementFieldType.CALC);
    element.setAttribute(DataElementAttribute.FORMULA, formula);
    return element;
  }

  it('works out the formula it holds', () => {
    const detail = DataElement.create('detail', '');
    detail.appendChild(DataElement.create('筋力', '8'));
    const calc = makeCalc('攻撃力', '筋力 * 2');
    detail.appendChild(calc);

    expect(evaluateCalcElement(calc)).toBe('16');
  });

  it('reads a field that works itself out in turn', () => {
    const detail = DataElement.create('detail', '');
    detail.appendChild(DataElement.create('筋力', '8'));
    detail.appendChild(makeCalc('攻撃力', '筋力 * 2'));
    const total = makeCalc('総計', '攻撃力 + 1');
    detail.appendChild(total);

    expect(evaluateCalcElement(total)).toBe('17');
  });

  it('gives up rather than going round for ever on a field naming itself', () => {
    const detail = DataElement.create('detail', '');
    const a = makeCalc('あ', 'い + 1');
    const b = makeCalc('い', 'あ + 1');
    detail.appendChild(a);
    detail.appendChild(b);

    expect(evaluateCalcElement(a)).toBe('?');
  });

  it('shows nothing at all where no formula was written', () => {
    const detail = DataElement.create('detail', '');
    const calc = makeCalc('未設定', '');
    detail.appendChild(calc);

    expect(evaluateCalcElement(calc)).toBe('');
  });
});
