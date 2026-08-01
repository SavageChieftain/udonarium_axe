import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChatMessageService } from '@axe/application/chat/chat-message.service';
import { ObjectChangeService } from '@axe/application/sync/object-change.service';
import { Network } from '@axe/core/index';
import { AudioFile } from '@axe/core/storage/audio-file';
import { AudioStorage } from '@axe/core/storage/audio-storage';
import { ImageStorage } from '@axe/core/storage/image-storage';
import { ObjectStore } from '@axe/core/sync/object-store';
import { GameCharacter } from '@axe/domain/character/game-character';
import { ChatMessage } from '@axe/domain/chat/chat-message';
import { ChatTab } from '@axe/domain/chat/chat-tab';
import { ChatTabList } from '@axe/domain/chat/chat-tab-list';
import { DiceBot } from '@axe/domain/dice/dice-bot';
import { AudioTag } from '@axe/domain/media/audio-tag';
import { Jukebox } from '@axe/domain/media/jukebox';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { PeerRole } from '@axe/domain/peer/peer-role';
import { ChatPaletteRegistryService } from '@axe/features/chat/chat-palette/chat-palette-registry.service';
import { VisualNovelModeService } from '@axe/features/visual-novel/visual-novel-mode.service';
import { VisualNovelOverlayComponent } from '@axe/features/visual-novel/visual-novel-overlay/visual-novel-overlay.component';
import { VisualNovelSettingsService } from '@axe/features/visual-novel/visual-novel-settings.service';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';
import GameSystemClass from 'bcdice/lib/game_system';

describe('VisualNovelOverlayComponent', () => {
  let component: VisualNovelOverlayComponent;
  let fixture: ComponentFixture<VisualNovelOverlayComponent>;
  let tab: ChatTab;
  let nextTimestamp = 1000;
  let nextImageId = 0;
  let nextCharacterId = 0;
  const charactersByName = new Map<string, GameCharacter>();

  function characterFor(name: string): GameCharacter {
    let character = charactersByName.get(name);
    if (!character) {
      character = new GameCharacter(`vn-char-${nextCharacterId++}`);
      character.initialize();
      charactersByName.set(name, character);
    }
    return character;
  }

  // 立ち絵付きメッセージは GameCharacter 発言として扱う (imageIdentifier 指定時に sendFrom を紐付ける)。
  function addMessage(text: string, name = 'アリス', imageIdentifier = '', imagePos?: number): void {
    const context: Record<string, unknown> = {
      from: 'test-user',
      name,
      text,
      timestamp: nextTimestamp++,
      imageIdentifier,
    };
    if (imageIdentifier.length > 0) context['sendFrom'] = characterFor(name).identifier;
    if (imagePos != null) context['imagePos'] = imagePos;
    tab.addMessage(context);
  }

  function addImage(): string {
    return ImageStorage.instance.add(`test://vn/image-${nextImageId++}.png`).identifier;
  }

  function makeReadyAudio(identifier: string, name?: string): AudioFile {
    const audio = AudioFile.createEmpty(identifier);
    const ctx = (audio as unknown as { context: Record<string, unknown> }).context;
    ctx['blob'] = new Blob(['x']);
    ctx['url'] = 'blob:x';
    ctx['name'] = name ?? identifier;
    return audio;
  }

  function addAudio(identifier: string, tag: string, name?: string): AudioFile {
    const audio = makeReadyAudio(identifier, name);
    AudioStorage.instance.add(audio);
    const audioTag = AudioTag.create(identifier);
    audioTag.tag = tag;
    return audio;
  }

  function ensureJukebox(): Jukebox {
    let jukebox = ObjectStore.instance.get<Jukebox>('Jukebox');
    if (!jukebox) {
      jukebox = new Jukebox('Jukebox');
      jukebox.initialize();
    }
    return jukebox;
  }

  function createComponent(): void {
    fixture = TestBed.createComponent(VisualNovelOverlayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(async () => {
    PeerCursor.createMyCursor();
    TestBed.configureTestingModule({
      imports: [VisualNovelOverlayComponent],
      providers: [...TEST_PROVIDERS],
    }).compileComponents();
  });

  beforeEach(() => {
    tab = ChatTabList.instance.addChatTab('テストタブ');
  });

  afterEach(() => {
    fixture?.destroy();
    tab?.destroy();
    for (const character of charactersByName.values()) character.destroy();
    charactersByName.clear();
    AudioStorage.instance.audios.forEach((a) => AudioStorage.instance.delete(a.identifier));
    ObjectStore.instance.getObjects(AudioTag).forEach((t) => ObjectStore.instance.delete(t, false));
    localStorage.removeItem('vn-settings');
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('should create', () => {
    createComponent();
    expect(component).toBeTruthy();
  });

  it('最初のチャットタブが自動選択されること', () => {
    createComponent();
    expect(component.chatTabIdentifier).toBe(tab.identifier);
    expect(component.chatTab()).toBe(tab);
  });

  it('最新メッセージに追従して表示すること', () => {
    addMessage('一つ目');
    addMessage('二つ目');
    createComponent();
    expect(component.currentMessage()?.text).toBe('二つ目');
    expect(component.isLatest()).toBe(true);
  });

  it('タイピング中の advance() で全文が即時表示されること', () => {
    addMessage('こんにちは、世界！');
    createComponent();
    expect(component.isTyping()).toBe(true);
    component.advance();
    expect(component.isTyping()).toBe(false);
    expect(component.displayedText()).toBe('こんにちは、世界！');
  });

  it('タイプライター演出で文字が徐々に表示されること', () => {
    vi.useFakeTimers();
    addMessage('あいうえお');
    createComponent();
    expect(component.displayedText()).toBe('');
    vi.advanceTimersByTime(60);
    expect(component.displayedText()).toBe('あい');
    vi.advanceTimersByTime(300);
    expect(component.displayedText()).toBe('あいうえお');
    expect(component.isTyping()).toBe(false);
  });

  it('back() / advance() / toLatest() でメッセージ履歴を行き来できること', () => {
    addMessage('m1');
    addMessage('m2');
    addMessage('m3');
    createComponent();
    component.advance();

    component.back();
    fixture.detectChanges();
    expect(component.currentIndex()).toBe(1);
    expect(component.currentMessage()?.text).toBe('m2');
    expect(component.displayedText()).toBe('m2');
    expect(component.isLatest()).toBe(false);

    component.back();
    fixture.detectChanges();
    expect(component.currentIndex()).toBe(0);

    component.back();
    expect(component.currentIndex()).toBe(0);

    component.advance();
    fixture.detectChanges();
    expect(component.currentIndex()).toBe(1);

    component.toLatest();
    fixture.detectChanges();
    expect(component.isLatest()).toBe(true);
    expect(component.currentMessage()?.text).toBe('m3');
  });

  it('最新表示中に新着メッセージが来たらそれを表示すること', () => {
    addMessage('m1');
    createComponent();
    component.advance();
    addMessage('m2');
    fixture.detectChanges();
    expect(component.currentMessage()?.text).toBe('m2');
  });

  it('過去メッセージ閲覧中は新着が来ても表示位置が変わらないこと', () => {
    addMessage('m1');
    addMessage('m2');
    createComponent();
    component.advance();
    component.back();
    fixture.detectChanges();
    addMessage('m3');
    fixture.detectChanges();
    expect(component.currentIndex()).toBe(0);
    expect(component.currentMessage()?.text).toBe('m1');
    expect(component.isLatest()).toBe(false);
  });

  it('send() で選択タブに対して ChatMessageService.sendMessage が呼ばれること', async () => {
    createComponent();
    const chatMessageService = TestBed.inject(ChatMessageService);
    const sendSpy = vi.spyOn(chatMessageService, 'sendMessage').mockReturnValue(null as unknown as ChatMessage);
    vi.spyOn(DiceBot, 'loadGameSystemAsync').mockResolvedValue(null as unknown as GameSystemClass);

    component.text.set('  やあ  ');
    component.send();
    await vi.waitFor(() => expect(sendSpy).toHaveBeenCalled(), { timeout: 5000 });

    expect(sendSpy).toHaveBeenCalledWith(
      tab,
      'やあ',
      null,
      PeerCursor.myCursor.identifier,
      undefined,
      0,
      expect.any(String),
      [{ text: 'やあ', object: null }]
    );
    expect(component.text()).toBe('');
  });

  it('空文字のままの send() は何も送信しないこと', async () => {
    createComponent();
    const chatMessageService = TestBed.inject(ChatMessageService);
    const sendSpy = vi.spyOn(chatMessageService, 'sendMessage');
    component.text.set('   ');
    component.send();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(sendSpy).not.toHaveBeenCalled();
  });

  it('Escape キーでノベルモードが終了すること', () => {
    createComponent();
    const vnMode = TestBed.inject(VisualNovelModeService);
    vnMode.activate();
    component.onKeydown(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(vnMode.active()).toBe(false);
  });

  it('入力欄での keydown はメッセージ送りに使われないこと', () => {
    addMessage('こんにちは');
    createComponent();
    const input = document.createElement('input');
    const event = new KeyboardEvent('keydown', { key: ' ' });
    Object.defineProperty(event, 'target', { value: input });
    const before = component.displayedText();
    component.onKeydown(event);
    expect(component.displayedText()).toBe(before);
  });

  it('複数の発言者が立ち絵ステージに同時に登場すること', () => {
    addMessage('こんにちは', 'アリス', addImage());
    addMessage('やあ', 'ボブ', addImage());
    createComponent();
    const stage = component.stageCharacters();
    expect(stage).toHaveLength(2);
    expect(stage.map((chara) => chara.name)).toContain('アリス');
    expect(stage.find((chara) => chara.isActive)?.name).toBe('ボブ');
    expect(stage.every((chara) => chara.url.length > 0)).toBe(true);
  });

  it('プレイヤー（GameCharacter でない発言者）は立ち絵ステージに出ないこと', () => {
    // プレイヤーの発言 (sendFrom が PeerCursor) は画像があってもステージに並べない
    tab.addMessage({
      from: 'test-user',
      name: 'プレイヤー',
      text: '2d6',
      timestamp: nextTimestamp++,
      imageIdentifier: addImage(),
      sendFrom: PeerCursor.myCursor.identifier,
    });
    createComponent();
    expect(component.stageCharacters()).toHaveLength(0);
  });

  it('履歴を遡ると当時の発言者がアクティブになること', () => {
    addMessage('こんにちは', 'アリス', addImage());
    addMessage('やあ', 'ボブ', addImage());
    createComponent();
    component.advance();
    component.back();
    fixture.detectChanges();
    expect(component.stageCharacters().find((chara) => chara.isActive)?.name).toBe('アリス');
  });

  it('システムメッセージは立ち絵ステージに登場しないこと', () => {
    tab.addMessage({
      from: 'System',
      name: 'System',
      text: 'お知らせ',
      timestamp: nextTimestamp++,
      imageIdentifier: addImage(),
    });
    createComponent();
    expect(component.stageCharacters()).toHaveLength(0);
  });

  it('立ち絵がいる発言は立ち絵の位置に吹き出しが出ること', () => {
    addMessage('こんにちは', 'アリス', addImage(), 4);
    createComponent();
    const anchor = component.bubbleAnchor();
    expect(anchor?.left).toBeCloseTo(((4 + 0.5) / 12) * 100, 3);
    expect(anchor?.bottom).toBe('58vh');
  });

  it('立ち絵がいない発言は画面下中央に吹き出しが出ること', () => {
    addMessage('こんにちは');
    createComponent();
    const anchor = component.bubbleAnchor();
    expect(anchor?.left).toBe(50);
  });

  it('ダイスボットのメッセージはシステムちゃんが表示し吹き出しアンカーは出ないこと', () => {
    tab.addMessage({
      from: 'System-BCDice',
      name: 'BCDice',
      tag: 'system',
      text: 'DiceBot : (2D6) → 7[3,4]',
      timestamp: nextTimestamp++,
    });
    createComponent();
    expect(component.systemSpeaker()?.imageUrl).toBe('assets/images/system_chang_roll.png');
    expect(component.bubbleAnchor()).toBeNull();
  });

  it('文字送り設定 off では全文が即時表示されること', () => {
    TestBed.inject(VisualNovelSettingsService).setTypewriterSpeed('off');
    addMessage('こんにちは');
    createComponent();
    expect(component.isTyping()).toBe(false);
    expect(component.displayedText()).toBe('こんにちは');
  });

  it('jumpTo() でバックログから任意のメッセージへ移動できること', () => {
    addMessage('m1');
    addMessage('m2');
    addMessage('m3');
    createComponent();
    component.showBacklog.set(true);
    component.jumpTo(0);
    fixture.detectChanges();
    expect(component.currentIndex()).toBe(0);
    expect(component.displayedText()).toBe('m1');
    expect(component.showBacklog()).toBe(false);
  });

  it('ホイール操作で履歴を戻れること', () => {
    addMessage('m1');
    addMessage('m2');
    createComponent();
    component.advance();
    component.onMessageWheel(new WheelEvent('wheel', { deltaY: -100, cancelable: true }));
    fixture.detectChanges();
    expect(component.currentIndex()).toBe(0);
  });

  it('感情表現を選んで send() すると本文末尾にサフィックスが付き、選択は維持されること', async () => {
    createComponent();
    const chatMessageService = TestBed.inject(ChatMessageService);
    const sendSpy = vi.spyOn(chatMessageService, 'sendMessage').mockReturnValue(null as unknown as ChatMessage);
    vi.spyOn(DiceBot, 'loadGameSystemAsync').mockResolvedValue(null as unknown as GameSystemClass);

    component.selectedShape.set('shout');
    component.selectedBubbleAnimation.set('shake');
    component.selectedPortraitEmote.set('jump');
    component.text.set('なんだって！？');
    component.send();
    await vi.waitFor(() => expect(sendSpy).toHaveBeenCalled(), { timeout: 5000 });

    expect(sendSpy.mock.calls[0][1]).toBe('なんだって！？ 〔叫び・ゆれ・ジャンプ〕');
    expect(component.selectedShape()).toBe('shout');
    expect(component.selectedBubbleAnimation()).toBe('shake');
    expect(component.selectedPortraitEmote()).toBe('jump');
    component.resetEmote();
    expect(component.selectedShape()).toBe('normal');
    expect(component.hasEmoteSelection()).toBe(false);
  });

  it('地の文の発言は吹き出しではなくナレーションとして表示されること', async () => {
    createComponent();
    const chatMessageService = TestBed.inject(ChatMessageService);
    const sendSpy = vi.spyOn(chatMessageService, 'sendMessage').mockReturnValue(null as unknown as ChatMessage);
    vi.spyOn(DiceBot, 'loadGameSystemAsync').mockResolvedValue(null as unknown as GameSystemClass);
    component.selectedKind.set('narration');
    component.text.set('一行は森の奥へ進んだ。');
    component.send();
    await vi.waitFor(() => expect(sendSpy).toHaveBeenCalled(), { timeout: 5000 });
    expect(sendSpy.mock.calls[0][1]).toBe('一行は森の奥へ進んだ。 〔地の文〕');

    addMessage('一行は森の奥へ進んだ。 〔地の文〕');
    fixture.detectChanges();
    expect(component.narrationKind()).toBe('narration');
    expect(component.bubbleAnchor()).toBeNull();
  });

  it('ロケーションはタイプライターなしで全文即時表示されること', () => {
    addMessage('忘れられた森 〔ロケーション〕');
    createComponent();
    expect(component.narrationKind()).toBe('location');
    expect(component.isTyping()).toBe(false);
    expect(component.currentFullText()).toBe('忘れられた森');
  });

  it('文字サイズ設定で吹き出しの文字クラスが変わること', () => {
    createComponent();
    const settings = TestBed.inject(VisualNovelSettingsService);
    expect(component.bubbleTextSizeClass()).toBe('text-[15px]/relaxed');
    settings.setTextSize('large');
    expect(component.bubbleTextSizeClass()).toBe('text-[19px]/relaxed');
    settings.setTextSize('small');
    expect(component.bubbleTextSizeClass()).toBe('text-[13px]/relaxed');
  });

  it('pickSlot() で発言キャラクターのスロットは範囲内に丸められること', () => {
    createComponent();
    component.showSlotGuide.set(true);
    component.pickSlot(5);
    expect(component.showSlotGuide()).toBe(false);
  });

  it('立ち絵は画面端で見切れないようにクランプされること', () => {
    addMessage('端のキャラ', 'みぎは', addImage(), 11);
    createComponent();
    const stage = component.stageCharacters();
    expect(stage[0].left).toBeLessThanOrEqual(92);
    expect(stage[0].left).toBeGreaterThanOrEqual(8);
  });

  it('演出サフィックス付きメッセージは本文のみ表示され演出クラスが算出されること', () => {
    addMessage('考えごと… 〔もやもや・ドキドキ・ぶるぶる〕');
    createComponent();
    component.advance();
    expect(component.displayedText()).toBe('考えごと…');
    expect(component.isTyping()).toBe(false);
    expect(component.bubbleBoxClass()).toContain('vn-bubble-thought');
    expect(component.bubbleEnterClass()).toBe('vn-enter-thought');
    expect(component.bubbleAnimationClass()).toBe('animate-vn-pulse');
    expect(component.portraitEmoteClass()).toBe('animate-vn-tremble');
  });

  it('サフィックスなしのメッセージは通常形・既定の登場演出であること', () => {
    addMessage('こんにちは');
    createComponent();
    expect(component.bubbleBoxClass()).toContain('vn-bubble-normal');
    expect(component.bubbleEnterClass()).toBe('vn-enter-normal');
    expect(component.bubbleAnimationClass()).toBe('');
    expect(component.portraitEmoteClass()).toBe('');
  });

  it('叫び形状はインパクト登場になり背景トゲ。レイヤで描画されること', () => {
    addMessage('なんだって！？ 〔叫び〕');
    createComponent();
    expect(component.isShoutShape()).toBe(true);
    expect(component.bubbleEnterClass()).toBe('vn-enter-shout');
  });

  it('gameType が ChatMessageService と共有されること', () => {
    createComponent();
    const chatMessageService = TestBed.inject(ChatMessageService);
    component.gameType = 'Cthulhu7th';
    expect(chatMessageService.gameType).toBe('Cthulhu7th');
    expect(component.gameType).toBe('Cthulhu7th');
    chatMessageService.gameType = 'DiceBot';
  });

  it('立ち絵ステージは最大 6 人まで登場すること', () => {
    for (let i = 0; i < 8; i++) {
      addMessage(`発言${i}`, `キャラ${i}`, addImage());
    }
    createComponent();
    expect(component.stageCharacters()).toHaveLength(6);
  });

  it('立ち位置はメッセージの imagePos スロットで決まること', () => {
    addMessage('こんにちは', 'アリス', addImage(), 8);
    addMessage('やあ', 'ボブ', addImage(), 2);
    createComponent();
    const stage = component.stageCharacters();
    expect(stage.map((chara) => chara.name)).toEqual(['ボブ', 'アリス']);
    expect(stage[0].slot).toBe(2);
    expect(stage[1].slot).toBe(8);
    expect(stage[0].left).toBeCloseTo(((2 + 0.5) / 12) * 100, 3);
    expect(stage[1].left).toBeCloseTo(((8 + 0.5) / 12) * 100, 3);
  });

  it('同じスロットの立ち絵は少しずつずらして重なりを避けること', () => {
    addMessage('こんにちは', 'アリス', addImage(), 3);
    addMessage('やあ', 'ボブ', addImage(), 3);
    createComponent();
    const stage = component.stageCharacters();
    expect(stage[0].left).not.toBeCloseTo(stage[1].left, 3);
  });

  it('立ち絵は人数やスロットによらず同一の高さ基準で扱われること', () => {
    for (let i = 0; i < 6; i++) {
      addMessage(`発言${i}`, `キャラ${i}`, addImage(), i);
    }
    createComponent();
    const stage = component.stageCharacters();
    expect(stage).toHaveLength(6);
    expect(stage.every((chara) => !('width' in chara))).toBe(true);
  });

  it('漫符サフィックスから emotionMark が算出されること', () => {
    addMessage('なっ…！ 〔💢・ぶるぶる〕');
    createComponent();
    expect(component.emotionMark()?.char).toBe('💢');
    expect(component.portraitEmoteClass()).toBe('animate-vn-tremble');
    expect(component.displayedText().length).toBeLessThanOrEqual('なっ…！'.length);
  });

  it('バックログをキーワードで絞り込めること', () => {
    addMessage('森の奥へ進む', 'アリス');
    addMessage('宿屋で休む', 'ボブ');
    createComponent();
    expect(component.filteredBacklogEntries()).toHaveLength(2);
    component.backlogFilter.set('宿屋');
    expect(component.filteredBacklogEntries()).toHaveLength(1);
    expect(component.filteredBacklogEntries()[0].message.name).toBe('ボブ');
    component.backlogFilter.set('アリス');
    expect(component.filteredBacklogEntries()).toHaveLength(1);
  });

  it('バックログ行は本文とサフィックスを分離して保持すること', () => {
    addMessage('やあ 〔叫び・ゆれ〕');
    createComponent();
    const entry = component.backlogEntries()[0];
    expect(entry.text).toBe('やあ');
    expect(entry.suffix).toBe('〔叫び・ゆれ〕');
  });

  it('ロケーション表示中は立ち絵ステージが空になること', () => {
    addMessage('こんにちは', 'アリス', addImage());
    addMessage('忘れられた森 〔ロケーション〕');
    createComponent();
    expect(component.narrationKind()).toBe('location');
    expect(component.stageCharacters()).toHaveLength(0);
  });

  it('場面転換以前の発言者はステージから一掃されること', () => {
    addMessage('こんにちは', 'アリス', addImage());
    addMessage('場面は変わって 〔場面転換〕');
    addMessage('やあ', 'ボブ', addImage());
    createComponent();
    expect(component.stageCharacters().map((chara) => chara.name)).toEqual(['ボブ']);
  });

  it('場面転換メッセージの表示中はステージ・吹き出しが消えること', () => {
    addMessage('こんにちは', 'アリス', addImage());
    addMessage('〜その夜〜 〔場面転換〕');
    createComponent();
    expect(component.narrationKind()).toBe('scene');
    expect(component.stageCharacters()).toHaveLength(0);
    expect(component.bubbleAnchor()).toBeNull();
    expect(component.isTyping()).toBe(false);
  });

  it('場面転換の発言タイプは GM のみに表示されること', () => {
    createComponent();
    const objectChange = TestBed.inject(ObjectChangeService);
    expect(component.messageKindOptions()).not.toContain('scene');
    PeerCursor.myCursor.role = PeerRole.GameMaster;
    objectChange.notifyChanged(PeerCursor.myCursor.identifier);
    expect(component.messageKindOptions()).toContain('scene');
    PeerCursor.myCursor.role = PeerRole.Player;
    objectChange.notifyChanged(PeerCursor.myCursor.identifier);
  });

  it('saveEditEntry() でログから本文・演出・スロットを書き換えられること', () => {
    tab.addMessage({
      from: Network.peerContext.userId,
      name: 'アリス',
      text: 'やあ 〔叫び〕',
      timestamp: nextTimestamp++,
      imageIdentifier: addImage(),
      imagePos: 2,
    });
    createComponent();
    const entry = component.backlogEntries()[0];
    expect(entry.message.changeable).toBe(true);

    component.startEditEntry(entry);
    expect(component.editText()).toBe('やあ');
    expect(component.editShape()).toBe('shout');
    expect(component.editSlot()).toBe(2);

    component.editText.set('こんばんは');
    component.editShape.set('thought');
    component.editSlot.set(7);
    component.saveEditEntry();

    const message = component.messages()[0];
    expect(message.text).toBe('こんばんは 〔もやもや〕');
    expect(message.imagePos).toBe(7);
    expect(message.fixd).toBe(true);
    expect(component.editingIndex()).toBe(-1);
  });

  it('SE を添付して send() するとジュークボックス経由で再生され添付が解除されること', async () => {
    const jukebox = ensureJukebox();
    const playSpy = vi.spyOn(jukebox, 'play').mockImplementation(() => undefined);
    createComponent();
    const chatMessageService = TestBed.inject(ChatMessageService);
    const sendSpy = vi.spyOn(chatMessageService, 'sendMessage').mockReturnValue(null as unknown as ChatMessage);
    vi.spyOn(DiceBot, 'loadGameSystemAsync').mockResolvedValue(null as unknown as GameSystemClass);

    component.attachSe('audio-1', 'ジャーン');
    component.text.set('ここで効果音');
    component.send();
    await vi.waitFor(() => expect(sendSpy).toHaveBeenCalled(), { timeout: 5000 });

    expect(playSpy).toHaveBeenCalledWith('audio-1');
    expect(component.attachedSe()).toBeNull();
  });

  describe('SE サウンドボード', () => {
    it('soundEffects は SE タグの音声のみを返す', () => {
      addAudio('se-1', 'SE', 'ジャーン');
      addAudio('bgm-1', 'BGM', '戦闘曲');
      AudioStorage.instance.add(makeReadyAudio('no-tag', 'タグなし'));
      createComponent();

      expect(component.soundEffects().map((a) => a.identifier)).toEqual(['se-1']);
    });

    it('playSoundEffect / stopSoundEffect はジュークボックス経由で再生・停止する', () => {
      const jukebox = ensureJukebox();
      const playSpy = vi.spyOn(jukebox, 'play').mockImplementation(() => undefined);
      const stopSpy = vi.spyOn(jukebox, 'stopSE').mockImplementation(() => undefined);
      createComponent();

      component.playSoundEffect('se-1');
      expect(playSpy).toHaveBeenCalledWith('se-1');

      component.stopSoundEffect('se-1');
      expect(stopSpy).toHaveBeenCalledWith('se-1');
    });

    it('isSoundEffectPlaying はジュークボックスの再生状態を返す', () => {
      const jukebox = ensureJukebox();
      vi.spyOn(jukebox, 'isSePlaying').mockReturnValue(true);
      createComponent();

      expect(component.isSoundEffectPlaying('se-1')).toBe(true);
    });
  });

  it('ダイス結果のシステムちゃんにロール主の名前とアバターが付くこと', () => {
    const rollerImage = addImage();
    addMessage('5d6', 'アリス', rollerImage);
    const command = tab.chatMessages[tab.chatMessages.length - 1];
    tab.addMessage({
      from: 'System-BCDice',
      originFrom: command.from,
      name: '<BCDice：アリス>',
      tag: 'system',
      text: 'DiceBot : (5D6) → 18',
      timestamp: command.timestamp + 1,
    });
    createComponent();
    const speaker = component.systemSpeaker();
    expect(speaker?.rollerName).toBe('アリス');
    expect(speaker?.rollerImageUrl.length).toBeGreaterThan(0);
  });

  it('ダイスコマンド発言は吹き出し・立ち絵を出さずコマンド表示になること', () => {
    addMessage('5d6', 'アリス', addImage());
    const command = tab.chatMessages[tab.chatMessages.length - 1];
    tab.addMessage({
      from: 'System-BCDice',
      originFrom: command.from,
      name: '<BCDice：アリス>',
      tag: 'system',
      text: 'DiceBot : (5D6) → 18[2,3,4,4,5] → 18',
      timestamp: command.timestamp + 1,
    });
    createComponent();

    component.back();
    fixture.detectChanges();
    expect(component.currentMessage()?.text).toBe('5d6');
    expect(component.currentIsDiceCommand()).toBe(true);
    expect(component.diceCommand()?.name).toBe('アリス');
    expect(component.bubbleAnchor()).toBeNull();
    expect(component.stageCharacters()).toHaveLength(0);
    expect(component.displayedText()).toBe('5d6');
  });

  it('ダイスコマンドの発言者は立ち絵ステージに登場しないこと', () => {
    addMessage('こんにちは', 'アリス', addImage());
    addMessage('5d6', 'ボブ', addImage());
    const command = tab.chatMessages[tab.chatMessages.length - 1];
    tab.addMessage({
      from: 'System-BCDice',
      originFrom: command.from,
      name: '<BCDice：ボブ>',
      tag: 'system',
      text: 'DiceBot : (5D6) → 12',
      timestamp: command.timestamp + 1,
    });
    createComponent();
    expect(component.stageCharacters().map((chara) => chara.name)).toEqual(['アリス']);
  });

  it('オートプレイ開始で最古のメッセージへ巻き戻ること', () => {
    addMessage('m1');
    addMessage('m2');
    addMessage('m3');
    createComponent();
    expect(component.currentIndex()).toBe(2);
    component.toggleAutoPlay();
    fixture.detectChanges();
    expect(component.autoPlay()).toBe(true);
    expect(component.currentIndex()).toBe(0);
  });

  it('タイプ完了後に間を置いて自動で次のメッセージへ進むこと', () => {
    vi.useFakeTimers();
    addMessage('あい');
    addMessage('うえ');
    addMessage('おか');
    createComponent();
    component.toggleAutoPlay();
    fixture.detectChanges();
    expect(component.currentIndex()).toBe(0);

    vi.advanceTimersByTime(100);
    fixture.detectChanges();
    expect(component.isTyping()).toBe(false);
    vi.advanceTimersByTime(1200 + 2 * 35 + 50);
    fixture.detectChanges();
    expect(component.currentIndex()).toBe(1);
    expect(component.autoPlay()).toBe(true);
  });

  it('最新まで再生し終えるとオートプレイが解除されること', () => {
    vi.useFakeTimers();
    addMessage('あい');
    addMessage('うえ');
    createComponent();
    component.toggleAutoPlay();
    fixture.detectChanges();

    vi.advanceTimersByTime(100);
    fixture.detectChanges();
    vi.advanceTimersByTime(1400);
    fixture.detectChanges();
    expect(component.currentIndex()).toBe(1);

    vi.advanceTimersByTime(100);
    fixture.detectChanges();
    expect(component.isTyping()).toBe(false);
    fixture.detectChanges();
    expect(component.autoPlay()).toBe(false);
  });

  it('ユーザー操作でオートプレイが停止すること', () => {
    addMessage('m1');
    addMessage('m2');
    createComponent();
    component.toggleAutoPlay();
    fixture.detectChanges();
    expect(component.autoPlay()).toBe(true);
    component.userAdvance();
    expect(component.autoPlay()).toBe(false);

    component.toggleAutoPlay();
    fixture.detectChanges();
    expect(component.autoPlay()).toBe(true);
    component.onKeydown(new KeyboardEvent('keydown', { key: ' ' }));
    expect(component.autoPlay()).toBe(false);
  });

  it('発言者にプレイヤーは選ばれず、既定で先頭のキャラクターになること', () => {
    addMessage('こんにちは', 'アリス', addImage());
    createComponent();
    fixture.detectChanges();
    const characters = component.gameCharacters();
    expect(characters.length).toBeGreaterThan(0);
    expect(component.sendFrom).toBe(characters[0].identifier);
    expect(component.sendFrom).not.toBe(PeerCursor.myCursor.identifier);
  });

  it('選択中のキャラクターが消えたら別のキャラクターへ自動で切り替わること', () => {
    addMessage('こんにちは', 'アリス', addImage());
    addMessage('やあ', 'ボブ', addImage());
    createComponent();
    fixture.detectChanges();
    const characters = component.gameCharacters();
    component.sendFrom = characters[1].identifier;
    characters[1].destroy();
    fixture.detectChanges();
    expect(component.sendFrom).toBe(characters[0].identifier);
  });

  it('反転トークン付きメッセージの立ち絵が反転表示されること', () => {
    addMessage('ふりむく 〔反転〕', 'アリス', addImage());
    createComponent();
    const stage = component.stageCharacters();
    expect(stage[0].isFlipped).toBe(true);
    component.advance();
    expect(component.displayedText()).toBe('ふりむく');
  });

  it('反転状態で send() すると 〔反転〕 が記録されること', async () => {
    const character = GameCharacter.create('反転テスト', 1, addImage());
    createComponent();
    component.sendFrom = character.identifier;
    const chatMessageService = TestBed.inject(ChatMessageService);
    const sendSpy = vi.spyOn(chatMessageService, 'sendMessage').mockReturnValue(null as unknown as ChatMessage);
    vi.spyOn(DiceBot, 'loadGameSystemAsync').mockResolvedValue(null as unknown as GameSystemClass);

    component.toggleSpeakerFlip();
    TestBed.inject(ObjectChangeService).notifyChanged(character.identifier);
    fixture.detectChanges();
    expect(component.speakerFlip()).toBe(true);

    component.text.set('ふりかえる');
    component.send();
    await vi.waitFor(() => expect(sendSpy).toHaveBeenCalled(), { timeout: 5000 });
    expect(sendSpy.mock.calls[0][1]).toBe('ふりかえる 〔反転〕');
    character.destroy();
  });

  it('ログ編集で反転を付け外しできること', () => {
    tab.addMessage({
      from: Network.peerContext.userId,
      name: 'アリス',
      text: 'ふりむく 〔反転〕',
      timestamp: nextTimestamp++,
      imageIdentifier: addImage(),
    });
    createComponent();
    component.startEditEntry(component.backlogEntries()[0]);
    expect(component.editFlipped()).toBe(true);
    component.editFlipped.set(false);
    component.saveEditEntry();
    expect(component.messages()[0].text).toBe('ふりむく');
  });

  it('選択キャラクターのチャットパレットが参照でき、行クリックで入力欄に入ること', () => {
    const character = GameCharacter.create('パレットテスト', 1, addImage());
    createComponent();
    component.sendFrom = character.identifier;
    fixture.detectChanges();
    const lines = component.speakerPalette();
    expect(lines.length).toBeGreaterThan(0);
    component.pickPaletteLine(lines[0]);
    expect(component.text()).toBe(lines[0]);
    character.destroy();
  });

  it('send() でパレットのステータス参照が評価されること', async () => {
    const character = GameCharacter.create('評価テスト', 1, addImage());
    createComponent();
    component.sendFrom = character.identifier;
    const palette = character.chatPalette;
    expect(palette).not.toBeNull();
    const evaluateSpy = vi.spyOn(palette!, 'evaluate').mockReturnValue('評価済みテキスト');
    const chatMessageService = TestBed.inject(ChatMessageService);
    const sendSpy = vi.spyOn(chatMessageService, 'sendMessage').mockReturnValue(null as unknown as ChatMessage);
    vi.spyOn(DiceBot, 'loadGameSystemAsync').mockResolvedValue(null as unknown as GameSystemClass);

    component.text.set('{HP}ダメージ！');
    component.send();
    await vi.waitFor(() => expect(sendSpy).toHaveBeenCalled(), { timeout: 5000 });
    expect(evaluateSpy).toHaveBeenCalled();
    expect(sendSpy.mock.calls[0][1]).toBe('評価済みテキスト');
    character.destroy();
  });

  it('NPC ツールの切り替えで VN の発言キャラクターが切り替わること', () => {
    const npc = GameCharacter.create('NPCテスト', 1, addImage());
    createComponent();
    const registry = TestBed.inject(ChatPaletteRegistryService);
    expect(registry.active()).not.toBeNull();
    registry.active()!.setCharacterById(npc.identifier);
    expect(component.sendFrom).toBe(npc.identifier);
    npc.destroy();
  });

  it('オートプレイ速度を上げると待ち時間が短くなること', () => {
    vi.useFakeTimers();
    TestBed.inject(VisualNovelSettingsService).setAutoPlaySpeed(2);
    addMessage('あい');
    addMessage('うえ');
    addMessage('おか');
    createComponent();
    component.toggleAutoPlay();
    fixture.detectChanges();
    vi.advanceTimersByTime(100);
    fixture.detectChanges();
    expect(component.isTyping()).toBe(false);
    vi.advanceTimersByTime(700);
    fixture.detectChanges();
    expect(component.currentIndex()).toBe(1);
  });

  it('Escape はバックログ表示中ならバックログのみ閉じること', () => {
    createComponent();
    const vnMode = TestBed.inject(VisualNovelModeService);
    vnMode.activate();
    component.showBacklog.set(true);
    component.onKeydown(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(component.showBacklog()).toBe(false);
    expect(vnMode.active()).toBe(true);
  });
});
