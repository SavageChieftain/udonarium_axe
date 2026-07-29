import { SyncObject, SyncVar } from '@axe/core/sync/decorator';
import { GameObject } from '@axe/core/sync/game-object';

export const PARTY_COLORS = ['#7dd3fc', '#fca5a5', '#bef264', '#fcd34d', '#c4b5fd', '#f9a8d4'] as const;

@SyncObject('party')
export class Party extends GameObject {
  @SyncVar() name: string = '';
  @SyncVar() color: string = PARTY_COLORS[0];
}

export function nextPartyColor(usedColors: readonly string[]): string {
  const free = PARTY_COLORS.find((color) => !usedColors.includes(color));
  return free ?? PARTY_COLORS[usedColors.length % PARTY_COLORS.length];
}
