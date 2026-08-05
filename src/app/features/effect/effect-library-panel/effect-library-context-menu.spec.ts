import { ContextMenuAction } from '@axe/application/ui/context-menu.service';
import { EffectPreset } from '@axe/domain/effect/effect-preset';
import { buildEffectLibraryContextMenu } from '@axe/features/effect/effect-library-panel/effect-library-context-menu';

describe('buildEffectLibraryContextMenu()', () => {
  const t = ((key: string) => key) as never;

  function makePreset(): EffectPreset {
    const preset = new EffectPreset('preset');
    preset.name = '爆炎';
    return preset;
  }

  function names(menu: ContextMenuAction[]): string[] {
    return menu.map((entry) => entry.name);
  }

  it('試し撃ち・編集・複製・削除を並べること', () => {
    const menu = buildEffectLibraryContextMenu(
      makePreset(),
      {
        onEdit: () => undefined,
        onDuplicate: () => undefined,
        onPreview: () => undefined,
        onInsertToken: () => undefined,
        onPlaceField: () => undefined,
        onRemove: () => undefined,
      },
      t
    );

    expect(names(menu).filter((name) => name.length > 0)).toEqual([
      'feature.effect.preview',
      'feature.effect.insertToken',
      'feature.effect.placeField',
      'feature.effect.editPreset',
      'feature.effect.duplicatePreset',
      'feature.effect.removePreset',
    ]);
  });

  it('選んだ項目だけを呼ぶこと', () => {
    const called: string[] = [];
    const menu = buildEffectLibraryContextMenu(
      makePreset(),
      {
        onEdit: () => called.push('edit'),
        onDuplicate: () => called.push('duplicate'),
        onPreview: () => called.push('preview'),
        onInsertToken: () => called.push('insertToken'),
        onPlaceField: () => called.push('placeField'),
        onRemove: () => called.push('remove'),
      },
      t
    );

    for (const entry of menu) entry.action?.();

    expect(called).toEqual(['preview', 'insertToken', 'placeField', 'edit', 'duplicate', 'remove']);
  });
});
