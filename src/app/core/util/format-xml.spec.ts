import { formatXml } from '@axe/core/util/format-xml';

const options = { indentation: '  ', lineSeparator: '\n' } as const;

describe('formatXml', () => {
  it('puts the declaration and each element on its own line, indented by depth', () => {
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

  it('keeps an element holding only text on one line', () => {
    const xml = '<a><b>text</b></a>';

    expect(formatXml(xml, options)).toBe(['<a>', '  <b>text</b>', '</a>'].join('\n'));
  });

  it('keeps an empty element on one line', () => {
    const xml = '<a><b/><c></c></a>';

    expect(formatXml(xml, options)).toBe(['<a>', '  <b/>', '  <c></c>', '</a>'].join('\n'));
  });

  it('leaves the entities in an attribute alone', () => {
    const xml = '<a attr="&gt;&lt;&amp;&quot;">&#10;</a>';

    expect(formatXml(xml, options)).toBe('<a attr="&gt;&lt;&amp;&quot;">&#10;</a>');
  });

  it('takes the indent and the line ending it is given', () => {
    const xml = '<a><b>1</b></a>';

    expect(formatXml(xml, { indentation: '\t', lineSeparator: '\r\n' })).toBe('<a>\r\n\t<b>1</b>\r\n</a>');
  });

  it('indents two spaces and ends lines with a newline by default', () => {
    expect(formatXml('<a><b>1</b></a>')).toBe('<a>\n  <b>1</b>\n</a>');
  });
});
