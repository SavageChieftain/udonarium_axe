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
    let stats: RTCStatsReport = null!;
    try {
      stats = await this.peerConnection.getStats();
    } catch (error) {
      Logger.warn('[WebRTC] 統計情報の取得に失敗', error);
    }

    if (stats == null) {
      this.candidateType = CandidateType.UNKNOWN;
      return;
    }

    const candidatePairs: RtcCandidatePairStat[] = [];
    const localCandidates: RtcCandidateStat[] = [];
    const remoteCandidates: RtcCandidateStat[] = [];

    const succeededLocalCandidateIds: string[] = [];
    const succeededRemoteCandidateIds: string[] = [];
    const usedLocalCandidates: RtcCandidateStat[] = [];
    const usedRemoteCandidates: RtcCandidateStat[] = [];

    stats.forEach((stat) => {
      if (stat.type.includes('candidate-pair')) {
        candidatePairs.push(stat as RtcCandidatePairStat);
      }
      if (stat.type.includes('local-candidate')) {
        localCandidates.push(stat as RtcCandidateStat);
      }
      if (stat.type.includes('remote-candidate')) {
        remoteCandidates.push(stat as RtcCandidateStat);
      }
    });

    candidatePairs.forEach((candidatePair) => {
      if (candidatePair.state === 'succeeded') {
        succeededLocalCandidateIds.push(candidatePair.localCandidateId);
        succeededRemoteCandidateIds.push(candidatePair.remoteCandidateId);
      }
    });

    localCandidates.forEach((candidate) => {
      if (succeededLocalCandidateIds.includes(candidate.id)) {
        usedLocalCandidates.push(candidate);
      }
    });

    remoteCandidates.forEach((candidate) => {
      if (succeededRemoteCandidateIds.includes(candidate.id)) {
        usedRemoteCandidates.push(candidate);
      }
    });

    let candidateType = CandidateType.UNKNOWN;
    const types: CandidateType[] = Object.values(CandidateType);
    [...usedLocalCandidates, ...usedRemoteCandidates].forEach((candidate) => {
      const index = types.indexOf(candidate.candidateType);
      if (types.indexOf(candidateType) < index) candidateType = types[index];
    });
    this.candidateType = candidateType;
  }
}
