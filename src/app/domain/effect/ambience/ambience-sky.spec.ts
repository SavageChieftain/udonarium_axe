import { SKY_AMBIENCE_KINDS } from '@axe/domain/effect/ambience/ambience-kind';
import { skyAmbienceLayer, skyAmbienceWash } from '@axe/domain/effect/ambience/ambience-sky';

const WIDTH = 1280;
const HEIGHT = 720;

function layerOf(kind: (typeof SKY_AMBIENCE_KINDS)[number], elapsed: number, density = 0.6) {
  return skyAmbienceLayer({ kind, color: '', density, elapsed, width: WIDTH, height: HEIGHT });
}

describe('skyAmbienceLayer()', () => {
  it('どの天候でも粒を返すこと', () => {
    for (const kind of SKY_AMBIENCE_KINDS) {
      expect(layerOf(kind, 1000).particles.length).toBeGreaterThan(0);
    }
  });

  it('濃さ 0 なら何も出さないこと', () => {
    for (const kind of SKY_AMBIENCE_KINDS) {
      expect(layerOf(kind, 1000, 0).particles).toHaveLength(0);
    }
  });

  it('大きさが 0 の画面では何も出さないこと', () => {
    const layer = skyAmbienceLayer({ kind: 'rain', color: '', density: 1, elapsed: 0, width: 0, height: 0 });
    expect(layer.particles).toHaveLength(0);
  });

  it('同じ時刻なら同じ絵になること', () => {
    expect(layerOf('snow', 2400)).toEqual(layerOf('snow', 2400));
  });

  it('時間が進めば位置が変わること', () => {
    const before = layerOf('rain', 0).particles[0];
    const after = layerOf('rain', 400).particles[0];
    expect(after.y).not.toBe(before.y);
  });

  it('折り返しても画面の外へ出しっぱなしにしないこと', () => {
    // 端で折り返す作りなので、時間を大きく進めても粒が画面から離れていかない。
    for (const elapsed of [0, 10_000, 600_000]) {
      for (const particle of layerOf('snow', elapsed).particles) {
        expect(particle.x).toBeGreaterThanOrEqual(-WIDTH);
        expect(particle.x).toBeLessThanOrEqual(WIDTH * 2);
        expect(particle.y).toBeGreaterThanOrEqual(-HEIGHT);
        expect(particle.y).toBeLessThanOrEqual(HEIGHT * 2);
      }
    }
  });

  it('透明度が 0〜1 に収まること', () => {
    for (const kind of SKY_AMBIENCE_KINDS) {
      for (const particle of layerOf(kind, 3300, 1).particles) {
        expect(particle.alpha).toBeGreaterThanOrEqual(0);
        expect(particle.alpha).toBeLessThanOrEqual(1);
      }
    }
  });

  it('雨は縦に伸びた筋で描くこと', () => {
    const [particle] = layerOf('rain', 500).particles;
    expect(particle.shape).toBe('streak');
    expect(particle.stretch).toBeGreaterThan(1);
  });
});

describe('画面に掛けたときの見え方', () => {
  it('粒で見せる天候は画面を埋めるだけの数が出ること', () => {
    // 霧と瘴気は大きな塊と塗りで見せるので、数では測らない。
    for (const kind of SKY_AMBIENCE_KINDS.filter((candidate) => candidate !== 'fog' && candidate !== 'miasma')) {
      expect(layerOf(kind, 2000).particles.length).toBeGreaterThanOrEqual(60);
    }
  });

  it('塗りで見せる天候は空気の色が読める濃さであること', () => {
    for (const kind of ['fog', 'miasma', 'ash', 'sand'] as const) {
      const alphas = [...skyAmbienceWash(kind, '', 0.6).matchAll(/rgba\([^)]*,\s*([\d.]+)\)/g)].map((match) =>
        Number(match[1])
      );
      expect(Math.max(...alphas)).toBeGreaterThanOrEqual(0.15);
    }
  });
});

describe('skyAmbienceWash()', () => {
  it('濃さ 0 なら塗らないこと', () => {
    expect(skyAmbienceWash('fog', '', 0)).toBe('');
  });

  it('霧は指定色で塗ること', () => {
    expect(skyAmbienceWash('fog', '#102030', 1)).toContain('rgba(16, 32, 48');
  });

  it('光の粒は空気の色を変えないこと', () => {
    expect(skyAmbienceWash('bloom', '', 1)).toBe('');
  });

  it('濃霧は上げきると前が見えなくなること', () => {
    const alphasAt = (density: number) =>
      [...skyAmbienceWash('fog', '', density).matchAll(/rgba\([^)]*,\s*([\d.]+)\)/g)].map((match) => Number(match[1]));

    // 上げきったら一面が潰れる。濃淡が残っていると、薄いところから向こうが見えてしまう。
    expect(Math.min(...alphasAt(1))).toBeGreaterThanOrEqual(0.9);
    // 途中まではこれまでどおり、向こうが透けて見える。
    expect(Math.max(...alphasAt(0.6))).toBeLessThan(0.6);
    expect(Math.max(...alphasAt(0.3))).toBeLessThan(0.3);
  });
});
