import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DataElement } from '@axe/domain/data/data-element';
import { ObjectChangeService } from '@axe/shared/sync/object-change.service';

// ─── パーサー型定義 ────────────────────────────────────────────────────────

export type TextToken = { kind: 'text'; text: string };
export type CheckToken = { kind: 'check'; checked: boolean; idx: number };
export type Token = TextToken | CheckToken;

export type TableCell = Token[];
export type TableRow = { cells: TableCell[] };
export type TableBlock = { kind: 'table'; rows: TableRow[] };
export type PlainBlock = { kind: 'plain'; tokens: Token[] };
export type Block = TableBlock | PlainBlock;

// ─── パーサー関数（純粋関数） ───────────────────────────────────────────────

const CHECK_RE = /[[［]([xXｘＸ]?)[\]］]/g;

function tokenizeLine(text: string, startIdx: number): { tokens: Token[]; nextIdx: number } {
  const tokens: Token[] = [];
  let idx = startIdx;
  let last = 0;
  let m: RegExpExecArray | null;
  CHECK_RE.lastIndex = 0;
  while ((m = CHECK_RE.exec(text)) !== null) {
    if (m.index > last) tokens.push({ kind: 'text', text: text.slice(last, m.index) });
    tokens.push({ kind: 'check', checked: m[1].length > 0, idx: idx++ });
    last = m.index + m[0].length;
  }
  if (last < text.length) tokens.push({ kind: 'text', text: text.slice(last) });
  return { tokens, nextIdx: idx };
}

export function parseCheckTable(raw: string): Block[] {
  const lines = raw.split('\n');
  const blocks: Block[] = [];
  let tableRows: TableRow[] = [];
  let checkIdx = 0;

  const flushTable = () => {
    if (tableRows.length) {
      blocks.push({ kind: 'table', rows: tableRows });
      tableRows = [];
    }
  };

  for (const line of lines) {
    const parts = line.split(/[|｜]/);
    if (parts.length > 1) {
      // テーブル行: | で区切られた列
      const cells: TableCell[] = [];
      for (const part of parts.slice(1, -1)) {
        const { tokens, nextIdx } = tokenizeLine(part, checkIdx);
        checkIdx = nextIdx;
        cells.push(tokens);
      }
      tableRows.push({ cells });
    } else {
      flushTable();
      const { tokens, nextIdx } = tokenizeLine(line, checkIdx);
      checkIdx = nextIdx;
      blocks.push({ kind: 'plain', tokens });
    }
  }
  flushTable();
  return blocks;
}

export function toggleCheckbox(raw: string, targetIdx: number): string {
  let idx = 0;
  return raw.replace(/[[［]([xXｘＸ]?)[\]］]/g, (match, inner) => {
    const current = idx++;
    if (current !== targetIdx) return match;
    return inner.length > 0 ? '[]' : '[x]';
  });
}

// ─── コンポーネント ────────────────────────────────────────────────────────

@Component({
  selector: 'app-check-table',
  templateUrl: './check-table.component.html',
  styleUrls: ['./check-table.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
})
export class CheckTableComponent {
  private readonly objectChange = inject(ObjectChangeService);

  readonly element = input.required<DataElement>();
  readonly isEdit = input(false);

  readonly blocks = computed<Block[]>(() => {
    this.objectChange.versionOf(this.element().identifier)();
    return parseCheckTable(String(this.element().value));
  });

  get editValue(): string {
    return String(this.element().value);
  }
  set editValue(v: string) {
    this.element().value = v;
  }

  toggle(idx: number): void {
    const el = this.element();
    el.value = toggleCheckbox(String(el.value), idx);
  }
}
