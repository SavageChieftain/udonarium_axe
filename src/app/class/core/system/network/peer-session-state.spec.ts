import { PeerSessionGrade } from './peer-session-state';

describe('PeerSessionState', () => {
  describe('PeerSessionGrade enum', () => {
    it('UNSPECIFIEDが0', () => {
      expect(PeerSessionGrade.UNSPECIFIED).toBe(0);
    });

    it('LOWが1', () => {
      expect(PeerSessionGrade.LOW).toBe(1);
    });

    it('MIDDLEが2', () => {
      expect(PeerSessionGrade.MIDDLE).toBe(2);
    });

    it('HIGHが3', () => {
      expect(PeerSessionGrade.HIGH).toBe(3);
    });
  });
});
