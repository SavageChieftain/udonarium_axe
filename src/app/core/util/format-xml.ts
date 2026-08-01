export interface FormatXmlOptions {
  readonly indentation?: string;
  readonly lineSeparator?: string;
}

const TOKEN = /<[^>]*>|[^<]+/g;

export function formatXml(xml: string, options: FormatXmlOptions = {}): string {
  const indentation = options.indentation ?? '  ';
  const lineSeparator = options.lineSeparator ?? '\n';

  const lines: string[] = [];
  let depth = 0;
  let pending: string | null = null;
  let pendingText = '';

  const flush = (closing?: string) => {
    if (pending === null) return;
    lines.push(indentation.repeat(depth) + pending + pendingText + (closing ?? ''));
    if (closing === undefined) depth += 1;
    pending = null;
    pendingText = '';
  };

  for (const token of xml.match(TOKEN) ?? []) {
    if (!token.startsWith('<')) {
      if (pending !== null) pendingText += token.trim();
      continue;
    }

    if (isClosingTag(token)) {
      if (pending !== null) {
        flush(token);
        continue;
      }
      depth = Math.max(0, depth - 1);
      lines.push(indentation.repeat(depth) + token);
      continue;
    }

    flush();
    if (isStandaloneTag(token)) {
      lines.push(indentation.repeat(depth) + token);
      continue;
    }
    pending = token;
  }
  flush();

  return lines.join(lineSeparator);
}

function isClosingTag(token: string): boolean {
  return token.startsWith('</');
}

function isStandaloneTag(token: string): boolean {
  return token.startsWith('<?') || token.startsWith('<!') || token.endsWith('/>');
}
