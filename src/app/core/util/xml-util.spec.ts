import { decodeEntityReference, encodeEntityReference, xml2element } from '@axe/core/util/xml-util';

describe('XmlUtil', () => {
  describe('encodeEntityReference()', () => {
    it('encodes an ampersand', () => {
      expect(encodeEntityReference('&')).toBe('&amp;');
    });

    it('encodes a less-than sign', () => {
      expect(encodeEntityReference('<')).toBe('&lt;');
    });

    it('encodes a greater-than sign', () => {
      expect(encodeEntityReference('>')).toBe('&gt;');
    });

    it('encodes a double quote', () => {
      expect(encodeEntityReference('"')).toBe('&quot;');
    });

    it('encodes a single quote', () => {
      expect(encodeEntityReference("'")).toBe('&apos;');
    });

    it('encodes several special characters at once', () => {
      expect(encodeEntityReference('<div class="test">&</div>')).toBe(
        '&lt;div class=&quot;test&quot;&gt;&amp;&lt;/div&gt;'
      );
    });

    it('leaves a string with nothing special in it alone', () => {
      expect(encodeEntityReference('hello world')).toBe('hello world');
    });

    it('returns an empty string for an empty string', () => {
      expect(encodeEntityReference('')).toBe('');
    });

    it('encodes a string carrying non-ascii text', () => {
      expect(encodeEntityReference('テスト&データ')).toBe('テスト&amp;データ');
    });
  });

  describe('decodeEntityReference()', () => {
    it('decodes an ampersand', () => {
      expect(decodeEntityReference('&amp;')).toBe('&');
    });

    it('decodes a less-than sign', () => {
      expect(decodeEntityReference('&lt;')).toBe('<');
    });

    it('decodes a greater-than sign', () => {
      expect(decodeEntityReference('&gt;')).toBe('>');
    });

    it('decodes a double quote', () => {
      expect(decodeEntityReference('&quot;')).toBe('"');
    });

    it('decodes a single quote', () => {
      expect(decodeEntityReference('&apos;')).toBe("'");
    });

    it('decoding several entities together', () => {
      expect(decodeEntityReference('&lt;div&gt;&amp;&lt;/div&gt;')).toBe('<div>&</div>');
    });

    it('leaves a string with no entities alone', () => {
      expect(decodeEntityReference('hello world')).toBe('hello world');
    });

    it('returns an empty string for an empty string', () => {
      expect(decodeEntityReference('')).toBe('');
    });
  });

  describe('encode/decode the round trip', () => {
    it('comes back unchanged', () => {
      const original = 'Hello <World> & "test" \'value\'';
      const encoded = encodeEntityReference(original);
      const decoded = decodeEntityReference(encoded);
      expect(decoded).toBe(original);
    });
  });

  describe('xml2element()', () => {
    it('reads valid xml into an element', () => {
      const element = xml2element('<root><child>text</child></root>');
      expect(element).toBeTruthy();
      expect(element!.tagName).toBe('root');
    });

    it('reads xml carrying attributes', () => {
      const element = xml2element('<item name="test" value="123" />');
      expect(element).toBeTruthy();
      expect(element!.getAttribute('name')).toBe('test');
      expect(element!.getAttribute('value')).toBe('123');
    });

    it('reads xml carrying children', () => {
      const element = xml2element('<parent><child1/><child2/></parent>');
      expect(element!.children.length).toBe(2);
    });

    it('returns nothing for broken xml', () => {
      const element = xml2element('<unclosed>');
      expect(element).toBeNull();
    });

    it('strips the control characters', () => {
      const element = xml2element('<root>\x00\x01text</root>');
      expect(element).toBeTruthy();
      expect(element!.textContent).toBe('text');
    });

    it('strips the vertical tab and form feed', () => {
      const element = xml2element('<root>\x0B\x0Ctext</root>');
      expect(element).toBeTruthy();
      expect(element!.textContent).toBe('text');
    });

    it('keeps the tabs and line endings', () => {
      const element = xml2element('<root>\t\n\rtext</root>');
      expect(element).toBeTruthy();
      expect(element!.textContent).toContain('text');
      expect(element!.textContent).toContain('\t');
      expect(element!.textContent).toContain('\n');
    });

    it('strips the non-characters', () => {
      const element = xml2element('<root>\uFFFE\uFFFFtext</root>');
      expect(element).toBeTruthy();
      expect(element!.textContent).toBe('text');
    });

    it('keeps a valid surrogate pair, an emoji among them', () => {
      const element = xml2element('<root>\uD83D\uDE00</root>');
      expect(element).toBeTruthy();
      expect(element!.textContent).toBe('\uD83D\uDE00');
    });

    it('returns nothing for an empty string', () => {
      const element = xml2element('');
      expect(element).toBeNull();
    });
  });
});
