import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChatTab } from '@axe/class/chat-tab';
import { PanelService } from '@axe/service/panel.service';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

import { ChatTabComponent } from './chat-tab.component';

describe('ChatTabComponent', () => {
  let component: ChatTabComponent;
  let fixture: ComponentFixture<ChatTabComponent>;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [ChatTabComponent],
      providers: [...TEST_PROVIDERS],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ChatTabComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('ngOnInitでNG0203が発生しないこと（effectがコンストラクタで呼ばれている）', () => {
    let ng0203Thrown = false;
    try {
      component.ngOnInit();
    } catch (e: unknown) {
      if (String(e).includes('NG0203')) {
        ng0203Thrown = true;
      }
    }
    expect(ng0203Thrown).toBe(false);
  });

  describe('ngOnChanges', () => {
    it('scrollablePanelが存在する場合はresetMessagesが同期的に呼ばれること', () => {
      const panelService = TestBed.inject(PanelService);
      const mockPanel = document.createElement('div');
      Object.defineProperty(mockPanel, 'clientHeight', { value: 400 });
      panelService.scrollablePanel = mockPanel as unknown as HTMLDivElement;

      const chatTab = new ChatTab();
      chatTab.initialize();
      component.chatTab = chatTab;

      const spy = vi.spyOn(component, 'resetMessages' as never);
      component.ngOnChanges();

      expect(spy).toHaveBeenCalled();
    });

    it('scrollablePanelがnullの場合はresetMessagesがマイクロタスクで呼ばれること', async () => {
      const panelService = TestBed.inject(PanelService);
      panelService.scrollablePanel = null!;

      const chatTab = new ChatTab();
      chatTab.initialize();
      component.chatTab = chatTab;

      const spy = vi.spyOn(component, 'resetMessages' as never);
      component.ngOnChanges();

      expect(spy).not.toHaveBeenCalled();
      await new Promise<void>((resolve) => queueMicrotask(resolve));
      expect(spy).toHaveBeenCalled();
    });
  });
});
