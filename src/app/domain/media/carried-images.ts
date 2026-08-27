/**
 * An object that holds pictures somewhere the XML cannot be read for them.
 *
 * Saving walks the XML looking for image identifiers, which finds every picture named by an
 * attribute of its own. A drawing kept as one packed string is opaque to that walk: the
 * pictures stuck onto it are named inside the string, so the object has to say so itself or
 * they are left behind and the drawing comes back with holes in it.
 */
export interface CarriesImages {
  readonly carriedImageIdentifiers: readonly string[];
}

export function carriedImagesOf(value: unknown): readonly string[] {
  const carried = (value as CarriesImages | null)?.carriedImageIdentifiers;
  return Array.isArray(carried)
    ? carried.filter((one): one is string => typeof one === 'string' && one.length > 0)
    : [];
}
