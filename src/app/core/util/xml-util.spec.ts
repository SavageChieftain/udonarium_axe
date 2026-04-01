import { decodeEntityReference, encodeEntityReference, xml2element } from '@axe/core/util/xml-util';

describe('XmlUtil', () => {
  describe('encodeEntityReference()', () => {
    it('& を &amp; にエンコードする', () => {
      expect(encodeEntityReference('&')).toBe('&amp;');
    });

    it('< を &lt; にエンコードする', () => {
      expect(encodeEntityReference('<')).toBe('&lt;');
    });

    it('> を &gt; にエンコードする', () => {
      expect(encodeEntityReference('>')).toBe('&gt;');
    });

    it('" を &quot; にエンコードする', () => {
      expect(encodeEntityReference('"')).toBe('&quot;');
    });

    it("' を &apos; にエンコードする", () => {
      expect(encodeEntityReference("'")).toBe('&apos;');
    });

    it('複数の特殊文字を同時にエンコードする', () => {
      expect(encodeEntityReference('<div class="test">&</div>')).toBe(
        '&lt;div class=&quot;test&quot;&gt;&amp;&lt;/div&gt;'
      );
    });

    it('特殊文字を含まない文字列はそのまま返す', () => {
      expect(encodeEntityReference('hello world')).toBe('hello world');
    });

    it('空文字列は空文字列を返す', () => {
      expect(encodeEntityReference('')).toBe('');
    });

    it('日本語を含む文字列が正しくエンコードされる', () => {
      expect(encodeEntityReference('テスト&データ')).toBe('テスト&amp;データ');
    });
  });

  describe('decodeEntityReference()', () => {
    it('&amp; を & にデコードする', () => {
      expect(decodeEntityReference('&amp;')).toBe('&');
    });

    it('&lt; を < にデコードする', () => {
      expect(decodeEntityReference('&lt;')).toBe('<');
    });

    it('&gt; を > にデコードする', () => {
      expect(decodeEntityReference('&gt;')).toBe('>');
    });

    it('&quot; を " にデコードする', () => {
      expect(decodeEntityReference('&quot;')).toBe('"');
    });

    it("&apos; を ' にデコードする", () => {
      expect(decodeEntityReference('&apos;')).toBe("'");
    });

    it('複合エンティティのデコード', () => {
      expect(decodeEntityReference('&lt;div&gt;&amp;&lt;/div&gt;')).toBe('<div>&</div>');
    });

    it('エンティティを含まない文字列はそのまま返す', () => {
      expect(decodeEntityReference('hello world')).toBe('hello world');
    });

    it('空文字列は空文字列を返す', () => {
      expect(decodeEntityReference('')).toBe('');
    });
  });

  describe('encode/decode ラウンドトリップ', () => {
    it('エンコード→デコードで元に戻る', () => {
      const original = 'Hello <World> & "test" \'value\'';
      const encoded = encodeEntityReference(original);
      const decoded = decodeEntityReference(encoded);
      expect(decoded).toBe(original);
    });
  });

  describe('xml2element()', () => {
    it('有効なXMLをパースしてElementを返す', () => {
      const element = xml2element('<root><child>text</child></root>');
      expect(element).toBeTruthy();
      expect(element!.tagName).toBe('root');
    });

    it('属性付きXMLをパースする', () => {
      const element = xml2element('<item name="test" value="123" />');
      expect(element).toBeTruthy();
      expect(element!.getAttribute('name')).toBe('test');
      expect(element!.getAttribute('value')).toBe('123');
    });

    it('子要素を持つXMLをパースする', () => {
      const element = xml2element('<parent><child1/><child2/></parent>');
      expect(element!.children.length).toBe(2);
    });

    it('不正なXMLはnullを返す', () => {
      const element = xml2element('<unclosed>');
      expect(element).toBeNull();
    });

    it('制御文字がサニタイズされる', () => {
      const element = xml2element('<root>\x00\x01text</root>');
      expect(element).toBeTruthy();
      expect(element!.textContent).toBe('text');
    });

    it('VT・FFがサニタイズされる', () => {
      const element = xml2element('<root>\x0B\x0Ctext</root>');
      expect(element).toBeTruthy();
      expect(element!.textContent).toBe('text');
    });

    it('タブ・改行・CRは保持される', () => {
      const element = xml2element('<root>\t\n\rtext</root>');
      expect(element).toBeTruthy();
      expect(element!.textContent).toContain('text');
      expect(element!.textContent).toContain('\t');
      expect(element!.textContent).toContain('\n');
    });

    it('非文字(U+FFFE, U+FFFF)がサニタイズされる', () => {
      const element = xml2element('<root>\uFFFE\uFFFFtext</root>');
      expect(element).toBeTruthy();
      expect(element!.textContent).toBe('text');
    });

    it('正常なサロゲートペア(絵文字)は保持される', () => {
      const element = xml2element('<root>\uD83D\uDE00</root>');
      expect(element).toBeTruthy();
      expect(element!.textContent).toBe('\uD83D\uDE00');
    });

    it('空文字列はnullを返す', () => {
      const element = xml2element('');
      expect(element).toBeNull();
    });
  });
});
