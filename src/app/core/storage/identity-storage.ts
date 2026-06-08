const STORAGE_KEY = 'udonarium-axe.identity';

export interface PersistedIdentity {
  userId: string;
  roomId: string;
  roomName: string;
  role: string;
  reConnectPass: string;
}

export function saveIdentity(identity: PersistedIdentity): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(identity));
  } catch {
    /* sessionStorage unavailable (private mode, SSR etc) — identity continuity is best-effort */
  }
}

export function loadIdentity(): PersistedIdentity | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PersistedIdentity> | null;
    if (!parsed || typeof parsed.userId !== 'string' || parsed.userId.length < 1) return null;
    return {
      userId: parsed.userId,
      roomId: typeof parsed.roomId === 'string' ? parsed.roomId : '',
      roomName: typeof parsed.roomName === 'string' ? parsed.roomName : '',
      role: typeof parsed.role === 'string' ? parsed.role : '',
      reConnectPass: typeof parsed.reConnectPass === 'string' ? parsed.reConnectPass : '',
    };
  } catch {
    /* corrupt or unavailable storage — fall back to a fresh identity */
    return null;
  }
}

export function clearIdentity(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* sessionStorage unavailable — nothing to clear */
  }
}
