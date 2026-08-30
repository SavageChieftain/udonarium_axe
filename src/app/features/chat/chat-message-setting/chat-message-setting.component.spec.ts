import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChatPreferencesService } from '@axe/application/chat/chat-preferences.service';
import { ObjectStore } from '@axe/core/sync/object-store';
import { ChatTab } from '@axe/domain/chat/chat-tab';
import { ChatTabList } from '@axe/domain/chat/chat-tab-list';
import { SYSTEM_CHAT_TAB_IDENTIFIER } from '@axe/domain/chat/constants';
import { ChatMessageSettingComponent } from '@axe/features/chat/chat-message-setting/chat-message-setting.component';
import { ChatSoundEventHandlerService } from '@axe/features/chat/chat-sound-event-handler.service';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

describe('ChatMessageSettingComponent', () => {
  let fixture: ComponentFixture<ChatMessageSettingComponent>;
  const store = ObjectStore.instance;

  function root(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function scopeSelect(name: string): HTMLSelectElement {
    return root().querySelector<HTMLSelectElement>(`select[name="${name}"]`)!;
  }

  function checkboxes(prefix: string): HTMLInputElement[] {
    return [...root().querySelectorAll<HTMLInputElement>(`input[name^="${prefix}"]`)];
  }

  function chooseScope(name: string, scope: string): void {
    const select = scopeSelect(name);
    select.value = scope;
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
  }

  function makeTab(name: string): ChatTab {
    const tab = new ChatTab();
    tab.name = name;
    tab.initialize();
    return ChatTabList.instance.appendChild(tab)!;
  }

  beforeEach(() => {
    localStorage.removeItem('chat-preferences');
    TestBed.configureTestingModule({ imports: [ChatMessageSettingComponent], providers: [...TEST_PROVIDERS] });
    makeTab('メイン');
    makeTab('雑談');
    fixture = TestBed.createComponent(ChatMessageSettingComponent);
    fixture.detectChanges();
  });

  afterEach(() => {
    store.getObjects().forEach((object) => store.delete(object, false));
    store.clearDeleteHistory();
    (ChatTabList as unknown as { _instance: ChatTabList | undefined })._instance = undefined;
    localStorage.removeItem('chat-preferences');
  });

  it('asks first whether a setting is one answer or one per tab', () => {
    expect([...scopeSelect('portraitScope').options].map((option) => option.value)).toEqual(['all', 'perTab']);
    expect(scopeSelect('portraitScope').value).toBe('all');
    expect(scopeSelect('simpleScope').value).toBe('all');
  });

  it('shows one checkbox while the answer is for every tab', () => {
    expect(checkboxes('portraitDisplayFlag')).toHaveLength(1);
    expect(checkboxes('chatSimpleDispFlag')).toHaveLength(1);
  });

  it('shows a checkbox for each tab once the answers differ per tab', () => {
    chooseScope('portraitScope', 'perTab');

    const rows = checkboxes('portraitDisplayFlag-');
    expect(rows).toHaveLength(2);
    expect(root().textContent).toContain('雑談');
  });

  it('leaves the system tab out of the list, since nobody speaks there', () => {
    const system = new ChatTab(SYSTEM_CHAT_TAB_IDENTIFIER);
    system.name = 'システム';
    system.initialize();
    ChatTabList.instance.appendChild(system);
    fixture.detectChanges();

    chooseScope('portraitScope', 'perTab');

    expect(checkboxes('portraitDisplayFlag-')).toHaveLength(2);
  });

  it('writes the one answer onto every tab', () => {
    const only = checkboxes('portraitDisplayFlag')[0];
    only.click();
    fixture.detectChanges();

    expect(ChatTabList.instance.chatTabs.map((tab) => tab.portraitDisplayFlag)).toEqual([0, 0]);
    expect(TestBed.inject(ChatPreferencesService).portrait()).toEqual({ scope: 'all', all: 0 });
  });

  it('writes a per-tab answer onto that tab alone', () => {
    chooseScope('simpleScope', 'perTab');

    checkboxes('chatSimpleDispFlag-')[1].click();
    fixture.detectChanges();

    expect(ChatTabList.instance.chatTabs.map((tab) => tab.chatSimpleDispFlag)).toEqual([0, 1]);
    expect(TestBed.inject(ChatPreferencesService).simple().scope).toBe('perTab');
  });

  describe('the sound a new message makes', () => {
    function soundSelect(key: string): HTMLSelectElement {
      return root().querySelector<HTMLSelectElement>(`select[name="chatSoundType-${key}"]`)!;
    }

    it('starts silent, on one answer for the room', () => {
      expect(scopeSelect('soundScope').value).toBe('all');
      expect(checkboxes('chatSoundEnabled-all')[0].checked).toBe(false);
      expect(soundSelect('all').value).toBe('notify1');
    });

    it('keeps what was chosen', () => {
      checkboxes('chatSoundEnabled-all')[0].click();
      const select = soundSelect('all');
      select.value = 'cyber';
      select.dispatchEvent(new Event('change'));
      fixture.detectChanges();

      expect(TestBed.inject(ChatPreferencesService).soundOfTab('メイン')).toMatchObject({
        enabled: true,
        type: 'cyber',
      });
    });

    function tabOf(name: string): ChatTab {
      return ChatTabList.instance.chatTabs.find((tab) => tab.name === name)!;
    }

    it('asks for each tab once the answers differ per tab', () => {
      chooseScope('soundScope', 'perTab');

      expect(checkboxes('chatSoundEnabled-')).toHaveLength(2);
      expect(soundSelect(tabOf('雑談').identifier)).toBeTruthy();
    });

    it('writes a per-tab answer onto that tab alone', () => {
      chooseScope('soundScope', 'perTab');

      const select = soundSelect(tabOf('雑談').identifier);
      select.value = 'bubble';
      select.dispatchEvent(new Event('change'));
      fixture.detectChanges();

      const preferences = TestBed.inject(ChatPreferencesService);
      expect(preferences.soundOfTab('雑談').type).toBe('bubble');
      expect(preferences.soundOfTab('メイン').type).toBe('notify1');
    });

    it('asks for two tabs of one name without falling over', () => {
      makeTab('雑談');
      fixture.detectChanges();

      chooseScope('soundScope', 'perTab');

      expect(checkboxes('chatSoundEnabled-')).toHaveLength(3);
    });

    it('keeps a tab named after the room-wide answer to itself', () => {
      const odd = makeTab('all');
      fixture.detectChanges();
      chooseScope('soundScope', 'perTab');

      const select = soundSelect(odd.identifier);
      select.value = 'cyber';
      select.dispatchEvent(new Event('change'));
      fixture.detectChanges();

      const preferences = TestBed.inject(ChatPreferencesService);
      expect(preferences.sound().all.type).toBe('notify1');
      expect(preferences.soundOfTab('all').type).toBe('cyber');
    });

    it('plays what a type sounds like when asked', () => {
      const preview = vi.spyOn(TestBed.inject(ChatSoundEventHandlerService), 'preview').mockImplementation(() => {});

      root().querySelector<HTMLButtonElement>('button[name="chatSoundPreview-all"]')!.click();

      expect(preview).toHaveBeenCalledWith('notify1', 0.5);
    });
  });

  it('keeps the scope for next time', () => {
    chooseScope('portraitScope', 'perTab');

    expect(TestBed.inject(ChatPreferencesService).portrait().scope).toBe('perTab');
  });
});
