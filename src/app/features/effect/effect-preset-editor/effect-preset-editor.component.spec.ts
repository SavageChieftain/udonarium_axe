import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ObjectChangeService } from '@axe/application/sync/object-change.service';
import { ObjectStore } from '@axe/core/sync/object-store';
import { EffectPreset } from '@axe/domain/effect/effect-preset';
import { EffectPresetEditorComponent } from '@axe/features/effect/effect-preset-editor/effect-preset-editor.component';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

describe('EffectPresetEditorComponent', () => {
  let fixture: ComponentFixture<EffectPresetEditorComponent>;
  let preset: EffectPreset;
  let change: ObjectChangeService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [EffectPresetEditorComponent],
      providers: [...TEST_PROVIDERS],
    });
    fixture = TestBed.createComponent(EffectPresetEditorComponent);
    change = TestBed.inject(ObjectChangeService);

    preset = new EffectPreset();
    preset.name = '爆炎';
    preset.kind = 'burst';
    preset.tagName = '炎';
    ObjectStore.instance.add(preset, false);
    fixture.componentInstance.presetIdentifier.set(preset.identifier);
  });

  afterEach(() => {
    ObjectStore.instance.remove(preset);
  });

  function text(): string {
    return ((fixture.nativeElement as HTMLElement).textContent ?? '').replace(/\s+/g, ' ');
  }

  it('プリセットが無ければ見つからないと出すこと', () => {
    fixture.componentInstance.presetIdentifier.set('');
    fixture.detectChanges();

    expect(text()).toContain('エフェクトが見つかりません');
  });

  it('名前と色を編集できること', () => {
    fixture.detectChanges();

    const name = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>('input[name="effect-name"]')!;
    name.value = '大爆発';
    name.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(preset.name).toBe('大爆発');
  });

  it('種類に関係ない項目を隠すこと', () => {
    fixture.detectChanges();
    // 爆発に弾数や太刀筋は無い。
    expect(text()).not.toContain('弾数');
    expect(text()).not.toContain('太刀筋');

    preset.kind = 'projectile';
    change.notifyChanged(preset.identifier);
    fixture.detectChanges();

    expect(text()).toContain('弾数');
    expect(text()).toContain('着弾演出');
  });

  it('複数対象のときだけ上限を出すこと', () => {
    fixture.detectChanges();
    expect(text()).not.toContain('上限');

    preset.targeting = 'multi';
    change.notifyChanged(preset.identifier);
    fixture.detectChanges();

    expect(text()).toContain('上限');
  });

  it('対象がいなければ試し撃ちで案内を出すこと', () => {
    fixture.detectChanges();

    const preview = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('button')
    ).find((button) => button.textContent?.includes('試し撃ち'))!;
    preview.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.notice()).toContain('対象がいません');
  });
});
