import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ObjectChangeService } from '@axe/application/sync/object-change.service';
import { PanelService } from '@axe/application/ui/panel.service';
import { ChatTab } from '@axe/domain/chat/chat-tab';
import { ChatTabList } from '@axe/domain/chat/chat-tab-list';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { ChatStreamComponent } from '@axe/features/chat/chat-stream/chat-stream.component';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

describe('ChatStreamComponent', () => {
  let fixture: ComponentFixture<ChatStreamComponent>;
  let component: ChatStreamComponent;
  let tab: ChatTab;

  beforeEach(async () => {
    PeerCursor.createMyCursor();
    TestBed.configureTestingModule({
      imports: [ChatStreamComponent],
      providers: [...TEST_PROVIDERS],
    }).compileComponents();
    tab = ChatTabList.instance.addChatTab('メインタブ');
    fixture = TestBed.createComponent(ChatStreamComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    fixture?.destroy();
    tab?.destroy();
  });

  it('shows the lines of the tab it was opened on', () => {
    tab.addMessage({ from: 'alice', name: 'アリス', text: 'なんだって！？', timestamp: 1000 });
    component.tabIdentifier.set(tab.identifier);
    fixture.detectChanges();

    expect(component.chatTab()).toBe(tab);
    expect(fixture.nativeElement.textContent).toContain('なんだって！？');
  });

  it('offers none of the buttons that hover over a line', () => {
    tab.addMessage({ from: 'alice', name: 'アリス', text: 'やあ', timestamp: 1000 });
    component.tabIdentifier.set(tab.identifier);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('chat-message .material-icons')).toHaveLength(0);
  });

  it('stays quiet on a tab with nothing said in it', () => {
    component.tabIdentifier.set(tab.identifier);
    fixture.detectChanges();

    // The sample lines are there to show a newcomer what a conversation looks like.
    expect(fixture.nativeElement.querySelectorAll('chat-message')).toHaveLength(0);
  });

  describe('the buttons it puts in the panel bar', () => {
    it('offers following the newest line and taking the box off', () => {
      component.tabIdentifier.set(tab.identifier);
      fixture.detectChanges();

      const panelService = TestBed.inject(PanelService);
      expect(panelService.headerControls().map((control) => control.icon)).toEqual([
        'vertical_align_bottom',
        'opacity',
      ]);
      expect(panelService.headerControls()[0].active).toBe(true);
    });

    it('takes the box off the panel and puts it back', () => {
      component.tabIdentifier.set(tab.identifier);
      fixture.detectChanges();
      const panelService = TestBed.inject(PanelService);

      panelService.headerControls()[1].press();
      fixture.detectChanges();

      expect(panelService.isGhost()).toBe(true);
      expect(panelService.headerControls()[1].active).toBe(true);

      panelService.headerControls()[1].press();
      fixture.detectChanges();

      expect(panelService.isGhost()).toBe(false);
    });
  });

  describe('following the newest line', () => {
    it('carries the window down as a line arrives', () => {
      component.tabIdentifier.set(tab.identifier);
      fixture.detectChanges();
      const emit = vi.spyOn(TestBed.inject(PanelService).scrollToBottom$, 'emit');

      TestBed.inject(ObjectChangeService).messageAdded$.emit({
        tabIdentifier: tab.identifier,
        messageIdentifier: 'message-1',
      });

      expect(emit).toHaveBeenCalled();
    });

    it('stays where it was put once following is turned off', () => {
      component.tabIdentifier.set(tab.identifier);
      fixture.detectChanges();
      TestBed.inject(PanelService).headerControls()[0].press();
      fixture.detectChanges();
      const emit = vi.spyOn(TestBed.inject(PanelService).scrollToBottom$, 'emit');

      TestBed.inject(ObjectChangeService).messageAdded$.emit({
        tabIdentifier: tab.identifier,
        messageIdentifier: 'message-1',
      });

      expect(component.followsLatest()).toBe(false);
      expect(emit).not.toHaveBeenCalled();
    });

    it('leaves another tab alone', () => {
      component.tabIdentifier.set(tab.identifier);
      fixture.detectChanges();
      const emit = vi.spyOn(TestBed.inject(PanelService).scrollToBottom$, 'emit');

      TestBed.inject(ObjectChangeService).messageAdded$.emit({
        tabIdentifier: 'another-tab',
        messageIdentifier: 'message-1',
      });

      expect(emit).not.toHaveBeenCalled();
    });
  });

  it('draws no rule between the lines once the box is off', () => {
    tab.addMessage({ from: 'alice', name: 'アリス', text: 'やあ', timestamp: 1000 });
    component.tabIdentifier.set(tab.identifier);
    fixture.detectChanges();

    const log = fixture.nativeElement.querySelector('div') as HTMLElement;
    expect(log.className).not.toContain('border-b-0');

    TestBed.inject(PanelService).headerControls()[1].press();
    fixture.detectChanges();

    expect(log.className).toContain('[&_.message]:border-b-0!');
  });

  it('says so once the tab it was opened on is gone', () => {
    component.tabIdentifier.set('no-such-tab');
    fixture.detectChanges();

    expect(component.chatTab()).toBeNull();
    expect(fixture.nativeElement.querySelectorAll('chat-tab')).toHaveLength(0);
  });
});
