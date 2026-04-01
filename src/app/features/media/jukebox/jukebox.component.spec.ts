import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ObjectStore } from '@axe/core/sync/object-store';
import { CutInLauncher } from '@axe/domain/media/cut-in-launcher';
import { Jukebox } from '@axe/domain/media/Jukebox';
import { JukeboxComponent } from '@axe/features/media/jukebox/jukebox.component';
import { expectPanelDragRecovery, PanelDragTestHostComponent } from '@axe/testing/panel-drag-recovery';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

describe('JukeboxComponent', () => {
  let component: JukeboxComponent;
  let fixture: ComponentFixture<JukeboxComponent>;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [JukeboxComponent, PanelDragTestHostComponent],
      providers: [...TEST_PROVIDERS],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(JukeboxComponent);
    component = fixture.componentInstance;
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });

  it('global dragging が解除されたら panel の pointer-events-none も解除されること', async () => {
    await expectPanelDragRecovery(JukeboxComponent, {
      beforeOpen: () => {
        if (!ObjectStore.instance.get<Jukebox>('Jukebox')) {
          new Jukebox('Jukebox');
        }
        if (!ObjectStore.instance.get<CutInLauncher>('CutInLauncher')) {
          const cutInLauncher = new CutInLauncher('CutInLauncher');
          cutInLauncher.initialize();
        }
      },
    });
  });
});
