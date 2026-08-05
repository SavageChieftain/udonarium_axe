import { NgStyle } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { EffectFieldRenderable, EffectFieldService } from '@axe/application/effect/effect-field.service';
import { EffectPlaybackService } from '@axe/application/effect/effect-playback.service';
import { TabletopService } from '@axe/application/tabletop/tabletop.service';
import { VisionService } from '@axe/application/tabletop/vision.service';
import { UiSignalService } from '@axe/application/ui/ui-signal.service';
import { ObjectStore } from '@axe/core/sync/object-store';
import { GameCharacter } from '@axe/domain/character/game-character';
import { EffectParticleLayer, effectParticles } from '@axe/domain/effect/effect-particles';
import {
  EffectSprite,
  effectSprites,
  effectTargetCenter,
  effectTargetProgress,
} from '@axe/domain/effect/effect-timeline';
import { TabletopObject } from '@axe/domain/tabletop/tabletop-object';
import { EffectCanvasComponent } from '@axe/features/effect/effect-canvas/effect-canvas.component';
import { SafePipe } from '@axe/ui/pipes/safe.pipe';

export interface EffectCanvasPlacement {
  key: string;
  layer: EffectParticleLayer;
  transform: string;
  width: number;
  height: number;
}

/**
 * 演出をカメラ側へ寄せる量(px)。
 * 板ポリはコマや名前ラベルと同じ深さに来るので、少し手前へ出さないと
 * ラベルの背景に隠れて演出が途切れて見える。
 */
const CAMERA_LIFT_PX = 40;

const MAX_SPRITES = 400;
const MAX_CANVASES = 24;

@Component({
  selector: 'table-effect-overlay',
  templateUrl: './table-effect-overlay.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
  imports: [NgStyle, SafePipe, EffectCanvasComponent],
})
export class TableEffectOverlayComponent {
  private readonly playback = inject(EffectPlaybackService);
  private readonly fieldService = inject(EffectFieldService);
  private readonly tabletopService = inject(TabletopService);
  private readonly uiSignalService = inject(UiSignalService);
  private readonly visionService = inject(VisionService);
  private readonly objectStore = inject(ObjectStore);

  /** 発動中の演出と、置きっぱなしの場をまとめて 1 本の描画対象にする。 */
  private readonly renderables = computed<EffectFieldRenderable[]>(() => {
    const now = this.playback.now();
    return [
      ...this.playback.activeCasts().map((active) => ({
        key: String(active.key),
        preset: active.preset,
        cast: active.cast,
        elapsed: now - active.startedAt,
      })),
      ...this.fieldService.renderables(now),
    ];
  });

  readonly sprites = computed<EffectSprite[]>(() => {
    const gridSize = this.tabletopService.gridSize();
    const sprites: EffectSprite[] = [];

    for (const active of this.renderables()) {
      const hiddenIdentifiers = this.hiddenIdentifiersOf(active.cast.targets.map((target) => target.identifier));
      const parts = effectSprites(active.preset, active.cast, active.elapsed, {
        baseSize: gridSize,
        hiddenIdentifiers,
        viewRotation: this.uiSignalService.tableViewRotation(),
        resolvePosition: (identifier) => this.centerOf(identifier, gridSize),
      });
      for (const part of parts) sprites.push({ ...part, key: `${active.key}-${part.key}` });
    }
    return sprites.length > MAX_SPRITES ? sprites.slice(0, MAX_SPRITES) : sprites;
  });

  /** 光る粒は対象ごとに 1 枚の canvas へ。加算合成は canvas の中で閉じるので 3D を潰さない。 */
  readonly canvases = computed<EffectCanvasPlacement[]>(() => {
    const gridSize = this.tabletopService.gridSize();
    const placements: EffectCanvasPlacement[] = [];

    for (const active of this.renderables()) {
      const hiddenIdentifiers = this.hiddenIdentifiersOf(active.cast.targets.map((target) => target.identifier));
      const base = gridSize * active.preset.sizeScale;

      active.cast.targets.forEach((target, index) => {
        if (hiddenIdentifiers.has(target.identifier)) return;
        const progress = effectTargetProgress(active.preset, active.elapsed, index);
        if (progress < 0 || progress > 1) return;

        const layer = effectParticles(active.preset, active.cast.seed + index * 7919, progress, base);
        if (layer.particles.length < 1) return;

        const center = effectTargetCenter(target, active.preset, {
          baseSize: gridSize,
          resolvePosition: (identifier) => this.centerOf(identifier, gridSize),
        });
        placements.push({
          key: `${active.key}-${index}`,
          layer,
          width: layer.width,
          height: layer.height,
          transform: this.billboardTransform(center, layer),
        });
      });
    }
    return placements.length > MAX_CANVASES ? placements.slice(0, MAX_CANVASES) : placements;
  });

  protected canvasStyle(placement: EffectCanvasPlacement): Record<string, string> {
    return {
      position: 'absolute',
      left: '0px',
      top: '0px',
      width: placement.width + 'px',
      height: placement.height + 'px',
      'transform-origin': '0 0',
      transform: placement.transform,
      'pointer-events': 'none',
    };
  }

  protected hasPaintLayer(sprite: EffectSprite): boolean {
    return sprite.animation.length > 0 || sprite.svg.length > 0;
  }

  /** 外側の層。3D 配置と寿命フェードだけを担う。 */
  protected spriteStyle(sprite: EffectSprite): Record<string, string> {
    const style: Record<string, string> = {
      position: 'absolute',
      left: '0px',
      top: '0px',
      width: sprite.width + 'px',
      height: sprite.height + 'px',
      opacity: sprite.opacity.toFixed(3),
      'transform-origin': '0 0',
      transform: this.transform(sprite),
      'pointer-events': 'none',
    };
    if (!this.hasPaintLayer(sprite)) Object.assign(style, this.paint(sprite));
    return style;
  }

  /** 内側の層。見た目と CSS アニメーションを担う。 */
  protected paintStyle(sprite: EffectSprite): Record<string, string> {
    const style = this.paint(sprite);
    if (sprite.animation.length > 0) style['animation'] = sprite.animation;
    style['transform-origin'] = sprite.origin.length > 0 ? sprite.origin : '50% 50%';
    return style;
  }

  private paint(sprite: EffectSprite): Record<string, string> {
    const style: Record<string, string> = {};
    if (sprite.background.length > 0) style['background'] = sprite.background;
    if (sprite.borderRadius.length > 0) style['border-radius'] = sprite.borderRadius;
    if (sprite.clipPath.length > 0) style['clip-path'] = sprite.clipPath;
    if (sprite.shadow.length > 0) style['box-shadow'] = sprite.shadow;
    return style;
  }

  private billboardTransform(center: { x: number; y: number; z: number }, layer: EffectParticleLayer): string {
    const rotation = this.uiSignalService.tableViewRotation();
    return (
      `translate3d(${center.x}px, ${center.y}px, ${center.z}px)` +
      ` rotateZ(${-(rotation?.z ?? 10)}deg) rotateX(${-(rotation?.x ?? 50)}deg) rotateY(${-(rotation?.y ?? 0)}deg)` +
      ` translateZ(${CAMERA_LIFT_PX}px) translate(${-layer.originX}px, ${-layer.originY}px)`
    );
  }

  private transform(sprite: EffectSprite): string {
    const parts = [`translate3d(${sprite.x}px, ${sprite.y}px, ${sprite.z}px)`];

    if (!sprite.flat) {
      const rotation = this.uiSignalService.tableViewRotation();
      parts.push(
        `rotateZ(${-(rotation?.z ?? 10)}deg)`,
        `rotateX(${-(rotation?.x ?? 50)}deg)`,
        `rotateY(${-(rotation?.y ?? 0)}deg)`,
        `translateZ(${CAMERA_LIFT_PX}px)`
      );
    }
    // 板ポリ面に入ってからずらすので、カメラを回しても組んだ形が保たれる。
    if (sprite.offsetX !== 0 || sprite.offsetY !== 0) {
      parts.push(`translate(${sprite.offsetX.toFixed(2)}px, ${sprite.offsetY.toFixed(2)}px)`);
    }
    if (sprite.rotate !== 0) parts.push(`rotateZ(${sprite.rotate.toFixed(2)}deg)`);
    parts.push('translate(-50%, -50%)');

    return parts.join(' ');
  }

  private hiddenIdentifiersOf(identifiers: readonly string[]): ReadonlySet<string> {
    const hidden = new Set<string>();
    for (const identifier of identifiers) {
      const character = this.objectStore.get<GameCharacter>(identifier);
      if (character instanceof GameCharacter && !this.visionService.isTokenVisible(character)) {
        hidden.add(identifier);
      }
    }
    return hidden;
  }

  private centerOf(identifier: string, gridSize: number): { x: number; y: number; z: number } | null {
    const object = this.objectStore.get<TabletopObject>(identifier);
    if (!(object instanceof TabletopObject) || !object.isVisibleOnTable) return null;
    const size = (object as { size?: number }).size;
    const half = (gridSize * (typeof size === 'number' && size > 0 ? size : 1)) / 2;
    return { x: object.location.x + half, y: object.location.y + half, z: object.posZ };
  }
}
