import { TestBed } from '@angular/core/testing';
import { ObjectChangeService } from '@axe/application/sync/object-change.service';
import { ImageStorage } from '@axe/core/storage/image-storage';
import { ObjectStore } from '@axe/core/sync/object-store';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { PeerRole } from '@axe/domain/peer/peer-role';
import { VnStage } from '@axe/domain/visual-novel/vn-stage';
import { VisualNovelSceneService } from '@axe/features/visual-novel/visual-novel-scene.service';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

describe('VisualNovelSceneService', () => {
  let service: VisualNovelSceneService;
  let stage: VnStage;
  let imageIdentifier: string;
  let objectChange: ObjectChangeService;

  function becomeGameMaster(): void {
    PeerCursor.myCursor.role = PeerRole.GameMaster;
    objectChange.notifyChanged(PeerCursor.myCursor.identifier);
  }

  beforeEach(() => {
    PeerCursor.createMyCursor();
    TestBed.configureTestingModule({ providers: [...TEST_PROVIDERS] });
    stage = ObjectStore.instance.get<VnStage>('VnStage') ?? new VnStage('VnStage');
    stage.initialize();
    stage.backgroundImageIdentifier = '';
    stage.transition = 'fade';
    imageIdentifier = ImageStorage.instance.add('test://vn/background.png').identifier;
    service = TestBed.inject(VisualNovelSceneService);
    objectChange = TestBed.inject(ObjectChangeService);
  });

  afterEach(() => {
    PeerCursor.myCursor.role = PeerRole.Player;
  });

  it('背景が未設定なら背景レイヤーを描かないこと', () => {
    expect(service.hasBackground()).toBe(false);
    expect(service.backgroundUrl()).toBe('');
  });

  it('GM は背景を差し替えてトランジションを進められること', () => {
    becomeGameMaster();
    expect(service.canDirect()).toBe(true);
    const before = service.transitionTrigger();

    stage.setBackground(imageIdentifier, 'wipe');
    objectChange.notifyChanged(stage.identifier);

    expect(service.hasBackground()).toBe(true);
    expect(service.backgroundUrl().length).toBeGreaterThan(0);
    expect(service.transition()).toBe('wipe');
    expect(service.transitionTrigger()).toBe(before + 1);
  });

  it('GM でなければ背景操作を受け付けないこと', () => {
    PeerCursor.myCursor.role = PeerRole.Player;
    stage.backgroundImageIdentifier = imageIdentifier;

    service.clearBackground();
    service.setTransition('none');

    expect(stage.backgroundImageIdentifier).toBe(imageIdentifier);
    expect(stage.transition).toBe('fade');
  });

  it('GM は背景を解除できること', () => {
    becomeGameMaster();
    stage.backgroundImageIdentifier = imageIdentifier;
    objectChange.notifyChanged(stage.identifier);

    service.clearBackground();

    expect(stage.backgroundImageIdentifier).toBe('');
  });
});
