import { DataElement, DataElementAttribute } from '@axe/domain/data/data-element';
import { type CalcEnv, evalCalcFormula } from '@axe/domain/data/data-element-calc';

export function buildCalcEnv(self: DataElement): CalcEnv {
  const env: CalcEnv = {};
  const root = DataElement.getDetailNameScope(self);
  const entries: { name: string; path: string; value: number }[] = [];
  collectCalcEntries(root, root, entries);

  const nameCounts = new Map<string, number>();
  for (const entry of entries) nameCounts.set(entry.name, (nameCounts.get(entry.name) ?? 0) + 1);
  for (const entry of entries) {
    env[entry.path] = entry.value;
    if (nameCounts.get(entry.name) === 1) env[entry.name] = entry.value;
  }
  return env;
}

export function evaluateCalcElement(element: DataElement): string {
  const formula = element.getAttribute(DataElementAttribute.FORMULA);
  if (!formula) return '';
  const env = buildCalcEnv(element);
  const result = evalCalcFormula(formula, env);
  return Number.isNaN(result) ? '?' : String(result % 1 === 0 ? result : parseFloat(result.toFixed(4)));
}

function collectCalcEntries(
  node: DataElement,
  root: DataElement,
  entries: { name: string; path: string; value: number }[]
): void {
  if (!node.children.length) {
    const num = Number(node.value);
    if (!Number.isNaN(num) && node.name) {
      entries.push({ name: node.name, path: DataElement.formatReferencePath(node, root), value: num });
    }
    return;
  }
  for (const child of node.children) collectCalcEntries(child, root, entries);
}
