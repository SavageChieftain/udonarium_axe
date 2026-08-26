import { DungeonPoint } from '@axe/domain/tabletop/dungeon/dungeon-layout';

function manhattan(a: DungeonPoint, b: DungeonPoint): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function ordered(a: number, b: number): [number, number] {
  return a < b ? [a, b] : [b, a];
}

/**
 * Join every point to the rest as cheaply as possible.
 *
 * Prim builds a connected tree by construction, so the dungeon never needs a reachability
 * pass afterwards to find the room it forgot to attach.
 */
export function spanningTree(points: readonly DungeonPoint[]): [number, number][] {
  if (points.length < 2) return [];
  const inTree = new Set<number>([0]);
  const links: [number, number][] = [];

  while (inTree.size < points.length) {
    let best: { from: number; to: number; cost: number } | null = null;
    for (const from of inTree) {
      for (let to = 0; to < points.length; to++) {
        if (inTree.has(to)) continue;
        const cost = manhattan(points[from], points[to]);
        if (best === null || cost < best.cost) best = { from, to, cost };
      }
    }
    if (best === null) break;
    inTree.add(best.to);
    links.push(ordered(best.from, best.to));
  }

  return links;
}

/** The shortest joins the tree left out, which turn a branching dungeon into a looping one. */
export function extraLinks(
  points: readonly DungeonPoint[],
  tree: readonly [number, number][],
  count: number
): [number, number][] {
  if (count < 1) return [];
  const taken = new Set(tree.map(([a, b]) => `${a},${b}`));
  const candidates: { link: [number, number]; cost: number }[] = [];

  for (let a = 0; a < points.length; a++) {
    for (let b = a + 1; b < points.length; b++) {
      const link = ordered(a, b);
      if (taken.has(`${link[0]},${link[1]}`)) continue;
      candidates.push({ link, cost: manhattan(points[a], points[b]) });
    }
  }

  candidates.sort(
    (left, right) => left.cost - right.cost || left.link[0] - right.link[0] || left.link[1] - right.link[1]
  );
  return candidates.slice(0, count).map((candidate) => candidate.link);
}
