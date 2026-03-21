export namespace XmlUtil {
  const encodePattern = /&|<|>|"|'/g;
  const encodeMap = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&apos;',
  };

  const decodePattern = /&amp;|&lt;|&gt;|&quot;|&apos;/g;
  const decodeMap = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&apos;': "'",
  };

  const sanitizePattern =
    /((?:[\0-\x08\x0B\f\x0E-\x1F\uFFFD\uFFFE\uFFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]))/g;

  export function xml2element(xml: string): HTMLElement {
    const domParser: DOMParser = new DOMParser();
    let xmlDocument: Document = null!;
    try {
      xml = sanitizeXml(xml);
      xmlDocument = domParser.parseFromString(xml, 'application/xml');
      const parsererror = xmlDocument.getElementsByTagName('parsererror');
      if (parsererror.length) {
        console.error('XMLのパースに失敗しました', xmlDocument.documentElement);
        xmlDocument = null!;
      }
    } catch (error) {
      console.error(error);
    }
    return xmlDocument ? xmlDocument.documentElement : null!;
  }

  export function encodeEntityReference(string: string): string {
    return string.replace(encodePattern, encodeReplacer);
  }

  export function decodeEntityReference(string: string): string {
    return string.replace(decodePattern, decodeReplacer);
  }

  function sanitizeXml(xml: string): string {
    return xml.replace(sanitizePattern, '').trim();
  }

  function encodeReplacer(char: string): string {
    return (encodeMap as Record<string, string>)[char];
  }

  function decodeReplacer(entity: string): string {
    return (decodeMap as Record<string, string>)[entity];
  }
}
