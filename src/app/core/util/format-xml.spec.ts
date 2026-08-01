import { formatXml } from '@axe/core/util/format-xml';

const options = { indentation: '  ', lineSeparator: '\n' } as const;

describe('formatXml', () => {
  it('宣言と要素を行ごとに並べ、深さぶん字下げする', () => {
    const xml =
      '<?xml version="1.0" encoding="UTF-8"?><room name="test"><character name="A"><data name="hp">10</data></character></room>';

    expect(formatXml(xml, options)).toBe(
      [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<room name="test">',
        '  <character name="A">',
        '    <data name="hp">10</data>',
        '  </character>',
        '</room>',
      ].join('\n')
    );
  });

  it('テキストだけを持つ要素は 1 行に収める', () => {
    const xml = '<a><b>text</b></a>';

    expect(formatXml(xml, options)).toBe(['<a>', '  <b>text</b>', '</a>'].join('\n'));
  });

  it('空要素タグはそのまま 1 行にする', () => {
    const xml = '<a><b/><c></c></a>';

    expect(formatXml(xml, options)).toBe(['<a>', '  <b/>', '  <c></c>', '</a>'].join('\n'));
  });

  it('属性値のエンティティを書き換えない', () => {
    const xml = '<a attr="&gt;&lt;&amp;&quot;">&#10;</a>';

    expect(formatXml(xml, options)).toBe('<a attr="&gt;&lt;&amp;&quot;">&#10;</a>');
  });

  it('字下げ文字と改行文字を指定できる', () => {
    const xml = '<a><b>1</b></a>';

    expect(formatXml(xml, { indentation: '\t', lineSeparator: '\r\n' })).toBe('<a>\r\n\t<b>1</b>\r\n</a>');
  });

  it('既定は 2 スペースと LF', () => {
    expect(formatXml('<a><b>1</b></a>')).toBe('<a>\n  <b>1</b>\n</a>');
  });
});
