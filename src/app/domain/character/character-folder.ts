export const FOLDER_SEPARATOR = '/';
export const MAX_FOLDER_DEPTH = 4;

const FULL_WIDTH_SEPARATOR = /／/g;

export function folderSegments(path: string): string[] {
  return path
    .replace(FULL_WIDTH_SEPARATOR, FOLDER_SEPARATOR)
    .split(FOLDER_SEPARATOR)
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0)
    .slice(0, MAX_FOLDER_DEPTH);
}

export function normalizeFolderPath(raw: string): string {
  return folderSegments(raw).join(FOLDER_SEPARATOR);
}

export function parentFolderPath(path: string): string {
  return folderSegments(path).slice(0, -1).join(FOLDER_SEPARATOR);
}

export function ancestorFolderPaths(path: string): string[] {
  const segments = folderSegments(path);
  const paths: string[] = [];
  for (let length = 1; length <= segments.length; length++) {
    paths.push(segments.slice(0, length).join(FOLDER_SEPARATOR));
  }
  return paths;
}

export function isDescendantFolderPath(path: string, ancestor: string): boolean {
  if (ancestor.length < 1) return false;
  return path === ancestor || path.startsWith(ancestor + FOLDER_SEPARATOR);
}

export function rewriteFolderPath(path: string, from: string, to: string): string {
  if (!isDescendantFolderPath(path, from)) return path;
  const destination = normalizeFolderPath(to);
  if (destination.length < 1) return '';
  return normalizeFolderPath(destination + path.slice(from.length));
}
