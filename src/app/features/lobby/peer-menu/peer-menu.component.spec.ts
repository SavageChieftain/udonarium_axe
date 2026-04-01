import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { PeerMenuComponent } from '@axe/features/lobby/peer-menu/peer-menu.component';
import { expectPanelDragRecovery, PanelDragTestHostComponent } from '@axe/testing/panel-drag-recovery';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

describe('PeerMenuComponent', () => {
  let component: PeerMenuComponent;
  let fixture: ComponentFixture<PeerMenuComponent>;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [PeerMenuComponent, PanelDragTestHostComponent],
      providers: [...TEST_PROVIDERS],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PeerMenuComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('ChangeDetectorRefを使用していないこと', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((component as any).changeDetector).toBeUndefined();
  });

  it('myTimeがsignalであること', () => {
    expect(typeof component.myTime).toBe('function');
  });

  it('global dragging が解除されたら panel の pointer-events-none も解除されること', async () => {
    await expectPanelDragRecovery(PeerMenuComponent, {
      beforeOpen: () => {
        PeerCursor.createMyCursor();
      },
    });
  });

  it('プライベート接続UIを表示しないこと', () => {
    PeerCursor.createMyCursor();
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.textContent).not.toContain('プライベート接続');
  });
});
