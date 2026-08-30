import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChatSpeakerService } from '@axe/application/chat/chat-speaker.service';
import { HotbarStoreService } from '@axe/application/hotbar/hotbar-store.service';
import { PanelService } from '@axe/application/ui/panel.service';
import { ObjectStore } from '@axe/core/sync/object-store';
import { GameCharacter } from '@axe/domain/character/game-character';
import { Hotbar } from '@axe/domain/hotbar/hotbar';
import { emptyHotbarSlotDraft } from '@axe/domain/hotbar/hotbar-draft';
import { HotbarSlot } from '@axe/domain/hotbar/hotbar-slot';
import { HOTBAR_SLOT_KINDS } from '@axe/domain/hotbar/hotbar-slot-kind';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { HotbarSlotEditorComponent } from '@axe/features/hotbar/hotbar-editor/hotbar-slot-editor.component';
import { HotbarRunnerService } from '@axe/features/hotbar/hotbar-runner.service';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

describe('HotbarSlotEditorComponent', () => {
  let fixture: ComponentFixture<HotbarSlotEditorComponent>;
  let component: HotbarSlotEditorComponent;
  let store: ObjectStore;
  let character: GameCharacter;
  let hotbar: Hotbar;

  function root(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function click(testId: string): void {
    root().querySelector<HTMLButtonElement>(`[data-testid="${testId}"]`)!.click();
    fixture.detectChanges();
  }

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HotbarSlotEditorComponent], providers: [...TEST_PROVIDERS] });
    store = ObjectStore.instance;
    fixture = TestBed.createComponent(HotbarSlotEditorComponent);
    component = fixture.componentInstance;

    PeerCursor.createMyCursor();
    PeerCursor.myCursor.userId = 'me';
    character = GameCharacter.create('術者', 1, '');
    character.addExtendData();
    hotbar = TestBed.inject(HotbarStoreService).ensureOwn()!;
    component.setFrom({ page: 1, slotIndex: 3 }, emptyHotbarSlotDraft('sound'));
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    store.getObjects().forEach((object) => store.delete(object, false));
    PeerCursor.myCursor = null!;
    store.clearDeleteHistory();
  });

  it('offers every kind a slot can be', () => {
    const options = [...root().querySelectorAll<HTMLOptionElement>('[data-testid="hotbar-editor-kind"] option')];

    expect(options.map((option) => option.value)).toEqual([...HOTBAR_SLOT_KINDS]);
  });

  it('opens on the settings the slot already holds', () => {
    component.setFrom(
      { page: 1, slotIndex: 3 },
      { ...emptyHotbarSlotDraft('prefill'), value: '/w gm 準備できました', label: '耳打ち' }
    );
    fixture.detectChanges();

    const kind = root().querySelector<HTMLSelectElement>('[data-testid="hotbar-editor-kind"]')!;
    const label = root().querySelector<HTMLInputElement>('[data-testid="hotbar-editor-label"]')!;
    const argument = root().querySelector<HTMLTextAreaElement>('[data-testid="hotbar-editor-argument"]')!;

    expect(kind.value).toBe('prefill');
    expect(label.value).toBe('耳打ち');
    expect(argument.value).toBe('/w gm 準備できました');
  });

  it('offers the lines already written in the palette of the character it speaks as', () => {
    character.chatPalette!.setPalette('◆戦闘\n2d6+3 攻撃\n//威力=7\n\n1d100<={威力}');
    TestBed.inject(ChatSpeakerService).set(character.identifier);
    component.setFrom({ page: 1, slotIndex: 3 }, emptyHotbarSlotDraft('chat'));
    fixture.detectChanges();

    const picker = root().querySelector<HTMLSelectElement>('[data-testid="hotbar-editor-palette"]')!;
    const lines = [...picker.querySelectorAll('optgroup option')].map((option) => option.textContent?.trim());

    expect(picker.querySelector('optgroup')?.label).toBe('戦闘');
    expect(lines).toEqual(['2d6+3 攻撃', '1d100<={威力}']);
  });

  it('takes a palette line into the box, leaving it there to be worked on', () => {
    character.chatPalette!.setPalette('2d6+3 攻撃');
    TestBed.inject(ChatSpeakerService).set(character.identifier);
    component.setFrom({ page: 1, slotIndex: 3 }, emptyHotbarSlotDraft('chat'));
    fixture.detectChanges();
    vi.spyOn(TestBed.inject(PanelService), 'close').mockImplementation(() => undefined);

    const picker = root().querySelector<HTMLSelectElement>('[data-testid="hotbar-editor-palette"]')!;
    picker.value = '2d6+3 攻撃';
    picker.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    const argument = root().querySelector<HTMLTextAreaElement>('[data-testid="hotbar-editor-argument"]')!;
    expect(argument.value).toBe('2d6+3 攻撃');

    click('hotbar-editor-save');
    expect(hotbar.slotAt(1, 3)?.argument).toBe('2d6+3 攻撃');
  });

  it('leaves the picker away for a kind that says nothing', () => {
    character.chatPalette!.setPalette('2d6+3 攻撃');
    TestBed.inject(ChatSpeakerService).set(character.identifier);
    component.setFrom({ page: 1, slotIndex: 3 }, emptyHotbarSlotDraft('effect'));
    fixture.detectChanges();

    expect(root().querySelector('[data-testid="hotbar-editor-palette"]')).toBeNull();
  });

  it('writes a slot down before any room has been joined', () => {
    PeerCursor.myCursor.userId = '';
    vi.spyOn(TestBed.inject(PanelService), 'close').mockImplementation(() => undefined);
    const argument = root().querySelector<HTMLTextAreaElement>('[data-testid="hotbar-editor-argument"]')!;
    argument.value = 'dice-roll';
    argument.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    click('hotbar-editor-save');

    expect(hotbar.slotAt(1, 3)?.argument).toBe('dice-roll');
  });

  it('writes the slot into the place it was opened for', () => {
    const close = vi.spyOn(TestBed.inject(PanelService), 'close').mockImplementation(() => undefined);
    const argument = root().querySelector<HTMLTextAreaElement>('[data-testid="hotbar-editor-argument"]')!;
    argument.value = 'dice-roll';
    argument.dispatchEvent(new Event('input'));
    const label = root().querySelector<HTMLInputElement>('[data-testid="hotbar-editor-label"]')!;
    label.value = '合図';
    label.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    click('hotbar-editor-save');

    const slot = hotbar.slotAt(1, 3);
    expect(slot?.argument).toBe('dice-roll');
    expect(slot?.label).toBe('合図');
    expect(close).toHaveBeenCalled();
  });

  it('starts a kind again on its own options when the kind is changed', () => {
    const select = root().querySelector<HTMLSelectElement>('[data-testid="hotbar-editor-kind"]')!;
    select.value = 'cutIn';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    vi.spyOn(TestBed.inject(PanelService), 'close').mockImplementation(() => undefined);

    click('hotbar-editor-save');

    expect(hotbar.slotAt(1, 3)?.options).toEqual({ kind: 'cutIn', soundOnly: false });
  });

  it('empties the place it was opened for', () => {
    vi.spyOn(TestBed.inject(PanelService), 'close').mockImplementation(() => undefined);
    click('hotbar-editor-save');
    expect(hotbar.slotAt(1, 3)).not.toBeNull();

    click('hotbar-editor-clear');

    expect(hotbar.slotAt(1, 3)).toBeNull();
  });

  it('keeps a trial out of the room, so no peer hears of it', () => {
    TestBed.inject(ChatSpeakerService).set(character.identifier);
    vi.spyOn(TestBed.inject(HotbarRunnerService), 'run').mockReturnValue({ ok: true });
    const before = store.getObjects(HotbarSlot).length;

    click('hotbar-editor-try');

    expect(store.getObjects(HotbarSlot).length).toBe(before);
  });

  it('tries a draft out without writing it down', () => {
    TestBed.inject(ChatSpeakerService).set(character.identifier);
    const run = vi.spyOn(TestBed.inject(HotbarRunnerService), 'run').mockReturnValue({ ok: true });

    click('hotbar-editor-try');

    expect(run).toHaveBeenCalledOnce();
    expect(hotbar.slotAt(1, 3) ?? null).toBeNull();
  });
});
