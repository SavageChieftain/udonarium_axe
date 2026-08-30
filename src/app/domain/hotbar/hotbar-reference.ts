export interface NamedThing {
  identifier: string;
  name: string;
}

/**
 * What a slot points at, in a room that may not be the one the slot was written in.
 *
 * The identifier is asked for first. A bar carried into another room holds identifiers that
 * mean nothing there, so the name saved beside it is tried next, and only where exactly one
 * thing goes by that name: two of a name is no answer at all.
 */
export function findByReference<T extends NamedThing>(
  things: readonly T[],
  identifier: string,
  name: string
): { thing: T; renamed: boolean } | null {
  const held = identifier.trim();
  const called = name.trim();
  if (!held && !called) return null;

  const found = things.find((thing) => thing.identifier === held);
  if (found) return { thing: found, renamed: false };
  if (!called) return null;

  const byName = things.filter((thing) => thing.name.trim() === called);
  return byName.length === 1 ? { thing: byName[0], renamed: true } : null;
}
