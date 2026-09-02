import { DataElement, DataElementType } from '@axe/domain/data/data-element';

export function appendPieceDataElements(
  target: { identifier: string; commonDataElement: DataElement | null },
  name: string,
  sizes: Record<string, number>,
  opacity: number
): void {
  const common = target.commonDataElement!;
  common.appendChild(DataElement.create('name', name, {}, `name_${target.identifier}`));
  for (const [key, value] of Object.entries(sizes)) {
    common.appendChild(DataElement.create(key, value, {}, `${key}_${target.identifier}`));
  }
  common.appendChild(
    DataElement.create(
      'opacity',
      opacity,
      { type: DataElementType.NUMBER_RESOURCE, currentValue: opacity },
      `opacity_${target.identifier}`
    )
  );
}
