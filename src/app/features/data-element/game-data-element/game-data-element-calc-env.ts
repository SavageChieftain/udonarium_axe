import { DataElement, DataElementAttribute } from '@axe/domain/data/data-element';
import { type CalcEnv, evalCalcFormula } from '@axe/features/data-element/game-data-element/game-data-element-calc';

/**
 * 計算式の環境変数マップを `self` の所属する detail スコープから組み立てる。
 *
 * - 葉ノードのうち、値が数値で名前を持つものだけが env に入る
 * - キー: `[section/group/field]` 形式のフルパス
 * - 名前が重複しない要素は短縮キー（要素名のみ）でも引けるようにする
 */
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

/**
 * 計算式属性 (FORMULA) を読み取り、env を組み立てて評価した結果を文字列化する。
 * 数式が無い場合は空文字、評価不能なら "?" を返す。
 */
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
