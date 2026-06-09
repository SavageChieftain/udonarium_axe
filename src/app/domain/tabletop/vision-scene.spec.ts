import { Segment } from '@axe/domain/tabletop/los/segments';
import {
  computeLightBeam,
  computeLightGlow,
  computeOverlayPlan,
  computeWallLights,
  computeWallSilhouettes,
  floorRadii,
  isLit,
  isPointVisible,
  lightAxis,
  lightLevelAt,
  lightReaches,
  objectBrightnessFor,
  objectLightLevel,
  type SceneLight,
  type SceneViewer,
  type SceneVisionSource,
  type ShadowCaster,
  type VisionScene,
  type WallFace,
  withinCone,
} from '@axe/domain/tabletop/vision-scene';
import { VisionType } from '@axe/domain/tabletop/vision-types';

const WALL_AT_X100: Segment = { x1: 100, y1: -200, x2: 100, y2: 200 };

function light(partial: Partial<SceneLight> = {}): SceneLight {
  return {
    x: 0,
    y: 0,
    z: 0,
    brightPx: 100,
    dimPx: 200,
    color: '#ffffff',
    angle: 360,
    direction: 0,
    pitch: 0,
    revealToAll: false,
    castShadows: true,
    ignoreOcclusion: false,
    animation: 'none',
    sourceId: 'light',
    surface: 'floor',
    ...partial,
  };
}

function caster(partial: Partial<ShadowCaster> = {}): ShadowCaster {
  return { ownerId: 'caster', x: 100, y: 0, radiusPx: 50, segments: [WALL_AT_X100], imageUrl: '', ...partial };
}

function source(partial: Partial<SceneVisionSource> = {}): SceneVisionSource {
  return { x: 0, y: 0, type: VisionType.NORMAL, rangePx: 0, owner: 'p1', ...partial };
}

function scene(partial: Partial<VisionScene> = {}): VisionScene {
  return {
    darknessEnabled: true,
    darknessLevel: 0.9,
    ambientColor: '#05060a',
    globalIllumination: 0,
    gridSize: 50,
    widthPx: 1000,
    heightPx: 1000,
    lights: [],
    visionSources: [],
    sightSegments: [],
    lightSegments: [],
    shadowCasters: [],
    ...partial,
  };
}

const GM: SceneViewer = { userId: 'gm', isGameMaster: true };
const PLAYER: SceneViewer = { userId: 'p1', isGameMaster: false };

describe('vision-scene', () => {
  describe('withinCone', () => {
    it('全方位(360)は常に true', () => {
      expect(withinCone(light({ angle: 360 }), 50, 50)).toBe(true);
    });

    it('コーンの向きの内側は true、外側は false', () => {
      const cone = light({ x: 0, y: 0, angle: 90, direction: 0 });
      expect(withinCone(cone, 100, 0)).toBe(true);
      expect(withinCone(cone, -100, 0)).toBe(false);
    });
  });

  describe('3D ジオメトリ（高度・ピッチ）', () => {
    it('floorRadii は高さで床半径を縮小する', () => {
      expect(floorRadii(light({ z: 0, dimPx: 200 })).dimFloor).toBeCloseTo(200);
      expect(floorRadii(light({ z: 120, dimPx: 200 })).dimFloor).toBeCloseTo(Math.sqrt(200 * 200 - 120 * 120));
      expect(floorRadii(light({ z: 250, dimPx: 200 })).dimFloor).toBe(0);
    });

    it('高い球は 3D 距離で床への到達が縮む', () => {
      const s = scene({ lights: [light({ x: 0, y: 0, z: 180, dimPx: 200, brightPx: 100 })] });
      expect(lightLevelAt(s, 80, 0)).toBeGreaterThan(0);
      expect(lightLevelAt(s, 120, 0)).toBe(0);
    });

    it('十分高い球は床に全く届かない', () => {
      const s = scene({ lights: [light({ x: 0, y: 0, z: 250, dimPx: 200 })] });
      expect(lightLevelAt(s, 0, 0)).toBe(0);
    });

    it('lightAxis はピッチで上下を向く', () => {
      expect(lightAxis(light({ pitch: 0 })).z).toBeCloseTo(0);
      expect(lightAxis(light({ pitch: -90 })).z).toBeCloseTo(-1);
      expect(lightAxis(light({ pitch: 90 })).z).toBeCloseTo(1);
    });

    it('真下向き円錐は真下を照らし、側方は照らさない', () => {
      const s = scene({
        lights: [light({ x: 0, y: 0, z: 100, dimPx: 1000, angle: 60, direction: 0, pitch: -90 })],
      });
      expect(lightReaches(s, s.lights[0], 0, 0)).toBe(true);
      expect(lightReaches(s, s.lights[0], 300, 0)).toBe(false);
    });

    it('前方下向き円錐は前方の床を照らし、後方は照らさない', () => {
      const s = scene({
        lights: [light({ x: 0, y: 0, z: 50, dimPx: 1000, angle: 60, direction: 0, pitch: -30 })],
      });
      expect(lightReaches(s, s.lights[0], 100, 0)).toBe(true);
      expect(lightReaches(s, s.lights[0], -100, 0)).toBe(false);
    });

    it('computeLightBeam は高所の下向き円錐で複数フィンの 3D 円錐を生成する', () => {
      const beam = computeLightBeam(light({ x: 100, y: 100, z: 200, angle: 45, direction: 0, pitch: -52, dimPx: 600 }));
      expect(beam).not.toBeNull();
      expect(beam!.height).toBeGreaterThan(0);
      expect(beam!.width).toBeGreaterThan(0);
      expect(beam!.fins.length).toBeGreaterThan(1);
      expect(beam!.fins[0].startsWith('matrix3d(')).toBe(true);
      expect(beam!.clip.startsWith('polygon(')).toBe(true);
    });

    it('computeLightBeam は球・高さ0・上向きでは帯を作らない', () => {
      expect(computeLightBeam(light({ angle: 360, z: 200 }))).toBeNull();
      expect(computeLightBeam(light({ angle: 45, z: 0, pitch: -52 }))).toBeNull();
      expect(computeLightBeam(light({ angle: 45, z: 200, pitch: 30 }))).toBeNull();
    });

    it('床の球ライトはカメラ正対(transform=null)のオーブを生成する', () => {
      const glow = computeLightGlow(light({ x: 100, y: 120, z: 80, angle: 360, brightPx: 150, dimPx: 300 }), 50);
      expect(glow).not.toBeNull();
      expect(glow!.x).toBe(100);
      expect(glow!.y).toBe(120);
      expect(glow!.z).toBe(80);
      expect(glow!.size).toBeGreaterThan(0);
      expect(glow!.transform).toBeNull();
    });

    it('壁の球ライトは壁面と同一平面(matrix3d)のオーブを生成する', () => {
      const glow = computeLightGlow(light({ angle: 360, brightPx: 150, dimPx: 300, surface: 'north-wall' }), 50);
      expect(glow).not.toBeNull();
      expect(glow!.transform).not.toBeNull();
      expect(glow!.transform!.startsWith('matrix3d(')).toBe(true);
    });

    it('computeLightGlow は円錐・特大(太陽光相当)ではオーブを作らない', () => {
      expect(computeLightGlow(light({ angle: 45, brightPx: 150 }), 50)).toBeNull();
      expect(computeLightGlow(light({ angle: 360, brightPx: 600, dimPx: 1200 }), 50)).toBeNull();
    });
  });

  describe('lightLevelAt', () => {
    it('明radius内は1、dim域は0.5、域外は0', () => {
      const s = scene({ lights: [light({ x: 0, y: 0, brightPx: 100, dimPx: 200 })] });
      expect(lightLevelAt(s, 50, 0)).toBe(1);
      expect(lightLevelAt(s, 150, 0)).toBe(0.5);
      expect(lightLevelAt(s, 300, 0)).toBe(0);
    });

    it('globalIllumination が床として効く', () => {
      const s = scene({ globalIllumination: 0.3 });
      expect(lightLevelAt(s, 999, 999)).toBeCloseTo(0.3);
    });
  });

  describe('isPointVisible', () => {
    it('GM は常に可視', () => {
      expect(isPointVisible(scene(), 500, 500, GM)).toBe(true);
    });

    it('視界を持たない PL は不可視', () => {
      expect(isPointVisible(scene(), 500, 500, PLAYER)).toBe(false);
    });

    it('通常視界の PL は照らされた領域が見える', () => {
      const s = scene({
        lights: [light({ x: 500, y: 500, brightPx: 100, dimPx: 200 })],
        visionSources: [source({ type: VisionType.NORMAL, owner: 'p1' })],
      });
      expect(isPointVisible(s, 520, 500, PLAYER)).toBe(true);
      expect(isPointVisible(s, 900, 900, PLAYER)).toBe(false);
    });

    it('暗視の PL は範囲内の暗所が見える', () => {
      const s = scene({
        visionSources: [source({ x: 100, y: 100, type: VisionType.DARKVISION, rangePx: 150, owner: 'p1' })],
      });
      expect(isPointVisible(s, 180, 100, PLAYER)).toBe(true);
      expect(isPointVisible(s, 400, 100, PLAYER)).toBe(false);
    });

    it('照らされた場所は視界源を持たない PL でも見える', () => {
      const s = scene({ lights: [light({ x: 500, y: 500, dimPx: 200 })] });
      expect(isPointVisible(s, 520, 500, PLAYER)).toBe(true);
    });

    it('真視は遮蔽を無視して範囲内を見通す（暗視は壁で遮られる）', () => {
      const truesight = scene({
        sightSegments: [WALL_AT_X100],
        visionSources: [source({ x: 0, y: 0, type: VisionType.TRUESIGHT, rangePx: 300, owner: 'p1' })],
      });
      expect(isPointVisible(truesight, 200, 0, PLAYER)).toBe(true);
      expect(isPointVisible(truesight, 400, 0, PLAYER)).toBe(false);

      const darkvision = scene({
        sightSegments: [WALL_AT_X100],
        visionSources: [source({ x: 0, y: 0, type: VisionType.DARKVISION, rangePx: 300, owner: 'p1' })],
      });
      expect(isPointVisible(darkvision, 200, 0, PLAYER)).toBe(false);
    });

    it('影を落とすトークンは自分のフットプリントで隠れない', () => {
      const footprint: Segment[] = [
        { x1: -25, y1: -25, x2: 25, y2: -25 },
        { x1: 25, y1: -25, x2: 25, y2: 25 },
        { x1: 25, y1: 25, x2: -25, y2: 25 },
        { x1: -25, y1: 25, x2: -25, y2: -25 },
      ];
      const s = scene({
        lights: [light({ x: 0, y: -100, dimPx: 1000, castShadows: true, sourceId: 'L' })],
        visionSources: [source({ x: 0, y: -200, type: VisionType.NORMAL, owner: 'p1' })],
        shadowCasters: [caster({ ownerId: 'mob', x: 0, y: 0, radiusPx: 25, segments: footprint })],
      });
      expect(isPointVisible(s, 0, 0, PLAYER)).toBe(true);
    });

    it('盲目の視界源は暗所で可視性を与えない', () => {
      const s = scene({
        visionSources: [source({ x: 0, y: 0, type: VisionType.BLIND, rangePx: 1000, owner: 'p1' })],
      });
      expect(isPointVisible(s, 100, 0, PLAYER)).toBe(false);
    });

    it('revealToAll の演出ライトは視界がなくても全員に見える', () => {
      const s = scene({ lights: [light({ x: 500, y: 500, dimPx: 200, revealToAll: true })] });
      expect(isPointVisible(s, 550, 500, PLAYER)).toBe(true);
    });

    it('他PL所有の暗視源は自分の暗所可視性に寄与しない', () => {
      const s = scene({
        visionSources: [source({ x: 800, y: 800, type: VisionType.DARKVISION, rangePx: 200, owner: 'other' })],
      });
      expect(isPointVisible(s, 820, 800, PLAYER)).toBe(false);
    });

    it('壁が視界源と対象の間にあると遮蔽される', () => {
      const s = scene({
        lights: [light({ x: 0, y: 0, dimPx: 1000 })],
        visionSources: [source({ x: 0, y: 0, type: VisionType.NORMAL, owner: 'p1' })],
        sightSegments: [WALL_AT_X100],
        lightSegments: [WALL_AT_X100],
      });
      expect(isPointVisible(s, 50, 0, PLAYER)).toBe(true);
      expect(isPointVisible(s, 200, 0, PLAYER)).toBe(false);
    });

    it('窓硝子(blocksLight=false)は光を通し、その照らされた先は見える', () => {
      const s = scene({
        lights: [light({ x: 0, y: 0, dimPx: 1000 })],
        sightSegments: [WALL_AT_X100],
        lightSegments: [],
      });
      expect(lightLevelAt(s, 200, 0)).toBeGreaterThan(0);
      expect(isPointVisible(s, 200, 0, PLAYER)).toBe(true);
    });

    it('視界源を持つ PL は、視線を遮る地形の先の明所が見えない', () => {
      const s = scene({
        lights: [light({ x: 500, y: 0, dimPx: 1000 })],
        visionSources: [source({ x: 0, y: 0, type: VisionType.NORMAL, owner: 'p1' })],
        sightSegments: [WALL_AT_X100],
        lightSegments: [],
      });
      expect(isLit(s, 200, 0)).toBe(true);
      expect(isPointVisible(s, 200, 0, PLAYER)).toBe(false);
    });

    it('窓硝子は暗所の暗視を遮る', () => {
      const s = scene({
        visionSources: [source({ x: -50, y: 0, type: VisionType.DARKVISION, rangePx: 1000, owner: 'p1' })],
        sightSegments: [WALL_AT_X100],
        lightSegments: [],
      });
      expect(isPointVisible(s, 200, 0, PLAYER)).toBe(false);
    });

    it('ignoreOcclusion のライトは壁を無視して照らす', () => {
      const s = scene({
        lights: [light({ x: 0, y: 0, dimPx: 1000, ignoreOcclusion: true })],
        lightSegments: [WALL_AT_X100],
      });
      expect(lightLevelAt(s, 200, 0)).toBeGreaterThan(0);
    });

    it('castShadows のライトはトークン(shadowCaster)で影を落とす', () => {
      const s = scene({
        lights: [light({ x: 0, y: 0, dimPx: 1000, castShadows: true, sourceId: 'light' })],
        shadowCasters: [caster({ ownerId: 'tokenA' })],
      });
      expect(lightLevelAt(s, 50, 0)).toBeGreaterThan(0);
      expect(lightLevelAt(s, 200, 0)).toBe(0);
    });

    it('castShadows でない光はトークンの影を無視する', () => {
      const s = scene({
        lights: [light({ x: 0, y: 0, dimPx: 1000, castShadows: false })],
        shadowCasters: [caster({ ownerId: 'tokenA' })],
      });
      expect(lightLevelAt(s, 200, 0)).toBeGreaterThan(0);
    });

    it('発光トークン自身の影は自分の光を遮らない', () => {
      const s = scene({
        lights: [light({ x: 0, y: 0, dimPx: 1000, castShadows: true, sourceId: 'tokenA' })],
        shadowCasters: [caster({ ownerId: 'tokenA' })],
      });
      expect(lightLevelAt(s, 200, 0)).toBeGreaterThan(0);
    });

    it('ignoreOcclusion + castShadows は壁を無視しトークンの影だけ落とす', () => {
      const s = scene({
        lights: [light({ x: 0, y: 0, dimPx: 1000, ignoreOcclusion: true, castShadows: true, sourceId: 'light' })],
        lightSegments: [{ x1: 50, y1: -200, x2: 50, y2: 200 }],
        shadowCasters: [caster({ ownerId: 'tokenA' })],
      });
      expect(lightLevelAt(s, 70, 0)).toBeGreaterThan(0);
      expect(lightLevelAt(s, 200, 0)).toBe(0);
    });
  });

  describe('objectLightLevel / objectBrightnessFor (面ごとの明るさ)', () => {
    it('objectLightLevel は光源側で点灯、遠方で消灯', () => {
      const s = scene({ lights: [light({ x: 0, y: 0, brightPx: 50, dimPx: 200 })] });
      expect(objectLightLevel(s, 100, 0, 0)).toBeGreaterThan(0);
      expect(objectLightLevel(s, 500, 0, 0)).toBe(0);
    });

    it('ignoreShadowCasters でトークンの影を無視して面を明るく保つ', () => {
      const s = scene({
        lights: [light({ x: 0, y: 0, brightPx: 50, dimPx: 1000, castShadows: true, sourceId: 'L' })],
        shadowCasters: [caster({ ownerId: 'c', x: 100, y: 0, radiusPx: 10, segments: [WALL_AT_X100] })],
      });
      expect(objectLightLevel(s, 200, 0, 0, false)).toBe(0);
      expect(objectLightLevel(s, 200, 0, 0, true)).toBeGreaterThan(0);
    });

    it('照らされた面は明るく、反対の暗い面は暗い', () => {
      const s = scene({
        lights: [light({ x: 0, y: 0, brightPx: 50, dimPx: 300 })],
        visionSources: [source({ x: 0, y: 0, type: VisionType.NORMAL, owner: 'p1' })],
      });
      const litFace = objectBrightnessFor(s, PLAYER, 100, 0, 0);
      const darkFace = objectBrightnessFor(s, PLAYER, 600, 0, 0);
      expect(litFace).toBeGreaterThan(darkFace);
    });
  });

  describe('computeWallSilhouettes (壁への投影シルエット)', () => {
    const northFace: WallFace = { ax: 0, ay: 0, bx: 200, by: 0, nx: 0, ny: -1, heightPx: 100 };

    it('光と壁の間のキャスタが壁に投影される', () => {
      const s = scene({
        lights: [light({ x: 100, y: -100, dimPx: 1000, castShadows: true, sourceId: 'L' })],
        shadowCasters: [caster({ ownerId: 'c', x: 100, y: -50, radiusPx: 25, segments: [] })],
      });
      const sils = computeWallSilhouettes(s, northFace, 75);
      expect(sils).toHaveLength(1);
      expect(sils[0].localX).toBeCloseTo(100);
      expect(sils[0].width).toBeCloseTo(100);
      expect(sils[0].height).toBeGreaterThan(0);
    });

    it('シルエットにキャスタの画像URLを保持する', () => {
      const s = scene({
        lights: [light({ x: 100, y: -100, dimPx: 1000, castShadows: true, sourceId: 'L' })],
        shadowCasters: [caster({ ownerId: 'c', x: 100, y: -50, radiusPx: 25, segments: [], imageUrl: 'token.png' })],
      });
      expect(computeWallSilhouettes(s, northFace, 75)[0].imageUrl).toBe('token.png');
    });

    it('自分が発する光ではシルエットを作らない', () => {
      const s = scene({
        lights: [light({ x: 100, y: -100, dimPx: 1000, castShadows: true, sourceId: 'c' })],
        shadowCasters: [caster({ ownerId: 'c', x: 100, y: -50, radiusPx: 25, segments: [] })],
      });
      expect(computeWallSilhouettes(s, northFace, 75)).toHaveLength(0);
    });

    it('光が壁の内側(キャスタの後ろ)にある場合は投影しない', () => {
      const s = scene({
        lights: [light({ x: 100, y: 50, dimPx: 1000, castShadows: true, sourceId: 'L' })],
        shadowCasters: [caster({ ownerId: 'c', x: 100, y: -50, radiusPx: 25, segments: [] })],
      });
      expect(computeWallSilhouettes(s, northFace, 75)).toHaveLength(0);
    });

    it('投影中心が面の外でも影の幅が面にかかれば投影される', () => {
      const s = scene({
        lights: [light({ x: 300, y: -100, dimPx: 1000, castShadows: true, sourceId: 'L' })],
        shadowCasters: [caster({ ownerId: 'c', x: 260, y: -50, radiusPx: 25, segments: [] })],
      });
      const sils = computeWallSilhouettes(s, northFace, 75);
      expect(sils).toHaveLength(1);
      expect(sils[0].localX).toBeCloseTo(220);
    });

    it('影の幅が面に全くかからなければ投影しない', () => {
      const s = scene({
        lights: [light({ x: 600, y: -100, dimPx: 2000, castShadows: true, sourceId: 'L' })],
        shadowCasters: [caster({ ownerId: 'c', x: 560, y: -50, radiusPx: 10, segments: [] })],
      });
      expect(computeWallSilhouettes(s, northFace, 75)).toHaveLength(0);
    });
  });

  describe('computeWallLights (壁面のライトプール)', () => {
    const northFace: WallFace = { ax: 0, ay: 0, bx: 200, by: 0, nx: 0, ny: -1, heightPx: 100 };

    it('面の外側のライトはプールを生成する', () => {
      const s = scene({ lights: [light({ x: 100, y: -60, brightPx: 50, dimPx: 200 })] });
      const pools = computeWallLights(s, northFace);
      expect(pools).toHaveLength(1);
      expect(pools[0].localX).toBeCloseTo(100);
      expect(pools[0].radiusX).toBeCloseTo(Math.sqrt(200 * 200 - 60 * 60));
    });

    it('プールの垂直中心は光源の高さ(z)に追従する', () => {
      const onFloor = scene({ lights: [light({ x: 100, y: -60, z: 0, dimPx: 200 })] });
      expect(computeWallLights(onFloor, northFace)[0].localY).toBeCloseTo(100);
      const elevated = scene({ lights: [light({ x: 100, y: -60, z: 40, dimPx: 200 })] });
      expect(computeWallLights(elevated, northFace)[0].localY).toBeCloseTo(100 - 40);
    });

    it('面の裏側のライトはプールを生成しない', () => {
      const s = scene({ lights: [light({ x: 100, y: 60, dimPx: 200 })] });
      expect(computeWallLights(s, northFace)).toHaveLength(0);
    });

    it('dim 半径より遠いライトはプールを生成しない', () => {
      const s = scene({ lights: [light({ x: 100, y: -300, dimPx: 200 })] });
      expect(computeWallLights(s, northFace)).toHaveLength(0);
    });

    it('壁で遮蔽されたライトはプールを生成しない', () => {
      const s = scene({
        lights: [light({ x: 100, y: -60, dimPx: 200 })],
        lightSegments: [{ x1: -10, y1: -30, x2: 210, y2: -30 }],
      });
      expect(computeWallLights(s, northFace)).toHaveLength(0);
    });

    it('bright 域は intensity=1、dim 域は減衰する', () => {
      const near = scene({ lights: [light({ x: 100, y: -30, brightPx: 50, dimPx: 200 })] });
      expect(computeWallLights(near, northFace)[0].intensity).toBe(1);
      const far = scene({ lights: [light({ x: 100, y: -120, brightPx: 50, dimPx: 200 })] });
      expect(computeWallLights(far, northFace)[0].intensity).toBeLessThan(1);
    });
  });

  describe('computeOverlayPlan', () => {
    it('GM は薄暗いプレビュー（プレイヤーより明るい）でライトを reveal する', () => {
      const s = scene({ lights: [light(), light()] });
      const gmPlan = computeOverlayPlan(s, GM);
      const playerView = scene({
        lights: [light(), light()],
        visionSources: [source({ type: VisionType.NORMAL, owner: 'p1' })],
      });
      const plPlan = computeOverlayPlan(playerView, PLAYER);
      expect(gmPlan.darknessAlpha).toBeGreaterThan(0);
      expect(gmPlan.darknessAlpha).toBeLessThan(plPlan.darknessAlpha);
      expect(gmPlan.reveals).toHaveLength(2);
      expect(gmPlan.glows).toHaveLength(2);
    });

    it('視界のある PL はライト域を reveal する', () => {
      const s = scene({
        lights: [light({ x: 500, y: 500 })],
        visionSources: [source({ type: VisionType.NORMAL, owner: 'p1' })],
      });
      const plan = computeOverlayPlan(s, PLAYER);
      expect(plan.darknessAlpha).toBeGreaterThan(0);
      expect(plan.reveals).toHaveLength(1);
      expect(plan.reveals[0].full).toBe(false);
    });

    it('視界源を持たない PL でも全ライト域が reveal される', () => {
      const s = scene({ lights: [light(), light()] });
      const plan = computeOverlayPlan(s, PLAYER);
      expect(plan.reveals).toHaveLength(2);
    });

    it('高所の球ライトは reveal 半径が床半径に縮小する', () => {
      const s = scene({ lights: [light({ x: 100, y: 100, z: 150, dimPx: 200, brightPx: 100 })] });
      const plan = computeOverlayPlan(s, PLAYER);
      expect(plan.reveals).toHaveLength(1);
      expect(plan.reveals[0].dimPx).toBeCloseTo(Math.sqrt(200 * 200 - 150 * 150));
    });

    it('高すぎる球ライトは床を reveal しない', () => {
      const s = scene({ lights: [light({ x: 100, y: 100, z: 250, dimPx: 200 })] });
      expect(computeOverlayPlan(s, PLAYER).reveals).toHaveLength(0);
    });

    it('下向き円錐ライトは前方の床にビーム footprint を持つ', () => {
      const s = scene({
        lights: [light({ x: 100, y: 100, z: 50, dimPx: 600, angle: 45, direction: 0, pitch: -30 })],
      });
      const plan = computeOverlayPlan(s, PLAYER);
      expect(plan.reveals).toHaveLength(1);
      const reveal = plan.reveals[0];
      expect(reveal.clipPolygon && reveal.clipPolygon.length).toBeGreaterThan(3);
      expect(reveal.x).toBeGreaterThan(100);
    });

    it('暗視源は full な reveal 円を追加する', () => {
      const s = scene({
        visionSources: [source({ type: VisionType.DARKVISION, rangePx: 150, owner: 'p1' })],
      });
      const plan = computeOverlayPlan(s, PLAYER);
      const fullReveal = plan.reveals.find((r) => r.full);
      expect(fullReveal).toBeTruthy();
      expect(fullReveal?.dimPx).toBe(150);
    });

    it('真視源は遮蔽でクリップしない全円 reveal を追加する', () => {
      const s = scene({
        sightSegments: [WALL_AT_X100],
        visionSources: [source({ type: VisionType.TRUESIGHT, rangePx: 150, owner: 'p1' })],
      });
      const plan = computeOverlayPlan(s, PLAYER);
      const reveal = plan.reveals.find((r) => r.full);
      expect(reveal).toBeTruthy();
      expect(reveal?.clipPolygon).toBeUndefined();
    });

    it('熱視界の源は熱色のグローを追加する', () => {
      const s = scene({
        visionSources: [source({ type: VisionType.THERMAL, rangePx: 150, owner: 'p1' })],
      });
      const plan = computeOverlayPlan(s, PLAYER);
      const thermalGlow = plan.glows.find((g) => g.color === '#ff5a1e');
      expect(thermalGlow).toBeTruthy();
      expect(thermalGlow?.dimPx).toBe(150);
    });

    it('ライトの animation が OverlayShape に伝わる', () => {
      const s = scene({ lights: [light({ animation: 'neon' })] });
      const plan = computeOverlayPlan(s, PLAYER);
      expect(plan.glows[0].animation).toBe('neon');
    });

    it('castShadows ライト下のシャドウキャスタは投影シルエット影を生成する', () => {
      const s = scene({
        lights: [light({ x: 100, y: 300, dimPx: 600, castShadows: true })],
        shadowCasters: [caster({ ownerId: 'c1', x: 300, y: 300, radiusPx: 25, segments: [] })],
      });
      const plan = computeOverlayPlan(s, PLAYER);
      expect(plan.shadows).toHaveLength(1);
      // 影は光源と反対方向(+x)へ伸びる
      expect(plan.shadows[0].fx).toBeGreaterThan(300);
    });

    it('castShadows でないライトは影シルエットを作らない', () => {
      const s = scene({
        lights: [light({ x: 100, y: 300, dimPx: 600, castShadows: false })],
        shadowCasters: [caster({ ownerId: 'c1', x: 300, y: 300, radiusPx: 25, segments: [] })],
      });
      expect(computeOverlayPlan(s, PLAYER).shadows).toHaveLength(0);
    });

    it('自分の光は自分のシルエット影を生成しない', () => {
      const s = scene({
        lights: [light({ x: 100, y: 300, dimPx: 600, castShadows: true, sourceId: 'c1' })],
        shadowCasters: [caster({ ownerId: 'c1', x: 300, y: 300, radiusPx: 25, segments: [] })],
      });
      expect(computeOverlayPlan(s, PLAYER).shadows).toHaveLength(0);
    });

    it('globalIllumination は darknessAlpha を下げ baseReveal を上げる', () => {
      const s = scene({
        globalIllumination: 0.5,
        visionSources: [source({ type: VisionType.NORMAL, owner: 'p1' })],
      });
      const plan = computeOverlayPlan(s, PLAYER);
      expect(plan.baseRevealAlpha).toBeCloseTo(0.5);
      expect(plan.darknessAlpha).toBeCloseTo(0.9 * 0.5);
    });
  });
});
