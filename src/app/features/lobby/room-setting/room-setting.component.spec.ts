import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { RoomSettingComponent } from '@axe/features/lobby/room-setting/room-setting.component';
import { expectPanelDragRecovery, PanelDragTestHostComponent } from '@axe/testing/panel-drag-recovery';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

describe('RoomSettingComponent', () => {
  let component: RoomSettingComponent;
  let fixture: ComponentFixture<RoomSettingComponent>;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [RoomSettingComponent, PanelDragTestHostComponent],
      providers: [...TEST_PROVIDERS],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(RoomSettingComponent);
    component = fixture.componentInstance;
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });

  it('global dragging が解除されたら panel の pointer-events-none も解除されること', async () => {
    await expectPanelDragRecovery(RoomSettingComponent, {
      beforeOpen: () => {
        PeerCursor.createMyCursor();
      },
    });
  });
});
