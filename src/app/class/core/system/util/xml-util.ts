import { Logger } from '@axe/class/core/logger';
import { decodeXML, escapeUTF8 } from 'entities';

export function xml2element(xml: string): HTMLElement {
  const domParser: DOMParser = new DOMParser();
  let xmlDocument: Document = null!;
  try {
    xml = sanitizeXml(xml);
    xmlDocument = domParser.parseFromString(xml, 'application/xml');
    const parsererror = xmlDocument.getElementsByTagName('parsererror');
    if (parsererror.length) {
      Logger.error('[XML] パース失敗', xmlDocument.documentElement);
      xmlDocument = null!;
    }
  } catch (error) {
    Logger.error('[XML] パースエラー', error);
  }
  return xmlDocument ? xmlDocument.documentElement : null!;
}

export function encodeEntityReference(string: string): string {
  return escapeUTF8(string);
}

export function decodeEntityReference(string: string): string {
  return decodeXML(string);
}

function sanitizeXml(xml: string): string {
  let result = '';
  for (let i = 0; i < xml.length; i++) {
    const code = xml.charCodeAt(i);
    if (code <= 0x08 || code === 0x0b || code === 0x0c || (code >= 0x0e && code <= 0x1f)) continue;
    if (code === 0xfffd || code === 0xfffe || code === 0xffff) continue;
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = xml.charCodeAt(i + 1);
      if (next < 0xdc00 || next > 0xdfff) continue;
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      const prev = xml.charCodeAt(i - 1);
      if (prev < 0xd800 || prev > 0xdbff) continue;
    }
    result += xml[i];
  }
  return result.trim();
}
