import { isPeerRole, PeerRole } from '@axe/domain/peer/peer-role';

const INVITE_HASH_PREFIX = '#join?';

export interface InviteLinkParams {
  roomId: string;
  roomName: string;
  password: string;
  role: PeerRole | null;
}

export function buildInviteLink(baseUrl: string, params: InviteLinkParams): string {
  const query = new URLSearchParams();
  query.set('r', params.roomId);
  query.set('n', params.roomName);
  if (params.password.length > 0) query.set('p', params.password);
  if (params.role) query.set('role', params.role);

  return `${baseUrl}${INVITE_HASH_PREFIX}${query.toString()}`;
}

export function parseInviteLink(hash: string): InviteLinkParams | null {
  if (!hash.startsWith(INVITE_HASH_PREFIX)) return null;

  const query = new URLSearchParams(hash.slice(INVITE_HASH_PREFIX.length));
  const roomId = query.get('r') ?? '';
  const roomName = query.get('n') ?? '';
  if (roomId.length < 1 || roomName.length < 1) return null;

  const role = query.get('role');
  return {
    roomId,
    roomName,
    password: query.get('p') ?? '',
    role: isPeerRole(role) ? role : null,
  };
}
