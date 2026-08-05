import { EffectParticle, EffectParticleLayer } from '@axe/domain/effect/effect-particles';
import { particleTexture } from '@axe/features/effect/effect-canvas/particle-texture';

/**
 * パーティクルを canvas に描く。
 *
 * 煙は通常合成で先に敷き、光る粒は `lighter`（加算）で重ねる。
 * canvas の中の合成なので、盤面の preserve-3d には影響しない。
 */
export type TextureProvider = (shape: EffectParticle['shape'], color: string) => CanvasImageSource | null;

export function drawParticleLayer(
  context: CanvasRenderingContext2D,
  layer: EffectParticleLayer,
  pixelRatio: number,
  textureOf: TextureProvider = particleTexture
): void {
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  context.clearRect(0, 0, layer.width, layer.height);

  const solid = layer.particles.filter((particle) => particle.shape === 'smoke' || particle.shape === 'chunk');
  const lights = layer.particles.filter((particle) => particle.shape !== 'smoke' && particle.shape !== 'chunk');

  context.globalCompositeOperation = 'source-over';
  for (const particle of solid) drawParticle(context, layer, particle, textureOf);

  context.globalCompositeOperation = 'lighter';
  for (const particle of lights) drawParticle(context, layer, particle, textureOf);

  context.globalCompositeOperation = 'source-over';
  context.globalAlpha = 1;
}

function drawParticle(
  context: CanvasRenderingContext2D,
  layer: EffectParticleLayer,
  particle: EffectParticle,
  textureOf: TextureProvider
): void {
  if (particle.alpha <= 0.004 || particle.size <= 0) return;

  const texture = textureOf(particle.shape, particle.color);
  if (!texture) return;

  const width = particle.size * (particle.shape === 'streak' ? particle.stretch : 1);
  const height = particle.size * (particle.shape === 'streak' ? 1 : particle.stretch);

  context.globalAlpha = Math.min(particle.alpha, 1);
  context.translate(layer.originX + particle.x, layer.originY + particle.y);
  if (particle.angle !== 0) context.rotate(particle.angle);
  context.drawImage(texture, -width / 2, -height / 2, width, height);
  if (particle.angle !== 0) context.rotate(-particle.angle);
  context.translate(-(layer.originX + particle.x), -(layer.originY + particle.y));
}
