import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EffectPlaybackService } from '@axe/application/effect/effect-playback.service';
import { ObjectStore } from '@axe/core/sync/object-store';
import { EffectPreset } from '@axe/domain/effect/effect-preset';
import { TableEffectOverlayComponent } from '@axe/features/effect/table-effect-overlay/table-effect-overlay.component';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

describe('TableEffectOverlayComponent', () => {
  let fixture: ComponentFixture<TableEffectOverlayComponent>;
  let playback: EffectPlaybackService;
  let preset: EffectPreset;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TableEffectOverlayComponent],
      providers: [...TEST_PROVIDERS],
    });
    fixture = TestBed.createComponent(TableEffectOverlayComponent);
    playback = TestBed.inject(EffectPlaybackService);

    preset = new EffectPreset();
    preset.kind = 'burst';
    preset.durationMs = 5000;
    preset.staggerMs = 0;
    ObjectStore.instance.add(preset, false);
  });

  afterEach(() => {
    ObjectStore.instance.remove(preset);
  });

  /** 配置を担う外側の層だけを取る。内側は見た目と CSS アニメーション用。 */
  function outerLayers(): HTMLElement[] {
    return Array.from((fixture.nativeElement as HTMLElement).querySelectorAll(':scope > div'));
  }

  it('再生中のエフェクトが無ければ何も描かないこと', () => {
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('div')).toHaveLength(0);
  });

  it('発火を受けたらスプライトを描くこと', () => {
    playback.play({
      presetIdentifier: preset.identifier,
      targets: [{ identifier: 'char', x: 100, y: 200, z: 0 }],
      seed: 3,
    });
    fixture.detectChanges();

    const elements = outerLayers();
    expect(elements.length).toBeGreaterThan(0);
    for (const element of elements) {
      expect(element.style.pointerEvents).toBe('none');
      expect(element.style.transform).toContain('translate3d(');
    }
  });

  it('寝かせるスプライトにはカメラ向きの回転を掛けないこと', () => {
    // 氷結は正対する結晶と、寝かせる霜の輪の両方を出す。
    preset.kind = 'frost';
    playback.play({
      presetIdentifier: preset.identifier,
      targets: [{ identifier: 'char', x: 0, y: 0, z: 0 }],
      seed: 3,
    });
    playback.now.set(playback.activeCasts()[0].startedAt + 1000);
    fixture.detectChanges();

    const transforms = outerLayers().map((element) => element.style.transform);

    expect(transforms.some((transform) => !transform.includes('rotateX('))).toBe(true);
    expect(transforms.some((transform) => transform.includes('rotateX('))).toBe(true);
  });

  it('盤面の 3D を潰す合成モードを DOM 側で使わないこと', () => {
    playback.play({
      presetIdentifier: preset.identifier,
      targets: [{ identifier: 'char', x: 0, y: 0, z: 0 }],
      seed: 3,
    });
    fixture.detectChanges();

    const elements = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('div'));

    // 加算合成は canvas の中でやる。DOM に mix-blend-mode / filter を置くと
    // preserve-3d が平坦化され、盤面のコマが寝てしまう。
    expect(elements.every((element) => element.style.mixBlendMode === '')).toBe(true);
    expect(elements.every((element) => element.style.filter === '')).toBe(true);
  });

  it('光る粒は対象ごとの canvas に描くこと', () => {
    playback.play({
      presetIdentifier: preset.identifier,
      targets: [
        { identifier: 'a', x: 0, y: 0, z: 0 },
        { identifier: 'b', x: 200, y: 0, z: 0 },
      ],
      seed: 3,
    });
    fixture.detectChanges();

    const canvases = (fixture.nativeElement as HTMLElement).querySelectorAll('effect-canvas');
    expect(canvases).toHaveLength(2);
    for (const host of Array.from(canvases)) {
      expect((host as HTMLElement).style.transform).toContain('translate3d(');
      expect(host.querySelector('canvas')).not.toBeNull();
    }
  });
});
