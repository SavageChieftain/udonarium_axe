import { DataElement, DataElementAttribute, DataElementFieldType } from '@axe/domain/data/data-element';
import { type CalcEnv, evalCalcFormula } from '@axe/domain/data/data-element-calc';

export function buildCalcEnv(self: DataElement): CalcEnv {
  return buildCalcEnvWithin(self, new Set([self.identifier]));
}

/**
 * The worked-out value of a calculating field, as text.
 *
 * A field of this kind keeps its formula rather than its result, so its stored value is empty.
 * Anything showing it — the sheet, a popup, a line of chat — asks here instead.
 */
export function evaluateCalcElement(element: DataElement): string {
  const result = evaluateCalcNumber(element, new Set([element.identifier]));
  if (result == null) return '';
  return Number.isNaN(result) ? '?' : String(result % 1 === 0 ? result : parseFloat(result.toFixed(4)));
}

/**
 * Everything the result is worked out from, so a screen showing it can watch them all.
 * A field reads the whole of the sheet it belongs to, not only what its formula names.
 */
export function calcSourceIdentifiers(element: DataElement): string[] {
  const root = DataElement.getDetailNameScope(element);
  const identifiers: string[] = [];
  const collect = (node: DataElement): void => {
    identifiers.push(node.identifier);
    for (const child of node.children) collect(child);
  };
  collect(root);
  return identifiers;
}

function evaluateCalcNumber(element: DataElement, visiting: ReadonlySet<string>): number | null {
  const formula = element.getAttribute(DataElementAttribute.FORMULA);
  if (!formula) return null;
  return evalCalcFormula(formula, buildCalcEnvWithin(element, visiting));
}

function buildCalcEnvWithin(self: DataElement, visiting: ReadonlySet<string>): CalcEnv {
  const env: CalcEnv = {};
  const root = DataElement.getDetailNameScope(self);
  const entries: { name: string; path: string; value: number }[] = [];
  collectCalcEntries(root, root, entries, visiting);

  const nameCounts = new Map<string, number>();
  for (const entry of entries) nameCounts.set(entry.name, (nameCounts.get(entry.name) ?? 0) + 1);
  for (const entry of entries) {
    env[entry.path] = entry.value;
    if (nameCounts.get(entry.name) === 1) env[entry.name] = entry.value;
  }
  return env;
}

function collectCalcEntries(
  node: DataElement,
  root: DataElement,
  entries: { name: string; path: string; value: number }[],
  visiting: ReadonlySet<string>
): void {
  if (!node.children.length) {
    const num = numberOf(node, visiting);
    if (num != null && !Number.isNaN(num) && node.name) {
      entries.push({ name: node.name, path: DataElement.formatReferencePath(node, root), value: num });
    }
    return;
  }
  for (const child of node.children) collectCalcEntries(child, root, entries, visiting);
}

function numberOf(node: DataElement, visiting: ReadonlySet<string>): number | null {
  if (node.fieldType === DataElementFieldType.CALC) {
    // A field naming itself, however far round, would work itself out for ever.
    if (visiting.has(node.identifier)) return null;
    return evaluateCalcNumber(node, new Set([...visiting, node.identifier]));
  }
  // A resource stands at its current value; its stored value is only the top of the bar.
  return Number(node.isNumberResource ? node.currentValue : node.value);
}
