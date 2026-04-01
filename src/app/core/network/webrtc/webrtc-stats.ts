import { Logger } from '@axe/core/logging/logger';

export enum CandidateType {
  UNKNOWN = 'unknown',
  RELAY = 'relay',
  PRFLX = 'prflx',
  SRFLX = 'srflx',
  HOST = 'host',
}

interface RtcCandidatePairStat extends RTCStats {
  state: string;
  localCandidateId: string;
  remoteCandidateId: string;
}

interface RtcCandidateStat extends RTCStats {
  candidateType: CandidateType;
}

export class WebRTCStats {
  candidateType: CandidateType = CandidateType.UNKNOWN;

  constructor(private peerConnection: RTCPeerConnection) {}

  async updateAsync() {
    const stats = await this.peerConnection.getStats().catch((error) => {
      Logger.warn('[WebRTC] 統計情報の取得に失敗', error);
      return null;
    });

    if (stats == null) {
      this.candidateType = CandidateType.UNKNOWN;
      return;
    }

    const candidatePairs: RtcCandidatePairStat[] = [];
    const localCandidates: RtcCandidateStat[] = [];
    const remoteCandidates: RtcCandidateStat[] = [];

    stats.forEach((stat) => {
      if (stat.type.includes('candidate-pair')) {
        candidatePairs.push(stat as RtcCandidatePairStat);
      } else if (stat.type.includes('local-candidate')) {
        localCandidates.push(stat as RtcCandidateStat);
      } else if (stat.type.includes('remote-candidate')) {
        remoteCandidates.push(stat as RtcCandidateStat);
      }
    });

    const succeededLocalIds = new Set<string>();
    const succeededRemoteIds = new Set<string>();
    for (const pair of candidatePairs) {
      if (pair.state === 'succeeded') {
        succeededLocalIds.add(pair.localCandidateId);
        succeededRemoteIds.add(pair.remoteCandidateId);
      }
    }

    const usedCandidates: RtcCandidateStat[] = [
      ...localCandidates.filter((c) => succeededLocalIds.has(c.id)),
      ...remoteCandidates.filter((c) => succeededRemoteIds.has(c.id)),
    ];

    const types: CandidateType[] = Object.values(CandidateType);
    let candidateType = CandidateType.UNKNOWN;
    for (const candidate of usedCandidates) {
      const index = types.indexOf(candidate.candidateType);
      if (types.indexOf(candidateType) < index) candidateType = types[index];
    }
    this.candidateType = candidateType;
  }
}
