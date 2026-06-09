import { ComponentFixture, TestBed } from '@angular/core/testing';
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
});
