export interface ContainedImageRect {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

export function containedImageRect(
  frameWidth: number,
  frameHeight: number,
  naturalWidth: number,
  naturalHeight: number,
  padding = 0
): ContainedImageRect | null {
  const availableWidth = Math.max(0, frameWidth - padding * 2);
  const availableHeight = Math.max(0, frameHeight - padding * 2);
  if (!naturalWidth || !naturalHeight || !availableWidth || !availableHeight) return null;

  const scale = Math.min(availableWidth / naturalWidth, availableHeight / naturalHeight);
  const width = naturalWidth * scale;
  const height = naturalHeight * scale;
  return {
    left: padding + (availableWidth - width) / 2,
    top: padding + (availableHeight - height) / 2,
    width,
    height,
  };
}
