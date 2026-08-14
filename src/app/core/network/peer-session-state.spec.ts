import { PeerSessionGrade } from '@axe/core/network/peer-session-state';

describe('PeerSessionState', () => {
  describe('PeerSessionGrade enum', () => {
    it('unspecified is zero', () => {
      expect(PeerSessionGrade.UNSPECIFIED).toBe(0);
    });

    it('low is one', () => {
      expect(PeerSessionGrade.LOW).toBe(1);
    });

    it('middle is two', () => {
      expect(PeerSessionGrade.MIDDLE).toBe(2);
    });

    it('high is three', () => {
      expect(PeerSessionGrade.HIGH).toBe(3);
    });
  });
});
