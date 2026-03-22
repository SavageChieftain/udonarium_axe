import { CandidateType } from './webrtc-stats';

describe('webrtc/WebRTCStats', () => {
  describe('CandidateType enum', () => {
    it('UNKNOWN', () => {
      expect(CandidateType.UNKNOWN).toBe('unknown');
    });

    it('RELAY', () => {
      expect(CandidateType.RELAY).toBe('relay');
    });

    it('PRFLX', () => {
      expect(CandidateType.PRFLX).toBe('prflx');
    });

    it('SRFLX', () => {
      expect(CandidateType.SRFLX).toBe('srflx');
    });

    it('HOST', () => {
      expect(CandidateType.HOST).toBe('host');
    });
  });
});
