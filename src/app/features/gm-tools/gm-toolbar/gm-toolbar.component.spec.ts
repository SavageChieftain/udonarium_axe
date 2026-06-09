import { ComponentFixture, TestBed } from '@angular/core/testing';
import { VisionService } from '@axe/application/tabletop/vision.service';
import { PanelService } from '@axe/application/ui/panel.service';
import { GameObjectListPanelComponent } from '@axe/features/gm-object-list/game-object-list-panel.component';
import { GmToolbarComponent } from '@axe/features/gm-tools/gm-toolbar/gm-toolbar.component';
import { NpcBarService } from '@axe/features/gm-tools/npc-bar/npc-bar.service';
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

  it('openObjectList でオブジェクト一覧パネルを開く', () => {
    (component as unknown as { openObjectList: () => void }).openObjectList();
    expect(panelStub.open).toHaveBeenCalledWith(
      GameObjectListPanelComponent,
      expect.objectContaining({ width: 460, height: 620 })
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
});
