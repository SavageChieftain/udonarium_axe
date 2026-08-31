import { ComponentFixture, TestBed } from '@angular/core/testing';
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
    component.tabIdentifier = tab.identifier;
    fixture.detectChanges();

    expect(component.chatTab()).toBe(tab);
    expect(fixture.nativeElement.textContent).toContain('なんだって！？');
  });

  it('offers none of the buttons that hover over a line', () => {
    tab.addMessage({ from: 'alice', name: 'アリス', text: 'やあ', timestamp: 1000 });
    component.tabIdentifier = tab.identifier;
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('chat-message .material-icons')).toHaveLength(0);
  });

  it('stays quiet on a tab with nothing said in it', () => {
    component.tabIdentifier = tab.identifier;
    fixture.detectChanges();

    // The sample lines are there to show a newcomer what a conversation looks like.
    expect(fixture.nativeElement.querySelectorAll('chat-message')).toHaveLength(0);
  });

  it('says so once the tab it was opened on is gone', () => {
    component.tabIdentifier = 'no-such-tab';
    fixture.detectChanges();

    expect(component.chatTab()).toBeNull();
    expect(fixture.nativeElement.querySelectorAll('chat-tab')).toHaveLength(0);
  });
});
