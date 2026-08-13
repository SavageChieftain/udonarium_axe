import {
  groundSurfaceLayer,
  groundSurfaceWash,
  groundVaporLayer,
  vaporCellsOf,
  vaporSliceCount,
} from '@axe/domain/effect/ambience/ambience-ground';
import { type AmbienceKind, ambiencePalette, GROUND_AMBIENCE_KINDS } from '@axe/domain/effect/ambience/ambience-kind';

const UNIT = 50;
const WIDTH = UNIT * 6;
const HEIGHT = UNIT * 6;
const VAPOR_HEIGHT = UNIT * 2.6;

function specOf(kind: AmbienceKind, elapsed: number, density = 0.6, height = HEIGHT) {
  return { kind, color: '', density, elapsed, width: WIDTH, height, unit: UNIT };
}

describe('groundSurfaceLayer()', () => {
  it('水面を持つ種類は粒を返すこと', () => {
    for (const kind of GROUND_AMBIENCE_KINDS.filter((candidate) => candidate !== 'fog')) {
      expect(groundSurfaceLayer(specOf(kind, 1200)).particles.length).toBeGreaterThan(0);
    }
  });

  it('霧だまりは面に何も置かず、立ち上るぶんだけで見せること', () => {
    expect(groundSurfaceLayer(specOf('fog', 1200)).particles).toHaveLength(0);
    expect(groundVaporLayer(specOf('fog', 1200, 0.6, VAPOR_HEIGHT)).particles.length).toBeGreaterThan(0);
  });

  it('濃さ 0 なら何も出さないこと', () => {
    for (const kind of GROUND_AMBIENCE_KINDS) {
      expect(groundSurfaceLayer(specOf(kind, 1200, 0)).particles).toHaveLength(0);
    }
  });

  it('粒が範囲の中に収まること', () => {
    for (const kind of GROUND_AMBIENCE_KINDS) {
      for (const particle of groundSurfaceLayer(specOf(kind, 4400, 1)).particles) {
        expect(particle.x).toBeGreaterThanOrEqual(0);
        expect(particle.x).toBeLessThanOrEqual(WIDTH);
        expect(particle.y).toBeGreaterThanOrEqual(0);
        expect(particle.y).toBeLessThanOrEqual(HEIGHT);
      }
    }
  });

  it('粒の大きさは範囲の広さではなくマスで決まること', () => {
    const narrow = groundSurfaceLayer({ ...specOf('lava', 900), width: UNIT * 4, height: UNIT * 4 });
    const wide = groundSurfaceLayer({ ...specOf('lava', 900), width: UNIT * 16, height: UNIT * 16 });
    expect(wide.particles[0].size).toBe(narrow.particles[0].size);
  });

  it('位相をずらすと同じ時刻でも絵が変わること', () => {
    const plain = groundSurfaceLayer(specOf('swamp', 1000));
    const shifted = groundSurfaceLayer({ ...specOf('swamp', 1000), phase: 777 });
    expect(shifted.particles).not.toEqual(plain.particles);
  });
});

describe('groundVaporLayer()', () => {
  it('どの種類も立ち上る粒を返すこと', () => {
    for (const kind of GROUND_AMBIENCE_KINDS) {
      expect(groundVaporLayer(specOf(kind, 1500, 0.6, VAPOR_HEIGHT)).particles.length).toBeGreaterThan(0);
    }
  });

  it('原点を範囲の下辺の中央に置き、canvas は余白ぶん外へ広げること', () => {
    const layer = groundVaporLayer(specOf('vent', 0, 0.6, VAPOR_HEIGHT));
    // 原点は範囲の下辺の中央。canvas はその周りへ余白ぶん広がる。
    expect(layer.originX).toBeGreaterThan(WIDTH / 2);
    expect(layer.originY).toBeGreaterThan(VAPOR_HEIGHT);
    expect(layer.width - layer.originX).toBeCloseTo(layer.originX);
    expect(layer.height).toBeGreaterThan(layer.originY);
  });

  it('原点より上へしか出さないこと', () => {
    for (const kind of GROUND_AMBIENCE_KINDS) {
      for (const particle of groundVaporLayer(specOf(kind, 2600, 1, VAPOR_HEIGHT)).particles) {
        expect(particle.y).toBeLessThanOrEqual(0);
        expect(particle.y).toBeGreaterThanOrEqual(-VAPOR_HEIGHT);
      }
    }
  });

  it('透明度が 0〜1 に収まること', () => {
    for (const kind of GROUND_AMBIENCE_KINDS) {
      for (const particle of groundVaporLayer(specOf(kind, 3100, 1, VAPOR_HEIGHT)).particles) {
        expect(particle.alpha).toBeGreaterThanOrEqual(0);
        expect(particle.alpha).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe('groundSurfaceWash()', () => {
  it('粒を出さない濃さでも面の塗りは残すこと', () => {
    for (const kind of GROUND_AMBIENCE_KINDS) {
      expect(groundSurfaceWash(kind, '', 0).length).toBeGreaterThan(0);
    }
  });

  it('指定色を塗りへ反映すること', () => {
    expect(groundSurfaceWash('swamp', '#102030', 1)).toContain('rgba(16, 32, 48');
  });
});

describe('置いた直後の見え方', () => {
  const DEFAULT_CELLS = 4;
  const width = UNIT * DEFAULT_CELLS;

  function placedSpec(kind: AmbienceKind, height: number) {
    return { kind, color: '', density: 0.6, elapsed: 2000, width, height, unit: UNIT };
  }

  it('既定の広さでも数えられるだけの粒が出ること', () => {
    // 粒の数を面積(px²)から決めると、この広さ（0.04 メガピクセル）では
    // 種類によって数個しか出ず、置いても何も無いように見える。
    for (const kind of GROUND_AMBIENCE_KINDS) {
      const surface = groundSurfaceLayer(placedSpec(kind, width));
      const vapor = groundVaporLayer(placedSpec(kind, UNIT * 2.6));
      expect(surface.particles.length + vapor.particles.length).toBeGreaterThanOrEqual(14);
    }
  });

  it('canvas の枠まで絵を届かせないこと', () => {
    // 粒は canvas の形に切り取られる。粒の直径が範囲と同じくらい大きいと、中心が
    // 真ん中にあっても裾が枠で切られ、盤面に灰色の四角が浮く。透明度を落とすだけでは
    // 防げないので、一番大きな粒が収まるまで canvas を外へ広げてある。
    let checked = 0;
    for (const kind of GROUND_AMBIENCE_KINDS) {
      for (const elapsed of [0, 700, 1600, 2900, 5200]) {
        const layers = [
          groundSurfaceLayer({ ...placedSpec(kind, width), elapsed }),
          groundVaporLayer({ ...placedSpec(kind, UNIT * 2.6), elapsed }),
        ];
        for (const layer of layers) {
          for (const particle of layer.particles) {
            if (particle.alpha < 0.02) continue;
            checked += 1;
            // 縦に伸ばした粒（炎の舌）は size より背が高い。
            const halfWidth = particle.size / 2;
            const halfHeight = (particle.size * particle.stretch) / 2;
            const centerX = layer.originX + particle.x;
            const centerY = layer.originY + particle.y;
            expect(halfWidth).toBeLessThanOrEqual(Math.min(centerX, layer.width - centerX));
            expect(halfHeight).toBeLessThanOrEqual(Math.min(centerY, layer.height - centerY));
          }
        }
      }
    }
    expect(checked).toBeGreaterThan(0);
  });

  it('立ち上りを奥行き方向へ分けても、合計の粒数は増やさないこと', () => {
    // 板を増やすぶんだけ濃くなると、広い範囲ほど描画が重くなって色も潰れる。
    const wide = { ...placedSpec('vent', UNIT * 3), width: UNIT * 16 };
    const single = groundVaporLayer(wide).particles.length;
    const sliced = [0, 1, 2, 3, 4].reduce(
      (total, index) => total + groundVaporLayer({ ...wide, sliceIndex: index, sliceCount: 5 }).particles.length,
      0
    );
    expect(sliced).toBeLessThanOrEqual(single + 5);
  });

  it('範囲を広げても炎の密度が落ちないこと', () => {
    // 粒の総数で頭打ちにすると、広げるほど 1 枚が薄まり、離れた炎がいくつか浮くだけになる。
    const densityOf = (cells: number) => {
      const areaWidth = UNIT * cells;
      const slices = vaporSliceCount(areaWidth, UNIT);
      let covered = 0;
      for (let index = 0; index < slices; index++) {
        const layer = groundVaporLayer({
          ...placedSpec('blaze', UNIT * vaporCellsOf('blaze')),
          width: areaWidth,
          sliceIndex: index,
          sliceCount: slices,
        });
        for (const particle of layer.particles) {
          if (particle.shape !== 'glow') continue;
          covered += particle.size * particle.size * particle.stretch * particle.alpha;
        }
      }
      return covered / areaWidth;
    };

    expect(densityOf(16)).toBeGreaterThan(densityOf(4) * 0.7);
  });

  it('奥行きが深いほど板を増やし、際限なくは増やさないこと', () => {
    expect(vaporSliceCount(UNIT * 2, UNIT)).toBe(1);
    expect(vaporSliceCount(UNIT * 8, UNIT)).toBeGreaterThan(1);
    expect(vaporSliceCount(UNIT * 16, UNIT)).toBeGreaterThan(vaporSliceCount(UNIT * 8, UNIT));
    expect(vaporSliceCount(UNIT * 100, UNIT)).toBeLessThanOrEqual(5);
  });

  it('板ごとに違う絵を出すこと', () => {
    const wide = { ...placedSpec('vent', UNIT * 3), width: UNIT * 16, sliceCount: 4 };
    const first = groundVaporLayer({ ...wide, sliceIndex: 0 }).particles;
    const second = groundVaporLayer({ ...wide, sliceIndex: 1 }).particles;
    expect(second).not.toEqual(first);
  });

  describe('地面の炎上', () => {
    const height = UNIT * vaporCellsOf('blaze');

    function flames() {
      return groundVaporLayer(placedSpec('blaze', height)).particles.filter(
        (particle) => particle.shape === 'glow' && particle.alpha >= 0.08
      );
    }

    it('炎が床から立ち上ること', () => {
      // 出た瞬間を一番速くすると、濃さが乗る頃には床から離れ、宙に浮いた炎になる。
      // 燃えているのは地面なので、明るさの大半は床に接していないといけない。
      const lit = flames();
      const onFloor = lit.filter((flame) => -flame.y - (flame.size * flame.stretch) / 2 < UNIT * 0.2);
      const litWeight = lit.reduce((sum, flame) => sum + flame.alpha, 0);
      const floorWeight = onFloor.reduce((sum, flame) => sum + flame.alpha, 0);

      expect(floorWeight / litWeight).toBeGreaterThan(0.5);
    });

    it('床の火から炎の舌が伸びること', () => {
      const tongues = flames().filter((flame) => flame.stretch > 1.5);
      expect(tongues.length).toBeGreaterThan(5);

      // 大小が揃っていると、大炎上ではなく焚き火にしか見えない。
      const heights = tongues.map((tongue) => tongue.size * tongue.stretch);
      expect(Math.max(...heights) / Math.min(...heights)).toBeGreaterThan(4);
    });

    it('数マスぶんの高さまで届くこと', () => {
      const top = Math.max(...flames().map((flame) => -flame.y + (flame.size * flame.stretch) / 2));
      expect(top).toBeGreaterThan(UNIT * 3);
    });

    it('根元は白熱し、上には黒煙が乗ること', () => {
      const layer = groundVaporLayer(placedSpec('blaze', height));
      expect(layer.particles.some((particle) => particle.color === '#ffffff')).toBe(true);
      expect(layer.particles.some((particle) => particle.shape === 'smoke')).toBe(true);

      // 先端まで暗く落とすと、加算合成では何も足さない粒ばかりになって炎が痩せる。
      const dark = layer.particles.filter((particle) => particle.shape === 'glow' && particle.color !== '#ffffff');
      expect(dark.every((particle) => particle.color !== ambiencePalette('blaze').secondary)).toBe(true);
    });
  });

  it('範囲の縁へ向けて粒を薄くすること', () => {
    let checked = 0;
    for (const kind of GROUND_AMBIENCE_KINDS) {
      for (const elapsed of [0, 900, 2000, 3700]) {
        const layer = groundSurfaceLayer({ ...placedSpec(kind, width), elapsed });
        if (layer.particles.length < 1) continue;
        const peak = Math.max(...layer.particles.map((particle) => particle.alpha));
        for (const particle of layer.particles) {
          const toEdge = Math.min(particle.x, width - particle.x, particle.y, width - particle.y);
          if (toEdge > 4) continue;
          checked += 1;
          expect(particle.alpha).toBeLessThan(peak * 0.35);
        }
      }
    }
    expect(checked).toBeGreaterThan(0);
  });

  it('塗りが箱の縁で必ず透明になること', () => {
    // 既定サイズのグラデーションは箱からはみ出し、はみ出した側が直線で切られる。
    for (const kind of GROUND_AMBIENCE_KINDS) {
      const wash = groundSurfaceWash(kind, '', 0.6);
      const layers = wash.split('radial-gradient').filter((part) => part.trim().length > 0);
      expect(layers.length).toBeGreaterThan(0);
      for (const layer of layers) {
        expect(layer).toContain('closest-side');
        expect(layer).toContain('transparent 100%');
      }
    }
  });

  it('面の塗りが下地として読める濃さであること', () => {
    for (const kind of GROUND_AMBIENCE_KINDS) {
      const alphas = [...groundSurfaceWash(kind, '', 0.6).matchAll(/rgba\([^)]*,\s*([\d.]+)\)/g)].map((match) =>
        Number(match[1])
      );
      expect(Math.max(...alphas)).toBeGreaterThanOrEqual(0.35);
    }
  });
});
