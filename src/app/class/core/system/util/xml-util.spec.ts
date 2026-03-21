import { describe, it, expect } from 'vitest';
import { XmlUtil } from './xml-util';

describe('XmlUtil', () => {
  describe('encodeEntityReference()', () => {
    it('& を &amp; にエンコードする', () => {
      expect(XmlUtil.encodeEntityReference('&')).toBe('&amp;');
    });

    it('< を &lt; にエンコードする', () => {
      expect(XmlUtil.encodeEntityReference('<')).toBe('&lt;');
    });

    it('> を &gt; にエンコードする', () => {
      expect(XmlUtil.encodeEntityReference('>')).toBe('&gt;');
    });

    it('" を &quot; にエンコードする', () => {
      expect(XmlUtil.encodeEntityReference('"')).toBe('&quot;');
    });

    it("' を &apos; にエンコードする", () => {
      expect(XmlUtil.encodeEntityReference("'")).toBe('&apos;');
    });

    it('複数の特殊文字を同時にエンコードする', () => {
      expect(XmlUtil.encodeEntityReference('<div class="test">&</div>')).toBe(
        '&lt;div class=&quot;test&quot;&gt;&amp;&lt;/div&gt;'
      );
    });

    it('特殊文字を含まない文字列はそのまま返す', () => {
      expect(XmlUtil.encodeEntityReference('hello world')).toBe('hello world');
    });

    it('空文字列は空文字列を返す', () => {
      expect(XmlUtil.encodeEntityReference('')).toBe('');
    });

    it('日本語を含む文字列が正しくエンコードされる', () => {
      expect(XmlUtil.encodeEntityReference('テスト&データ')).toBe('テスト&amp;データ');
    });
  });

  describe('decodeEntityReference()', () => {
    it('&amp; を & にデコードする', () => {
      expect(XmlUtil.decodeEntityReference('&amp;')).toBe('&');
    });

    it('&lt; を < にデコードする', () => {
      expect(XmlUtil.decodeEntityReference('&lt;')).toBe('<');
    });

    it('&gt; を > にデコードする', () => {
      expect(XmlUtil.decodeEntityReference('&gt;')).toBe('>');
    });

    it('&quot; を " にデコードする', () => {
      expect(XmlUtil.decodeEntityReference('&quot;')).toBe('"');
    });

    it("&apos; を ' にデコードする", () => {
      expect(XmlUtil.decodeEntityReference('&apos;')).toBe("'");
    });

    it('複合エンティティのデコード', () => {
      expect(XmlUtil.decodeEntityReference('&lt;div&gt;&amp;&lt;/div&gt;')).toBe('<div>&</div>');
    });

    it('エンティティを含まない文字列はそのまま返す', () => {
      expect(XmlUtil.decodeEntityReference('hello world')).toBe('hello world');
    });

    it('空文字列は空文字列を返す', () => {
      expect(XmlUtil.decodeEntityReference('')).toBe('');
    });
  });

  describe('encode/decode ラウンドトリップ', () => {
    it('エンコード→デコードで元に戻る', () => {
      const original = 'Hello <World> & "test" \'value\'';
      const encoded = XmlUtil.encodeEntityReference(original);
      const decoded = XmlUtil.decodeEntityReference(encoded);
      expect(decoded).toBe(original);
    });
  });

  describe('xml2element()', () => {
    it('有効なXMLをパースしてElementを返す', () => {
      const element = XmlUtil.xml2element('<root><child>text</child></root>');
      expect(element).toBeTruthy();
      expect(element.tagName).toBe('root');
    });

    it('属性付きXMLをパースする', () => {
      const element = XmlUtil.xml2element('<item name="test" value="123" />');
      expect(element).toBeTruthy();
      expect(element.getAttribute('name')).toBe('test');
      expect(element.getAttribute('value')).toBe('123');
    });

    it('子要素を持つXMLをパースする', () => {
      const element = XmlUtil.xml2element('<parent><child1/><child2/></parent>');
      expect(element.children.length).toBe(2);
    });

    it('不正なXMLはnullを返す', () => {
      const element = XmlUtil.xml2element('<unclosed>');
      expect(element).toBeNull();
    });

    it('制御文字がサニタイズされる', () => {
      const element = XmlUtil.xml2element('<root>\x00\x01text</root>');
      expect(element).toBeTruthy();
      expect(element.textContent).toBe('text');
    });

    it('空文字列はnullを返す', () => {
      const element = XmlUtil.xml2element('');
      expect(element).toBeNull();
    });
  });
});
