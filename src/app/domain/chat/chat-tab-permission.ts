import { PeerRole } from '@axe/domain/peer/peer-role';

export interface ChatTabPermission {
  plCanView: boolean;
  plCanSpeak: boolean;
  guestCanView: boolean;
  guestCanSpeak: boolean;
  isSystemTab?: boolean;
}

export function canRoleViewTab(tab: ChatTabPermission, role: PeerRole): boolean {
  if (role === PeerRole.GameMaster) return true;
  return role === PeerRole.Guest ? tab.guestCanView : tab.plCanView;
}

export function canRoleSpeakTab(tab: ChatTabPermission, role: PeerRole): boolean {
  // It is a noticeboard, which nobody writes on, the game master included.
  if (tab.isSystemTab) return false;
  if (role === PeerRole.GameMaster) return true;
  return role === PeerRole.Guest ? tab.guestCanSpeak : tab.plCanSpeak;
}
