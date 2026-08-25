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

export function neighboursOf(links: readonly [number, number][], count: number): number[][] {
  const neighbours: number[][] = Array.from({ length: count }, () => []);
  for (const [a, b] of links) {
    if (a < count && b < count) {
      neighbours[a].push(b);
      neighbours[b].push(a);
    }
  }
  return neighbours;
}

/** How many joins away each point lies from the start. Unreachable points stay at -1. */
export function hopDistances(links: readonly [number, number][], count: number, from: number): number[] {
  const distances = new Array<number>(count).fill(-1);
  if (count < 1) return distances;
  const neighbours = neighboursOf(links, count);
  distances[from] = 0;
  const queue = [from];
  for (let head = 0; head < queue.length; head++) {
    const current = queue[head];
    for (const next of neighbours[current]) {
      if (distances[next] !== -1) continue;
      distances[next] = distances[current] + 1;
      queue.push(next);
    }
  }
  return distances;
}

/** The chain of points from one to another over the joins, or an empty list when they are apart. */
export function pathBetween(links: readonly [number, number][], count: number, from: number, to: number): number[] {
  if (count < 1 || from === to) return from === to ? [from] : [];
  const neighbours = neighboursOf(links, count);
  const cameFrom = new Array<number>(count).fill(-1);
  const seen = new Set<number>([from]);
  const queue = [from];

  for (let head = 0; head < queue.length; head++) {
    const current = queue[head];
    if (current === to) break;
    for (const next of neighbours[current]) {
      if (seen.has(next)) continue;
      seen.add(next);
      cameFrom[next] = current;
      queue.push(next);
    }
  }

  if (!seen.has(to)) return [];
  const path = [to];
  while (path[0] !== from) path.unshift(cameFrom[path[0]]);
  return path;
}
