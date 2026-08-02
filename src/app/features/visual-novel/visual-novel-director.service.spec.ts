import { TestBed } from '@angular/core/testing';
import { ObjectChangeService } from '@axe/application/sync/object-change.service';
import { Network } from '@axe/core/index';
import { getMyPeerId } from '@axe/core/network/peer-context-source';
import { ObjectStore } from '@axe/core/sync/object-store';
import { ChatTab } from '@axe/domain/chat/chat-tab';
import { ChatTabList } from '@axe/domain/chat/chat-tab-list';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { PeerRole } from '@axe/domain/peer/peer-role';
import { VnStage } from '@axe/domain/visual-novel/vn-stage';
import { VisualNovelDirectorService } from '@axe/features/visual-novel/visual-novel-director.service';
import { VisualNovelPlaybackService } from '@axe/features/visual-novel/visual-novel-playback.service';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

describe('VisualNovelDirectorService', () => {
  let director: VisualNovelDirectorService;
  let playback: VisualNovelPlaybackService;
  let objectChange: ObjectChangeService;
  let stage: VnStage;
  let tab: ChatTab;
  let nextTimestamp = 1000;

  function addMessage(text: string): void {
    tab.addMessage({ from: Network.peerContext.userId, name: 'アリス', text, timestamp: nextTimestamp++ });
  }

  function notifyStage(): void {
    objectChange.notifyChanged(stage.identifier);
    TestBed.tick();
    TestBed.tick();
  }

  beforeEach(() => {
    PeerCursor.createMyCursor();
    TestBed.configureTestingModule({ providers: [...TEST_PROVIDERS] });
    stage = ObjectStore.instance.get<VnStage>('VnStage') ?? new VnStage('VnStage');
    stage.initialize();
    stage.stopDirecting();
    tab = ChatTabList.instance.addChatTab('テストタブ');
    objectChange = TestBed.inject(ObjectChangeService);
    playback = TestBed.inject(VisualNovelPlaybackService);
    director = TestBed.inject(VisualNovelDirectorService);
    playback.setChatTab(tab.identifier);
    playback.attach();
    TestBed.tick();
  });

  afterEach(() => {
    playback.detach();
    PeerCursor.myCursor.role = PeerRole.Player;
    stage.stopDirecting();
    tab?.destroy();
  });

  it('既定では上映モードが無効であること', () => {
    expect(director.isDirected()).toBe(false);
    expect(director.isDirector()).toBe(false);
    expect(director.isFollowing()).toBe(false);
  });

  it('GM でなければ上映モードを開始できないこと', () => {
    PeerCursor.myCursor.role = PeerRole.Player;
    objectChange.notifyChanged(PeerCursor.myCursor.identifier);

    director.toggleDirecting();

    expect(stage.isDirected).toBe(false);
  });

  it('GM は上映モードを開始・終了できること', () => {
    PeerCursor.myCursor.role = PeerRole.GameMaster;
    objectChange.notifyChanged(PeerCursor.myCursor.identifier);

    director.toggleDirecting();
    notifyStage();
    expect(director.isDirected()).toBe(true);
    expect(director.isDirector()).toBe(true);

    director.toggleDirecting();
    notifyStage();
    expect(director.isDirected()).toBe(false);
  });

  it('GM の表示位置が同期オブジェクトへ書き出されること', () => {
    addMessage('一幕');
    addMessage('二幕');
    PeerCursor.myCursor.role = PeerRole.GameMaster;
    objectChange.notifyChanged(PeerCursor.myCursor.identifier);
    director.toggleDirecting();
    notifyStage();

    playback.jumpTo(0);
    TestBed.tick();

    expect(stage.playheadIdentifier).toBe(playback.messages()[0].identifier);
    expect(stage.playheadTabIdentifier).toBe(tab.identifier);
  });

  it('追従中の参加者は上映位置へ移動し、離脱すると追従しないこと', () => {
    addMessage('一幕');
    addMessage('二幕');
    addMessage('三幕');
    stage.startDirecting('other-peer');
    notifyStage();
    expect(director.isFollowing()).toBe(true);

    stage.setPlayhead(tab.identifier, playback.messages()[0].identifier);
    notifyStage();
    expect(playback.currentIndex()).toBe(0);

    director.leaveFollowing();
    expect(director.isDetached()).toBe(true);
    stage.setPlayhead(tab.identifier, playback.messages()[1].identifier);
    notifyStage();
    expect(playback.currentIndex()).toBe(0);

    director.rejoinFollowing();
    TestBed.tick();
    expect(playback.currentIndex()).toBe(1);
  });

  it('上映モードが終了すると追従状態へ戻ること', () => {
    stage.startDirecting('other-peer');
    notifyStage();
    director.leaveFollowing();
    expect(director.following()).toBe(false);

    stage.stopDirecting();
    notifyStage();

    expect(director.following()).toBe(true);
    expect(getMyPeerId().length).toBeGreaterThan(0);
  });
});
