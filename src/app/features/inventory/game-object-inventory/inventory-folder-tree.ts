import { FOLDER_SEPARATOR, folderSegments } from '@axe/domain/character/character-folder';

export interface FolderNode<T> {
  readonly path: string;
  readonly name: string;
  readonly depth: number;
  readonly items: T[];
  readonly children: FolderNode<T>[];
  readonly totalCount: number;
}

export interface FolderTree<T> {
  readonly roots: FolderNode<T>[];
  readonly loose: T[];
}

interface FolderBuilder<T> {
  path: string;
  name: string;
  depth: number;
  items: T[];
  children: Map<string, FolderBuilder<T>>;
}

export function buildFolderTree<T>(items: readonly T[], pathOf: (item: T) => string): FolderTree<T> {
  const roots = new Map<string, FolderBuilder<T>>();
  const loose: T[] = [];

  for (const item of items) {
    const segments = folderSegments(pathOf(item));
    if (segments.length < 1) {
      loose.push(item);
      continue;
    }

    let level = roots;
    let path = '';
    let node: FolderBuilder<T> | null = null;
    for (const [depth, segment] of segments.entries()) {
      path = path.length < 1 ? segment : `${path}${FOLDER_SEPARATOR}${segment}`;
      let next = level.get(segment);
      if (!next) {
        next = { path, name: segment, depth, items: [], children: new Map() };
        level.set(segment, next);
      }
      node = next;
      level = next.children;
    }
    node?.items.push(item);
  }

  return { roots: settleLevel(roots), loose };
}

export function collectFolderPaths<T>(tree: FolderTree<T>): string[] {
  const paths: string[] = [];
  const walk = (nodes: readonly FolderNode<T>[]) => {
    for (const node of nodes) {
      paths.push(node.path);
      walk(node.children);
    }
  };
  walk(tree.roots);
  return paths;
}

export function descendantFolderPaths<T>(node: FolderNode<T>): string[] {
  const paths = [node.path];
  for (const child of node.children) paths.push(...descendantFolderPaths(child));
  return paths;
}

function settleLevel<T>(level: Map<string, FolderBuilder<T>>): FolderNode<T>[] {
  return [...level.values()]
    .map((builder) => {
      const children = settleLevel(builder.children);
      return {
        path: builder.path,
        name: builder.name,
        depth: builder.depth,
        items: builder.items,
        children,
        totalCount: builder.items.length + children.reduce((sum, child) => sum + child.totalCount, 0),
      };
    })
    .sort((left, right) => left.name.localeCompare(right.name, 'ja', { numeric: true }));
}
