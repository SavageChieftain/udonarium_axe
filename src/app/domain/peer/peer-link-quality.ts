import { PeerSessionGrade, PeerSessionState } from '@axe/core/network/peer-session-state';

export enum PeerLinkQuality {
  Unknown = 'unknown',
  Good = 'good',
  Fair = 'fair',
  Poor = 'poor',
  Lost = 'lost',
}

export const FAIR_PING_MS = 200;
export const POOR_PING_MS = 500;
export const FAIR_HEALTH = 1;
export const POOR_HEALTH = 0.5;

const SEVERITY: Record<PeerLinkQuality, number> = {
  [PeerLinkQuality.Unknown]: 0,
  [PeerLinkQuality.Good]: 1,
  [PeerLinkQuality.Fair]: 2,
  [PeerLinkQuality.Poor]: 3,
  [PeerLinkQuality.Lost]: 4,
};

export function isMeasured(session: PeerSessionState): boolean {
  return session.grade !== PeerSessionGrade.UNSPECIFIED || session.ping > 0 || session.health > 0;
}

export function linkQualityOf(session: PeerSessionState, isOpen: boolean): PeerLinkQuality {
  if (!isOpen) return PeerLinkQuality.Lost;
  if (!isMeasured(session)) return PeerLinkQuality.Unknown;
  if (session.health <= POOR_HEALTH || POOR_PING_MS <= session.ping) return PeerLinkQuality.Poor;
  if (session.health < FAIR_HEALTH || FAIR_PING_MS <= session.ping) return PeerLinkQuality.Fair;
  return PeerLinkQuality.Good;
}

export function worstLinkQuality(qualities: Iterable<PeerLinkQuality>): PeerLinkQuality {
  let worst = PeerLinkQuality.Unknown;
  for (const quality of qualities) {
    if (SEVERITY[worst] < SEVERITY[quality]) worst = quality;
  }
  return worst;
}

export function isRelayedLink(session: PeerSessionState): boolean {
  return session.grade === PeerSessionGrade.LOW;
}

export function linkQualityLabelKey(quality: PeerLinkQuality): string {
  return `feature.lobby.linkQuality.${quality}`;
}

export function linkQualityIcon(quality: PeerLinkQuality): string {
  switch (quality) {
    case PeerLinkQuality.Good:
      return 'signal_cellular_alt';
    case PeerLinkQuality.Fair:
      return 'network_check';
    case PeerLinkQuality.Poor:
      return 'signal_cellular_connected_no_internet_4_bar';
    case PeerLinkQuality.Lost:
      return 'signal_cellular_off';
    default:
      return 'signal_cellular_null';
  }
}

export function linkQualityColorClass(quality: PeerLinkQuality): string {
  switch (quality) {
    case PeerLinkQuality.Good:
      return 'text-emerald-500';
    case PeerLinkQuality.Fair:
      return 'text-amber-500';
    case PeerLinkQuality.Poor:
      return 'text-orange-600';
    case PeerLinkQuality.Lost:
      return 'text-red-600';
    default:
      return 'text-ui-dim';
  }
}
