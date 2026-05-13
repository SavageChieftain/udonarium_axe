import { TestBed } from '@angular/core/testing';
import { CutInService } from '@axe/application/media/cut-in.service';
import { AudioFile } from '@axe/core/storage/audio-file';
import { AudioStorage } from '@axe/core/storage/audio-storage';
import { ObjectStore } from '@axe/core/sync/object-store';
import { CutIn } from '@axe/domain/media/cut-in';
import { CutInLauncher } from '@axe/domain/media/cut-in-launcher';
import { Jukebox } from '@axe/domain/media/jukebox';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

describe('CutInService.activateFromChatText()', () => {
  let service: CutInService;
  let launcher: CutInLauncher;
  let jukebox: Jukebox;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [...TEST_PROVIDERS] });

    // Clean store
    const store = ObjectStore.instance;
    store.getObjects().forEach((obj) => store.delete(obj, false));
    store.clearDeleteHistory();

    launcher = new CutInLauncher('CutInLauncher');
    launcher.initialize();
    jukebox = new Jukebox('Jukebox');
    jukebox.initialize();

    service = TestBed.inject(CutInService);
  });

  afterEach(() => {
    AudioStorage.instance.audios.forEach((a) => AudioStorage.instance.delete(a.identifier));
  });

  function makeCutIn(name: string, opts: Partial<{ audioIdentifier: string; tagName: string }> = {}): CutIn {
    const cutIn = new CutIn();
    cutIn.initialize();
    cutIn.name = name;
    cutIn.chatActivate = true;
    if (opts.audioIdentifier !== undefined) cutIn.audioIdentifier = opts.audioIdentifier;
    if (opts.tagName !== undefined) cutIn.tagName = opts.tagName;
    return cutIn;
  }

  it('テキスト末尾のワードが cutIn.name と一致すると startCutIn が呼ばれる', () => {
    const cutIn = makeCutIn('炎の剣');
    const spy = vi.spyOn(launcher, 'startCutIn');

    service.activateFromChatText('演出 炎の剣', '');

    expect(spy).toHaveBeenCalledWith(cutIn, '');
  });

  it('chatActivate=false のカットインにはマッチしない', () => {
    const cutIn = makeCutIn('攻撃');
    cutIn.chatActivate = false;
    const spy = vi.spyOn(launcher, 'startCutIn');

    service.activateFromChatText('攻撃', '');

    expect(spy).not.toHaveBeenCalled();
  });

  it('無タグで音声付きのカットインの場合 jukebox.stop() が呼ばれる', () => {
    const stopSpy = vi.spyOn(jukebox, 'stop').mockImplementation(() => {});
    AudioStorage.instance.add(AudioFile.createEmpty('cutin-audio-01'));
    makeCutIn('BGM停止', { audioIdentifier: 'cutin-audio-01', tagName: '' });
    vi.spyOn(launcher, 'startCutIn').mockImplementation(() => {});

    service.activateFromChatText('再生 BGM停止', '');

    expect(stopSpy).toHaveBeenCalledOnce();
  });

  it('@付きテキスト末尾のワードが name と一致すると startSoundOnlyCutIn が呼ばれる', () => {
    const cutIn = makeCutIn('爆発');
    const soundSpy = vi.spyOn(launcher, 'startSoundOnlyCutIn');
    const startSpy = vi.spyOn(launcher, 'startCutIn');

    service.activateFromChatText('演出 @爆発', '');

    expect(soundSpy).toHaveBeenCalledWith(cutIn, '');
    expect(startSpy).not.toHaveBeenCalled();
  });

  it('@付きのとき jukebox.stop() は呼ばれない', () => {
    const stopSpy = vi.spyOn(jukebox, 'stop').mockImplementation(() => {});
    AudioStorage.instance.add(AudioFile.createEmpty('cutin-audio-02'));
    makeCutIn('爆音', { audioIdentifier: 'cutin-audio-02', tagName: '' });
    vi.spyOn(launcher, 'startSoundOnlyCutIn').mockImplementation(() => {});

    service.activateFromChatText('@爆音', '');

    expect(stopSpy).not.toHaveBeenCalled();
  });

  it('@のみでは chatActivate カットインにマッチしない', () => {
    const cutIn = makeCutIn('');
    const soundSpy = vi.spyOn(launcher, 'startSoundOnlyCutIn');
    const startSpy = vi.spyOn(launcher, 'startCutIn');
    void cutIn;

    service.activateFromChatText('テスト @', '');

    expect(soundSpy).not.toHaveBeenCalled();
    expect(startSpy).not.toHaveBeenCalled();
  });
});
