import { GameObjectInventoryService } from '@axe/application/inventory/game-object-inventory.service';
import { ContextMenuType } from '@axe/application/ui/context-menu.service';
import { TextNote } from '@axe/domain/tabletop/text-note';
import { buildTextNoteContextMenu } from '@axe/features/tabletop/text-note/text-note-context-menu';
import { createSyncTranslate } from '@axe/testing/transloco-testing';

const t = createSyncTranslate('ja');

function makeService(): GameObjectInventoryService {
  return { notifyInventoryUpdate: vi.fn() } as unknown as GameObjectInventoryService;
}

interface MutableTextNote {
  altitude: number;
  isAltitudeIndicate: boolean;
  isLock: boolean;
  isUpright: boolean;
  location: { x: number; y: number };
  destroy: ReturnType<typeof vi.fn>;
  clone: ReturnType<typeof vi.fn>;
}

function makeTextNote(
  overrides: Partial<MutableTextNote & { isLock: boolean; isUpright: boolean; isAltitudeIndicate: boolean }> = {}
): MutableTextNote {
  return {
    altitude: 0,
    isAltitudeIndicate: false,
    isLock: false,
    isUpright: false,
    location: { x: 0, y: 0 },
    destroy: vi.fn(),
    clone: vi.fn(() => ({ location: { x: 0, y: 0 }, toTopmost: vi.fn() })),
    ...overrides,
  };
}

const names = (a: { name: string }[]) => a.map((x) => x.name);

describe('buildTextNoteContextMenu()', () => {
  it('先頭は「メモを編集」、高度設定・直立切替・固定切替・コピー・削除を含む', () => {
    const note = makeTextNote();
    const menu = buildTextNoteContextMenu(
      note as unknown as TextNote,
      50,
      makeService(),
      { onSetUpright: vi.fn(), onShowDetail: vi.fn() },
      t
    );
    expect(menu[0].name).toBe('メモを編集');
    const altitude = menu.find((m) => m.name === '高度設定');
    expect(altitude?.subActions?.length).toBe(2);
    expect(names(menu)).toContain('固定する');
    expect(names(menu)).toContain('直立させる');
    expect(names(menu)).toContain('メモを編集');
    expect(names(menu)).toContain('コピーを作る');
    expect(names(menu)).toContain('削除する');
  });

  it('isLock=true なら「固定解除」表示、action で false にする', () => {
    const note = makeTextNote({ isLock: true });
    const menu = buildTextNoteContextMenu(
      note as unknown as TextNote,
      50,
      makeService(),
      { onSetUpright: vi.fn(), onShowDetail: vi.fn() },
      t
    );
    const unlockEntry = menu.find((m) => m.name === '固定解除');
    expect(unlockEntry).toBeDefined();
    unlockEntry!.action!();
    expect(note.isLock).toBe(false);
  });

  it('isUpright=true なら「寝かせる」表示、isUpright=false なら「直立させる」', () => {
    const standing = makeTextNote({ isUpright: true });
    const standingMenu = buildTextNoteContextMenu(
      standing as unknown as TextNote,
      50,
      makeService(),
      { onSetUpright: vi.fn(), onShowDetail: vi.fn() },
      t
    );
    expect(names(standingMenu)).toContain('寝かせる');

    const laying = makeTextNote({ isUpright: false });
    const layingMenu = buildTextNoteContextMenu(
      laying as unknown as TextNote,
      50,
      makeService(),
      { onSetUpright: vi.fn(), onShowDetail: vi.fn() },
      t
    );
    expect(names(layingMenu)).toContain('直立させる');
  });

  it('「メモを編集」が onShowDetail コールバックを呼ぶ', () => {
    const note = makeTextNote();
    const onShowDetail = vi.fn();
    const menu = buildTextNoteContextMenu(
      note as unknown as TextNote,
      50,
      makeService(),
      { onSetUpright: vi.fn(), onShowDetail },
      t
    );
    menu.find((m) => m.name === 'メモを編集')!.action!();
    expect(onShowDetail).toHaveBeenCalled();
  });

  it('「削除する」が note.destroy() を呼ぶ', () => {
    const note = makeTextNote();
    const menu = buildTextNoteContextMenu(
      note as unknown as TextNote,
      50,
      makeService(),
      { onSetUpright: vi.fn(), onShowDetail: vi.fn() },
      t
    );
    menu.find((m) => m.name === '削除する')!.action!();
    expect(note.destroy).toHaveBeenCalled();
  });

  it('権限なし時の separator はちょうど 2 つ（開く後 / 操作前）', () => {
    const note = makeTextNote();
    const menu = buildTextNoteContextMenu(
      note as unknown as TextNote,
      50,
      makeService(),
      { onSetUpright: vi.fn(), onShowDetail: vi.fn() },
      t
    );
    expect(menu.filter((m) => m.type === ContextMenuType.SEPARATOR)).toHaveLength(2);
  });
});
