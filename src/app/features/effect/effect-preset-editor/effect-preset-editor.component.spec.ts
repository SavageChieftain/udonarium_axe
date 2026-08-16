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

  it('says so when the preset is not there', () => {
    fixture.componentInstance.presetIdentifier.set('');
    fixture.detectChanges();

    expect(text()).toContain('エフェクトが見つかりません');
  });

  it('edits the name and the colour', () => {
    fixture.detectChanges();

    const name = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>('input[name="effect-name"]')!;
    name.value = '大爆発';
    name.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(preset.name).toBe('大爆発');
  });

  it('hides the fields the kind has no use for', () => {
    fixture.detectChanges();
    // An explosion has neither a number of shots nor a line of attack.
    expect(text()).not.toContain('弾数');
    expect(text()).not.toContain('太刀筋');

    preset.kind = 'projectile';
    change.notifyChanged(preset.identifier);
    fixture.detectChanges();

    expect(text()).toContain('弾数');
    expect(text()).toContain('着弾演出');
  });

  it('shows the limit only for something that takes several targets', () => {
    fixture.detectChanges();
    expect(text()).not.toContain('上限');

    preset.targeting = 'multi';
    change.notifyChanged(preset.identifier);
    fixture.detectChanges();

    expect(text()).toContain('上限');
  });

  it('says so when a test fire has nothing to aim at', () => {
    fixture.detectChanges();

    const preview = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('button')
    ).find((button) => button.textContent?.includes('試し撃ち'))!;
    preview.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.notice()).toContain('対象がいません');
  });

  describe('building a run out of stages', () => {
    function component(): {
      addStage(role: string): void;
      moveStage(index: number, offset: number): void;
      removeStage(index: number): void;
      editStage(index: number, patch: Record<string, unknown>): void;
      addBranch(index: number, role: string): void;
      stages(): { role: string; kind: string }[];
    } {
      return fixture.componentInstance as unknown as ReturnType<typeof component>;
    }

    it('draws one look until a stage is added', () => {
      fixture.detectChanges();

      expect(component().stages()).toEqual([]);
      expect(preset.isStaged).toBe(false);
    });

    it('writes an added stage onto the effect', () => {
      fixture.detectChanges();

      component().addStage('travel');

      expect(preset.isStaged).toBe(true);
      expect(preset.stageList[0]).toMatchObject({ role: 'travel', kind: 'projectile' });
    });

    it('reads the run back in the order it happens', () => {
      fixture.detectChanges();
      component().addStage('travel');
      component().addStage('impact');

      component().moveStage(0, 1);

      expect(
        component()
          .stages()
          .map((stage) => stage.role)
      ).toEqual(['impact', 'travel']);
    });

    it('takes a stage out again', () => {
      fixture.detectChanges();
      component().addStage('travel');

      component().removeStage(0);

      expect(preset.isStaged).toBe(false);
    });

    it('puts the look back where it no longer suits the role', () => {
      fixture.detectChanges();
      component().addStage('travel');

      component().editStage(0, { role: 'field' });

      expect(component().stages()[0].kind).toBe('flame');
    });

    it('gives a stage that throws something to throw', () => {
      fixture.detectChanges();

      component().addStage('spawn');

      expect(preset.stageList[0].children).toHaveLength(1);
      expect(preset.stageList[0].branches).toBe(3);
    });

    it('adds to the chain each branch follows', () => {
      fixture.detectChanges();
      component().addStage('spawn');

      component().addBranch(0, 'travel');

      expect(preset.stageList[0].children?.map((child) => child.role)).toEqual(['impact', 'travel']);
    });

    it('tells the room every time the run changes', () => {
      const notify = vi.spyOn(change, 'notifyChanged');
      fixture.detectChanges();

      component().addStage('impact');

      expect(notify).toHaveBeenCalledWith(preset.identifier);
    });
  });
});
