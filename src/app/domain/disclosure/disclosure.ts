export const DisclosureMode = {
  GameMaster: 'gm',
  Selected: 'selected',
  All: 'all',
} as const;

export type DisclosureMode = (typeof DisclosureMode)[keyof typeof DisclosureMode];

export const DEFAULT_DISCLOSURE_MODE: DisclosureMode = DisclosureMode.All;

export interface Disclosable {
  disclosureMode: string;
  disclosureUserIds: string[];
}

export function isDisclosureMode(value: unknown): value is DisclosureMode {
  return value === DisclosureMode.GameMaster || value === DisclosureMode.Selected || value === DisclosureMode.All;
}

export function normalizeDisclosureMode(value: unknown): DisclosureMode {
  return isDisclosureMode(value) ? value : DEFAULT_DISCLOSURE_MODE;
}

export interface DisclosureViewer {
  userId: string;
  isGameMaster: boolean;
  ownerUserId?: string;
}

export function canViewDisclosable(object: Disclosable, viewer: DisclosureViewer): boolean {
  if (viewer.isGameMaster) return true;
  if (viewer.ownerUserId && viewer.ownerUserId.length > 0 && viewer.ownerUserId === viewer.userId) return true;
  const mode = normalizeDisclosureMode(object.disclosureMode);
  if (mode === DisclosureMode.All) return true;
  if (mode === DisclosureMode.GameMaster) return false;
  return object.disclosureUserIds.includes(viewer.userId);
}

export function canEditDisclosure(viewer: DisclosureViewer): boolean {
  if (viewer.isGameMaster) return true;
  return !!viewer.ownerUserId && viewer.ownerUserId.length > 0 && viewer.ownerUserId === viewer.userId;
}

export function toggleDisclosureUserId(userIds: readonly string[], userId: string): string[] {
  return userIds.includes(userId) ? userIds.filter((id) => id !== userId) : [...userIds, userId];
}
