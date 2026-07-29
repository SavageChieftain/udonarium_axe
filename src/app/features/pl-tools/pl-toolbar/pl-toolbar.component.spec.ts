import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ObjectChangeService } from '@axe/application/sync/object-change.service';
import { PanelService } from '@axe/application/ui/panel.service';
import { ObjectStore } from '@axe/core/sync/object-store';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { PeerRole } from '@axe/domain/peer/peer-role';
import { HandRailService } from '@axe/features/pl-tools/hand-rail/hand-rail.service';
import { OwnedCharacterListPanelComponent } from '@axe/features/pl-tools/owned-character-list/owned-character-list-panel.component';
import { PlToolbarComponent } from '@axe/features/pl-tools/pl-toolbar/pl-toolbar.component';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('PlToolbarComponent', () => {
  let component: PlToolbarComponent;
  let fixture: ComponentFixture<PlToolbarComponent>;
  let panelStub: { open: ReturnType<typeof vi.fn> };
  let objectChange: ObjectChangeService;
  let store: ObjectStore;

  beforeEach(async () => {
    panelStub = { open: vi.fn() };
    await TestBed.configureTestingModule({
      imports: [PlToolbarComponent],
      providers: [...TEST_PROVIDERS],
    }).compileComponents();
    TestBed.overrideProvider(PanelService, { useValue: panelStub });
    fixture = TestBed.createComponent(PlToolbarComponent);
    component = fixture.componentInstance;
    objectChange = TestBed.inject(ObjectChangeService);
    store = ObjectStore.instance;
    PeerCursor.createMyCursor();
  });

  afterEach(() => {
    store.getObjects().forEach((object) => store.delete(object, false));
    store.clearDeleteHistory();
    PeerCursor.myCursor = null!;
  });

  function bar(): HTMLElement | null {
    return fixture.nativeElement.querySelector('.pl-toolbar');
  }

  function setRole(role: PeerRole): void {
    PeerCursor.myCursor.role = role;
    objectChange.notifyChanged(PeerCursor.myCursor.identifier);
  }

  it('openOwnedCharacterList で所有キャラ一覧パネルを開く', () => {
    (component as unknown as { openOwnedCharacterList: () => void }).openOwnedCharacterList();
    expect(panelStub.open).toHaveBeenCalledWith(
      OwnedCharacterListPanelComponent,
      expect.objectContaining({ width: 420, height: 560 })
    );
  });

  it('操作対象が未設定なら範囲ボタンは一覧パネルを開き、形状メニューは出さない', () => {
    const toolbar = component as unknown as { toggleRangeMenu: () => void; rangeOpen: () => boolean };

    toolbar.toggleRangeMenu();

    expect(toolbar.rangeOpen()).toBe(false);
    expect(panelStub.open).toHaveBeenCalledWith(
      OwnedCharacterListPanelComponent,
      expect.objectContaining({ width: 420, height: 560 })
    );
  });

  it('toggleHandRail で手札レールの開閉を切り替える', () => {
    const rail = TestBed.inject(HandRailService);
    const toolbar = component as unknown as { toggleHandRail: () => void };

    expect(rail.isOpen()).toBe(false);
    toolbar.toggleHandRail();
    expect(rail.isOpen()).toBe(true);
    toolbar.toggleHandRail();
    expect(rail.isOpen()).toBe(false);
  });

  it('PL のときだけツールバーを表示する', async () => {
    setRole(PeerRole.Player);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(bar()).not.toBeNull();

    setRole(PeerRole.GameMaster);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(bar()).toBeNull();

    setRole(PeerRole.Guest);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(bar()).toBeNull();
  });

  it('ロール切り替えを跨いでドラッグした位置を保持する', async () => {
    setRole(PeerRole.Player);
    fixture.detectChanges();
    await fixture.whenStable();

    const el = bar();
    expect(el).not.toBeNull();
    el!.style.left = '360px';
    el!.style.top = '240px';

    setRole(PeerRole.GameMaster);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(bar()).toBeNull();

    setRole(PeerRole.Player);
    fixture.detectChanges();
    await fixture.whenStable();

    const restored = bar();
    expect(restored).not.toBeNull();
    expect(restored!.style.left).toBe('360px');
    expect(restored!.style.top).toBe('240px');
  });
});
