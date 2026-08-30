export type PaletteLineKind = 'command' | 'heading' | 'variable' | 'empty';

export interface PaletteRow {
  text: string;
  kind: PaletteLineKind;
  lineIndex: number;
  headingName?: string;
}

const DASH_HEADING = /^\/\/--[-]+(.*)$/;
const MARK_HEADING = /^◆(.*)$/;
const VARIABLE = /^\s*[/／]{2}([^=＝{}｛｝\s]+)\s*[=＝]\s*(.+)/;

/** What each line of a palette is: something to say, a heading over the rest, a variable, or nothing. */
export function paletteRowsOf(lines: readonly string[]): PaletteRow[] {
  return lines.map((text, lineIndex): PaletteRow => {
    if (/^\s*$/.test(text)) return { text, kind: 'empty', lineIndex };

    const dashed = text.match(DASH_HEADING);
    if (dashed) return { text, kind: 'heading', lineIndex, headingName: dashed[1].replace(/-+$/, '') };

    const marked = text.match(MARK_HEADING);
    if (marked) return { text, kind: 'heading', lineIndex, headingName: marked[1] };

    if (VARIABLE.test(text)) return { text, kind: 'variable', lineIndex };
    return { text, kind: 'command', lineIndex };
  });
}

export interface PaletteCommandGroup {
  /** The heading these lines sit under, empty for the ones written before any heading. */
  heading: string;
  lines: string[];
}

/** The lines worth sending, kept under the headings they were written beneath. */
export function paletteCommandGroups(lines: readonly string[]): PaletteCommandGroup[] {
  const groups: PaletteCommandGroup[] = [];
  let current: PaletteCommandGroup | null = null;

  for (const row of paletteRowsOf(lines)) {
    if (row.kind === 'heading') {
      current = { heading: (row.headingName ?? '').trim(), lines: [] };
      groups.push(current);
      continue;
    }
    if (row.kind !== 'command') continue;

    if (!current) {
      current = { heading: '', lines: [] };
      groups.push(current);
    }
    current.lines.push(row.text.trim());
  }

  return groups.filter((group) => group.lines.length > 0);
}
