import {
  arrowSvg,
  boltSvg,
  bulletSvg,
  cloudSvg,
  crackSvg,
  crescentSvg,
  impactStarSvg,
  magicCircleSvg,
  ringSvg,
  ShapeColors,
  snowflakeSvg,
  speedLinesSvg,
  spikeSvg,
  spiralSvg,
} from '@axe/domain/effect/effect-shapes';

describe('エフェクトの形', () => {
  const colors: ShapeColors = { core: '#ffffff', edge: '#3f9bff' };

  const builders: [string, () => string][] = [
    ['三日月', () => crescentSvg(colors)],
    ['輪', () => ringSvg(colors)],
    ['魔法陣', () => magicCircleSvg(colors)],
    ['結晶', () => snowflakeSvg(colors)],
    ['螺旋', () => spiralSvg(colors)],
    ['地割れ', () => crackSvg(colors, 8, [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8])],
    ['霧', () => cloudSvg(colors)],
    ['氷柱', () => spikeSvg(colors)],
    ['矢', () => arrowSvg(colors)],
    ['銃弾', () => bulletSvg(colors)],
    ['衝撃の星', () => impactStarSvg(colors)],
    ['集中線', () => speedLinesSvg(colors)],
  ];

  it('どの形も viewBox 付きの SVG を返すこと', () => {
    for (const [, build] of builders) {
      const markup = build();
      expect(markup.startsWith('<svg ')).toBe(true);
      expect(markup).toContain('viewBox="0 0 100 100"');
      expect(markup.endsWith('</svg>')).toBe(true);
    }
  });

  it('同じ引数なら同じ文字列を返すこと', () => {
    for (const [, build] of builders) {
      expect(build()).toBe(build());
    }
  });

  it('色を差し込むこと', () => {
    expect(ringSvg(colors)).toContain(colors.edge);
    expect(magicCircleSvg(colors)).toContain(colors.core);
  });

  it('色が違えば defs の id も変えること', () => {
    const other: ShapeColors = { core: '#ffe9a8', edge: '#ff9d3d' };
    const idOf = (markup: string) => markup.match(/id="([^"]+)"/)?.[1];

    for (const build of [crescentSvg, cloudSvg, spikeSvg]) {
      // 同じ id が並ぶと、同時に撃った別プリセットのグラデーションを拾ってしまう。
      expect(idOf(build(colors))).not.toBe(idOf(build(other)));
      expect(idOf(build(colors))).toBe(idOf(build(colors)));
    }
  });

  it('輪は塗りではなく線で描くこと', () => {
    const markup = ringSvg(colors, 4);

    expect(markup).toContain('fill="none"');
    expect(markup).toContain('stroke-width');
  });

  it('破線指定で刻みを入れること', () => {
    expect(ringSvg(colors, 4, true)).toContain('stroke-dasharray');
    expect(ringSvg(colors, 4, false)).not.toContain('stroke-dasharray');
  });

  it('矢は右向きに描くこと', () => {
    const markup = arrowSvg(colors);

    // 鏃が右端 (x=99) に来る。向きは利用側が rotate で決める。
    expect(markup).toContain('99,50');
    expect(markup).toContain('<rect');
  });

  it('銃弾は後方へ尾を引くこと', () => {
    expect(bulletSvg(colors)).toContain('linearGradient');
  });

  it('衝撃の星はギザギザの輪郭を持つこと', () => {
    const markup = impactStarSvg(colors, 12);
    const points = markup.match(/points="([^"]+)"/)?.[1].split(' ') ?? [];

    // 外と内を交互に取るので、頂点は角数の 2 倍になる。
    expect(points).toHaveLength(24);
  });

  it('集中線は指定した本数を引くこと', () => {
    expect(speedLinesSvg(colors, 10).match(/<line /g)).toHaveLength(10);
  });

  it('稲妻は本体と枝を 1 枚のパスにまとめること', () => {
    const jitter = [0.5, 0.2, 0.8, 0.3, 0.7, 0.4, 0.6, 0.5, 0.35, 0.65];
    const markup = boltSvg(80, 400, 30, 6, jitter, [0.4, 0.6, 0.3, 0.7, 0.5, 0.5], colors);

    expect(markup.match(/M[\d.]+ [\d.]+/g)?.length).toBeGreaterThan(1);
    expect(markup.match(/<path/g)).toHaveLength(3);
    expect(markup).toContain('stroke-linejoin="round"');
  });

  it('稲妻の本体は上端から下端まで届くこと', () => {
    const jitter = [0.5, 0.5, 0.5, 0.5, 0.5];
    const markup = boltSvg(60, 300, 20, 5, jitter, [], colors);
    const points = [...markup.matchAll(/[ML]([\d.]+) ([\d.]+)/g)].map((match) => Number(match[2]));

    expect(Math.min(...points)).toBe(0);
    expect(Math.max(...points)).toBe(300);
  });
});
