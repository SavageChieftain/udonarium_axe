export const HAND_LOCATION_PREFIX = 'hand:';

export function handLocationOf(userId: string): string {
  return HAND_LOCATION_PREFIX + userId;
}

export function isHandLocation(locationName: string): boolean {
  return locationName.startsWith(HAND_LOCATION_PREFIX) && locationName.length > HAND_LOCATION_PREFIX.length;
}

export function handHolderOf(locationName: string): string | null {
  return isHandLocation(locationName) ? locationName.slice(HAND_LOCATION_PREFIX.length) : null;
}

export function isHandOf(locationName: string, userId: string): boolean {
  // Asked before a room has been joined, nobody holds anything.
  if (!userId) return false;
  return handHolderOf(locationName) === userId;
}
