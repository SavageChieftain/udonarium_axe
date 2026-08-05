import { SyncObject, SyncVar } from '@axe/core/sync/decorator';
import { GameObject } from '@axe/core/sync/game-object';
import { ObjectStore } from '@axe/core/sync/object-store';
import {
  EffectKind,
  EffectTargeting,
  isEffectKind,
  isEffectTargeting,
  isSlashStyle,
  ProjectileStyle,
  SlashStyle,
} from '@axe/domain/effect/effect-kind';

const MIN_DURATION_MS = 120;
const MAX_DURATION_MS = 6000;
const MIN_SCALE = 0.2;
const MAX_SCALE = 6;
const MAX_STAGGER_MS = 2000;
const MAX_TARGET_LIMIT = 20;
const MAX_SHOTS = 24;
const MAX_AREA_RADIUS = 12;

@SyncObject('effect-preset')
export class EffectPreset extends GameObject {
  @SyncVar() name: string = '';
  @SyncVar() tagName: string = '';
  @SyncVar() kind: string = 'burst';
  @SyncVar() colorPrimary: string = '#ffd27f';
  @SyncVar() colorSecondary: string = '#ff5a33';
  @SyncVar() durationMs: number = 900;
  @SyncVar() staggerMs: number = 90;
  @SyncVar() scale: number = 1;
  @SyncVar() followTarget: boolean = true;
  @SyncVar() soundIdentifier: string = '';
  /** 着弾で鳴らす音。空なら発射音だけ。 */
  @SyncVar() impactSoundIdentifier: string = '';
  @SyncVar() targeting: string = 'single';
  @SyncVar() maxTargets: number = 1;
  /** 1=初級 / 2=中級 / 3=上級。粒子の量と演出の段数を決める。 */
  @SyncVar() grade: number = 2;
  /** 飛翔体が着弾したときに起こすエフェクト。空なら爆発。 */
  @SyncVar() impactKind: string = '';
  /** 飛翔体の見た目。bolt=魔法弾 / arrow=矢 / bullet=銃弾。 */
  @SyncVar() projectileStyle: string = 'bolt';
  /** 1 回の発動で撃つ弾数。2 以上で連射になる。 */
  @SyncVar() shots: number = 1;
  /** 斬撃の型。 */
  @SyncVar() slashStyle: string = 'single';
  /** 連射の間隔(ms)。0 なら再生時間へ均等に散らす。 */
  @SyncVar() shotInterval: number = 0;
  /** GM だけに見せる。演出で仕込みが割れるのを避けたいときに使う。 */
  @SyncVar() gmOnly: boolean = false;
  /** 巻き込む半径(マス)。0 なら 1 体ずつ選ぶ。 */
  @SyncVar() areaRadius: number = 0;

  static list(): EffectPreset[] {
    return ObjectStore.instance.getObjects<EffectPreset>(EffectPreset);
  }

  get effectKind(): EffectKind {
    return isEffectKind(this.kind) ? this.kind : 'burst';
  }

  get effectTargeting(): EffectTargeting {
    return isEffectTargeting(this.targeting) ? this.targeting : 'single';
  }

  get duration(): number {
    return clamp(this.durationMs, MIN_DURATION_MS, MAX_DURATION_MS, 900);
  }

  get stagger(): number {
    return clamp(this.staggerMs, 0, MAX_STAGGER_MS, 0);
  }

  get sizeScale(): number {
    return clamp(this.scale, MIN_SCALE, MAX_SCALE, 1);
  }

  /** 着弾エフェクト。飛翔体の入れ子は許さない。 */
  get impactEffectKind(): EffectKind {
    if (!isEffectKind(this.impactKind) || this.impactKind === 'projectile') return 'burst';
    return this.impactKind;
  }

  /** 着弾音を鳴らす位置(0-1)。飛翔体は着弾の瞬間、それ以外は少し遅らせる。 */
  get impactSoundAt(): number {
    if (this.effectKind === 'arc') return 0.4;
    // レーザーは撃った瞬間に鳴らす。着弾を待つと溜めのあいだ無音になる。
    if (this.effectKind === 'beam') return 0.28;
    return 0.5;
  }

  get shotIntervalMs(): number {
    return Math.max(0, clamp(this.shotInterval, 0, MAX_DURATION_MS, 0));
  }

  get shotCount(): number {
    return Math.round(clamp(this.shots, 1, MAX_SHOTS, 1));
  }

  get slashLook(): SlashStyle {
    return isSlashStyle(this.slashStyle) ? this.slashStyle : 'single';
  }

  get projectileLook(): ProjectileStyle {
    return this.projectileStyle === 'arrow' || this.projectileStyle === 'bullet' ? this.projectileStyle : 'bolt';
  }

  get gradeLevel(): 1 | 2 | 3 {
    const level = Math.round(clamp(this.grade, 1, 3, 2));
    return level === 1 || level === 3 ? level : 2;
  }

  /** 等級に応じた粒子の量。上級ほど濃く長い。 */
  get gradeDensity(): number {
    return this.gradeLevel === 1 ? 0.55 : this.gradeLevel === 3 ? 1.7 : 1;
  }

  get targetLimit(): number {
    if (this.effectTargeting === 'self') return 1;
    if (this.effectTargeting === 'single') return 1;
    return Math.round(clamp(this.maxTargets, 1, MAX_TARGET_LIMIT, 1));
  }

  /** 巻き込む半径(マス)。単体対象のものは範囲を持たない。 */
  get areaRadiusCells(): number {
    if (this.effectTargeting !== 'multi') return 0;
    return clamp(this.areaRadius, 0, MAX_AREA_RADIUS, 0);
  }

  /** 全対象ぶんの再生が終わるまでの長さ。 */
  totalDuration(targetCount: number): number {
    const count = Math.max(targetCount, 1);
    return this.duration + this.stagger * (count - 1);
  }
}

function clamp(value: number, min: number, max: number, fallback: number): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(Math.max(numeric, min), max);
}
