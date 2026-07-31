export function characterNameFromFileName(fileName: string, fallback: string): string {
  const baseName = fileName.replace(/\.[^.]+$/, '').trim();
  return baseName.length > 0 ? baseName : fallback;
}
