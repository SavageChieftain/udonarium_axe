export const MAP_STAMP_TAG = 'マップスタンプ';

const IMAGE_STAMP_PREFIX = 'media:';

export function isImageStampId(stampId: string): boolean {
  return stampId.startsWith(IMAGE_STAMP_PREFIX);
}

export function toImageStampId(identifier: string): string {
  return IMAGE_STAMP_PREFIX + identifier;
}

export function imageStampIdentifier(stampId: string): string {
  return isImageStampId(stampId) ? stampId.slice(IMAGE_STAMP_PREFIX.length) : '';
}
