export const ZIP_DEFLATE_LEVEL = 6;
export const ZIP_STORE_LEVEL = 0;

const PRECOMPRESSED_TYPE_PREFIXES = ['image/', 'audio/', 'video/'];
const PRECOMPRESSED_TYPES = ['application/zip', 'application/gzip', 'application/x-7z-compressed'];
const PRECOMPRESSED_EXTENSIONS = [
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.avif',
  '.apng',
  '.mp3',
  '.m4a',
  '.aac',
  '.ogg',
  '.opus',
  '.webm',
  '.mp4',
  '.zip',
  '.gz',
];

export function isPrecompressed(name: string, mimeType: string): boolean {
  const type = mimeType.toLowerCase();
  if (PRECOMPRESSED_TYPE_PREFIXES.some((prefix) => type.startsWith(prefix))) return true;
  if (PRECOMPRESSED_TYPES.includes(type)) return true;
  const lowerName = name.toLowerCase();
  return PRECOMPRESSED_EXTENSIONS.some((extension) => lowerName.endsWith(extension));
}

export function zipCompressionLevel(name: string, mimeType: string): 0 | 6 {
  return isPrecompressed(name, mimeType) ? ZIP_STORE_LEVEL : ZIP_DEFLATE_LEVEL;
}
