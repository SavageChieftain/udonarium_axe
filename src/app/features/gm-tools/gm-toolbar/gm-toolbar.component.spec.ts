import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ObjectChangeService } from '@axe/application/sync/object-change.service';
import { VisionService } from '@axe/application/tabletop/vision.service';
import { PanelService } from '@axe/application/ui/panel.service';
import { WidgetVisibilityService } from '@axe/application/ui/widget-visibility.service';
import { ObjectStore } from '@axe/core/sync/object-store';
import { Card } from '@axe/domain/card/card';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { PeerRole } from '@axe/domain/peer/peer-role';
import { GameObjectListPanelComponent } from '@axe/features/gm-object-list/game-object-list-panel.component';
import { GmToolbarComponent } from '@axe/features/gm-tools/gm-toolbar/gm-toolbar.component';
import { NpcBarService } from '@axe/features/gm-tools/npc-bar/npc-bar.service';
import { MapEditorPanelComponent } from '@axe/features/map-editor/editor/map-editor-panel.component';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

describe('GmToolbarComponent', () => {
  let component: GmToolbarComponent;
  let fixture: ComponentFixture<GmToolbarComponent>;
  let panelStub: { open: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    panelStub = { open: vi.fn() };
    await TestBed.configureTestingModule({
      imports: [GmToolbarComponent],
      providers: [...TEST_PROVIDERS],
    }).compileComponents();
    TestBed.overrideProvider(PanelService, { useValue: panelStub });
    fixture = TestBed.createComponent(GmToolbarComponent);
    component = fixture.componentInstance;
  });

  it('隠した録画ウィジェットを出し直せること', () => {
    PeerCursor.myCursor = Object.assign(new PeerCursor('me'), { role: PeerRole.GameMaster });
    const widgets = TestBed.inject(WidgetVisibilityService);
    widgets.recording.set(false);
    fixture.detectChanges();

    const button = Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll('button')).find((candidate) =>
      candidate.textContent?.includes('radio_button_checked')
    )!;
    expect(button).toBeDefined();

    button.click();
    expect(widgets.recording()).toBe(true);
  });

  it('openObjectList でオブジェクト一覧パネルを開く', () => {
    (component as unknown as { openObjectList: () => void }).openObjectList();
    expect(panelStub.open).toHaveBeenCalledWith(
      GameObjectListPanelComponent,
      expect.objectContaining({ width: 460, height: 620 })
    );
  });

  it('openMapEditor でマップエディターパネルを開く', () => {
    (component as unknown as { openMapEditor: () => void }).openMapEditor();
    expect(panelStub.open).toHaveBeenCalledWith(
      MapEditorPanelComponent,
      expect.objectContaining({ width: 1100, height: 740 })
    );
  });

  it('toggleNpcBar で NPC バーの開閉を切り替える', () => {
    const bar = TestBed.inject(NpcBarService);
    expect(bar.isOpen()).toBe(false);
    (component as unknown as { toggleNpcBar: () => void }).toggleNpcBar();
    expect(bar.isOpen()).toBe(true);
    (component as unknown as { toggleNpcBar: () => void }).toggleNpcBar();
    expect(bar.isOpen()).toBe(false);
  });

  it('selectPersona でプレイヤー視点プレビューを設定/解除する', () => {
    const vision = TestBed.inject(VisionService);
    const persona = component as unknown as { selectPersona: (id: string | null) => void };

    expect(vision.previewAsUserId()).toBeNull();
    persona.selectPersona('player-1');
    expect(vision.previewAsUserId()).toBe('player-1');
    expect(vision.viewer().isGameMaster).toBe(false);

    persona.selectPersona(null);
    expect(vision.previewAsUserId()).toBeNull();
  });

  it('togglePersona でドロップダウンの開閉を切り替える', () => {
    const persona = component as unknown as { togglePersona: () => void; personaOpen: () => boolean };
    expect(persona.personaOpen()).toBe(false);
    persona.togglePersona();
    expect(persona.personaOpen()).toBe(true);
  });

  describe('releaseOrphanedOwnership', () => {
    let store: ObjectStore;

    beforeEach(() => {
      store = ObjectStore.instance;
    });

    afterEach(() => {
      store.getObjects().forEach((obj) => store.delete(obj, false));
      store.clearDeleteHistory();
      vi.unstubAllGlobals();
    });

    it('確認後、オフラインオーナーが持つ所有を解放する', () => {
      const card = Card.create('カード', 'front.png', 'back.png');
      card.owner = 'ghost-user';
      vi.stubGlobal(
        'confirm',
        vi.fn(() => true)
      );

      (component as unknown as { releaseOrphanedOwnership: () => void }).releaseOrphanedOwnership();

      expect(card.owner).toBe('');
    });

    it('確認をキャンセルした場合は解放しない', () => {
      const card = Card.create('カード', 'front.png', 'back.png');
      card.owner = 'ghost-user';
      vi.stubGlobal(
        'confirm',
        vi.fn(() => false)
      );

      (component as unknown as { releaseOrphanedOwnership: () => void }).releaseOrphanedOwnership();

      expect(card.owner).toBe('ghost-user');
    });
  });

  describe('ロール切り替え時のツールバー位置', () => {
    let objectChange: ObjectChangeService;
    let store: ObjectStore;

    beforeEach(() => {
      store = ObjectStore.instance;
      objectChange = TestBed.inject(ObjectChangeService);
      PeerCursor.createMyCursor();
      PeerCursor.myCursor.role = PeerRole.GameMaster;
    });

    afterEach(() => {
      store.getObjects().forEach((obj) => store.delete(obj, false));
      store.clearDeleteHistory();
      PeerCursor.myCursor = null!;
    });

    function bar(): HTMLElement | null {
      return fixture.nativeElement.querySelector('.npc-bar-dropzone');
    }

    function setRole(role: PeerRole): void {
      PeerCursor.myCursor.role = role;
      objectChange.notifyChanged(PeerCursor.myCursor.identifier);
    }

    it('GM→PL→GM の切り替え後もドラッグした位置を保持する', async () => {
      fixture.detectChanges();
      await fixture.whenStable();
      const el = bar();
      expect(el).not.toBeNull();

      el!.style.left = '480px';
      el!.style.top = '320px';

      setRole(PeerRole.Player);
      fixture.detectChanges();
      await fixture.whenStable();
      expect(bar()).toBeNull();

      setRole(PeerRole.GameMaster);
      fixture.detectChanges();
      await fixture.whenStable();

      const restored = bar();
      expect(restored).not.toBeNull();
      expect(restored!.style.left).toBe('480px');
      expect(restored!.style.top).toBe('320px');
    });
  });
});
