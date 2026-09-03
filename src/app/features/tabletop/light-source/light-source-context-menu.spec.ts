import { TestBed } from '@angular/core/testing';
import { ObjectStore } from '@axe/core/sync/object-store';
import { LightSource } from '@axe/domain/tabletop/light-source';
import { LIGHT_PRESETS, LightPreset } from '@axe/domain/tabletop/vision-types';
import { buildLightSourceContextMenu } from '@axe/features/tabletop/light-source/light-source-context-menu';

const t = (key: string) => key;

function findByName(menu: ReturnType<typeof buildLightSourceContextMenu>, fragment: string) {
  return menu.find((item) => 'name' in item && item.name.includes(fragment));
}

describe('buildLightSourceContextMenu', () => {
  let store: ObjectStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    store = ObjectStore.instance;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('switches the light on and off', () => {
    const light = LightSource.create('L');
    light.lightEnabled = true;
    const off = findByName(
      buildLightSourceContextMenu(light, 50, [], () => undefined, t),
      'turnOff'
    );
    expect(off).toBeTruthy();
    (off as { action: () => void }).action();
    expect(light.lightEnabled).toBe(false);
  });

  it('takes the values of a preset and lights it', () => {
    const light = LightSource.create('L');
    light.lightEnabled = false;
    const presetMenu = findByName(
      buildLightSourceContextMenu(light, 50, [], () => undefined, t),
      'preset'
    ) as {
      subActions: { name: string; action: () => void }[];
    };
    const torch = presetMenu.subActions.find((s) => s.name.includes(LightPreset.TORCH))!;
    torch.action();
    expect(light.lightPreset).toBe(LightPreset.TORCH);
    expect(light.lightBrightRadius).toBe(LIGHT_PRESETS[LightPreset.TORCH].brightRadius);
    expect(light.lightEnabled).toBe(true);
  });

  it('takes it out of the store on delete', () => {
    const light = LightSource.create('L');
    const del = findByName(
      buildLightSourceContextMenu(light, 50, [], () => undefined, t),
      'delete'
    ) as { action: () => void };
    del.action();
    expect(store.get(light.identifier)).toBeNull();
  });
});
