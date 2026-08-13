import { SKY_AMBIENCE_KINDS } from '@axe/domain/effect/ambience/ambience-kind';
import { skyAmbienceFlash, skyAmbienceLayer, skyAmbienceWash } from '@axe/domain/effect/ambience/ambience-sky';

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

  it('濃霧は上げきっても塗りで潰さないこと', () => {
    const alphasAt = (density: number) =>
      [...skyAmbienceWash('fog', '', density).matchAll(/rgba\([^)]*,\s*([\d.]+)\)/g)].map((match) => Number(match[1]));

    // 濃さは雲の重なりが持つ。塗りで濃くすると、雲が沈んでただの団子になる。
    expect(Math.max(...alphasAt(1))).toBeLessThan(0.6);
    // それでも奥から先に霞む。
    const [far, , near] = alphasAt(1);
    expect(far).toBeGreaterThan(near * 2);
  });

  it('濃霧は濃くするほど雲の数で見せること', () => {
    const cloudsAt = (density: number) => layerOf('fog', 2000, density).particles.length;

    expect(cloudsAt(1)).toBeGreaterThan(cloudsAt(0.6));
    expect(cloudsAt(0.6)).toBeGreaterThan(cloudsAt(0.3));
    // 大小が混ざっていないと、同じ雲が並んだ壁紙に見える。
    const sizes = layerOf('fog', 2000).particles.map((particle) => particle.size);
    expect(Math.max(...sizes) / Math.min(...sizes)).toBeGreaterThan(3);
  });

  it('雷雨は横殴りに降ること', () => {
    const particles = layerOf('storm', 2000).particles;
    const rain = layerOf('rain', 2000).particles;

    // まっすぐ落ちる雨より寝かせる。角度は水平からの傾きで、小さいほど横殴り。
    expect(Math.min(...particles.map((particle) => particle.angle))).toBeLessThan(
      Math.min(...rain.map((particle) => particle.angle))
    );
    expect(particles.length).toBeGreaterThan(rain.length);
    // ちぎれた飛沫が混ざっていないと、ただの強い雨になる。
    const stretches = particles.map((particle) => particle.stretch);
    expect(Math.max(...stretches)).toBeGreaterThan(20);
  });

  it('塗りの向きを盤面の奥行きに合わせられること', () => {
    // 画面の上から下へ一律に塗ると、傾けた盤面では奥行きと噛み合わない。
    expect(skyAmbienceWash('fog', '', 0.6, '160.5deg')).toContain('linear-gradient(160.5deg,');
    expect(skyAmbienceWash('fog', '', 0.6)).toContain('linear-gradient(to bottom,');
  });
});

describe('skyAmbienceFlash()', () => {
  const SPAN_MS = 12_000;

  function peakWithin(density = 0.6): { peak: number; lit: number } {
    let peak = 0;
    let lit = 0;
    for (let time = 0; time < SPAN_MS; time += 10) {
      const power = skyAmbienceFlash('storm', time, density);
      peak = Math.max(peak, power);
      if (power > 0.02) lit += 10;
    }
    return { peak, lit };
  }

  it('雷を伴わない天候は光らないこと', () => {
    for (const time of [0, 1200, 4800, 9000]) {
      expect(skyAmbienceFlash('rain', time, 1)).toBe(0);
      expect(skyAmbienceFlash('fog', time, 1)).toBe(0);
    }
  });

  it('ときどき強く光ること', () => {
    const { peak, lit } = peakWithin(1);
    expect(peak).toBeGreaterThan(0.5);
    // 光りっぱなしだと雷ではなく照明になる。
    expect(lit).toBeLessThan(SPAN_MS * 0.2);
    expect(lit).toBeGreaterThan(0);
  });

  it('濃さを 0 にすれば光らないこと', () => {
    for (let time = 0; time < SPAN_MS; time += 10) expect(skyAmbienceFlash('storm', time, 0)).toBe(0);
  });

  it('同じ時刻なら誰の画面でも同じ強さになること', () => {
    for (const time of [900, 3300, 7700]) {
      expect(skyAmbienceFlash('storm', time, 0.6)).toBe(skyAmbienceFlash('storm', time, 0.6));
    }
  });
});
