import { PeerSessionGrade, PeerSessionState } from '@axe/core/network/peer-session-state';
import {
  isMeasured,
  isRelayedLink,
  linkQualityColorClass,
  linkQualityIcon,
  linkQualityLabelKey,
  linkQualityOf,
  PeerLinkQuality,
  worstLinkQuality,
} from '@axe/domain/peer/peer-link-quality';

function session(overrides: Partial<PeerSessionState> = {}): PeerSessionState {
  return {
    grade: PeerSessionGrade.HIGH,
    ping: 30,
    health: 1,
    speed: 1,
    description: 'host',
    ...overrides,
  };
}

describe('linkQualityOf', () => {
  it('閉じたリンクは Lost', () => {
    expect(linkQualityOf(session(), false)).toBe(PeerLinkQuality.Lost);
  });

  it('未計測は Unknown', () => {
    const unmeasured = session({ grade: PeerSessionGrade.UNSPECIFIED, ping: 0, health: 0, speed: 0 });
    expect(linkQualityOf(unmeasured, true)).toBe(PeerLinkQuality.Unknown);
  });

  it('健全で低遅延なら Good', () => {
    expect(linkQualityOf(session(), true)).toBe(PeerLinkQuality.Good);
  });

  it('無通信が始まると Fair', () => {
    expect(linkQualityOf(session({ health: 0.9 }), true)).toBe(PeerLinkQuality.Fair);
  });

  it('遅延が 200ms 以上なら Fair', () => {
    expect(linkQualityOf(session({ ping: 200 }), true)).toBe(PeerLinkQuality.Fair);
    expect(linkQualityOf(session({ ping: 199 }), true)).toBe(PeerLinkQuality.Good);
  });

  it('health が 0.5 以下なら Poor', () => {
    expect(linkQualityOf(session({ health: 0.5 }), true)).toBe(PeerLinkQuality.Poor);
  });

  it('遅延が 500ms 以上なら Poor', () => {
    expect(linkQualityOf(session({ ping: 500 }), true)).toBe(PeerLinkQuality.Poor);
    expect(linkQualityOf(session({ ping: 499 }), true)).toBe(PeerLinkQuality.Fair);
  });

  it('TURN 経由でも遅延が小さければ品質自体は Good', () => {
    expect(linkQualityOf(session({ grade: PeerSessionGrade.LOW }), true)).toBe(PeerLinkQuality.Good);
  });
});

describe('worstLinkQuality', () => {
  it('空なら Unknown', () => {
    expect(worstLinkQuality([])).toBe(PeerLinkQuality.Unknown);
  });

  it('最も悪いものを返す', () => {
    expect(worstLinkQuality([PeerLinkQuality.Good, PeerLinkQuality.Poor, PeerLinkQuality.Fair])).toBe(
      PeerLinkQuality.Poor
    );
  });

  it('Lost が最優先', () => {
    expect(worstLinkQuality([PeerLinkQuality.Poor, PeerLinkQuality.Lost])).toBe(PeerLinkQuality.Lost);
  });

  it('Unknown は実際の問題を覆い隠さない', () => {
    expect(worstLinkQuality([PeerLinkQuality.Unknown, PeerLinkQuality.Good])).toBe(PeerLinkQuality.Good);
    expect(worstLinkQuality([PeerLinkQuality.Unknown, PeerLinkQuality.Fair])).toBe(PeerLinkQuality.Fair);
  });

  it('すべて Unknown なら Unknown', () => {
    expect(worstLinkQuality([PeerLinkQuality.Unknown, PeerLinkQuality.Unknown])).toBe(PeerLinkQuality.Unknown);
  });
});

describe('isMeasured', () => {
  it('初期値のセッションは未計測', () => {
    expect(isMeasured(session({ grade: PeerSessionGrade.UNSPECIFIED, ping: 0, health: 0, speed: 0 }))).toBe(false);
  });

  it('grade だけでも付いていれば計測済み', () => {
    expect(isMeasured(session({ grade: PeerSessionGrade.MIDDLE, ping: 0, health: 0 }))).toBe(true);
  });

  it('ping だけでも付いていれば計測済み', () => {
    expect(isMeasured(session({ grade: PeerSessionGrade.UNSPECIFIED, ping: 12, health: 0 }))).toBe(true);
  });
});

describe('isRelayedLink', () => {
  it('grade LOW は TURN リレー', () => {
    expect(isRelayedLink(session({ grade: PeerSessionGrade.LOW }))).toBe(true);
  });

  it('それ以外は直結扱い', () => {
    expect(isRelayedLink(session({ grade: PeerSessionGrade.HIGH }))).toBe(false);
    expect(isRelayedLink(session({ grade: PeerSessionGrade.UNSPECIFIED }))).toBe(false);
  });
});

describe('表示用の写像', () => {
  it('すべての品質にラベルキーが対応する', () => {
    for (const quality of Object.values(PeerLinkQuality)) {
      expect(linkQualityLabelKey(quality)).toBe(`feature.lobby.linkQuality.${quality}`);
    }
  });

  it('すべての品質にアイコンと色が対応する', () => {
    for (const quality of Object.values(PeerLinkQuality)) {
      expect(linkQualityIcon(quality)).toBeTruthy();
      expect(linkQualityColorClass(quality)).toBeTruthy();
    }
  });

  it('品質ごとに色が異なる', () => {
    const classes = Object.values(PeerLinkQuality).map(linkQualityColorClass);
    expect(new Set(classes).size).toBe(classes.length);
  });
});
