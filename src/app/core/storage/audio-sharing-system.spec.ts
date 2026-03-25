import { Network } from '@axe/core/network/network';
import * as NetworkMessaging from '@axe/core/network/network-messaging';
import { AudioFile, AudioFileContext, AudioState } from '@axe/core/storage/audio-file';
import { AudioSharingSystem } from '@axe/core/storage/audio-sharing-system';
import { AudioStorage } from '@axe/core/storage/audio-storage';
import { BufferSharingTask } from '@axe/core/storage/buffer-sharing-task';

// ─── helpers ─────────────────────────────────────────────────────────────────

const AudioStorageMock = AudioStorage.instance as unknown as {
  get: ReturnType<typeof vi.fn>;
  add: ReturnType<typeof vi.fn>;
  synchronize: ReturnType<typeof vi.fn>;
  getCatalog: ReturnType<typeof vi.fn>;
};
const BufferSharingTaskMock = BufferSharingTask as unknown as {
  createSendTask: ReturnType<typeof vi.fn>;
  createReceiveTask: ReturnType<typeof vi.fn>;
};

function makeAudioFile(
  opts: { blob?: Blob | null; url?: string; identifier?: string; state?: AudioState } = {}
): AudioFile {
  const id = opts.identifier ?? 'audio-id';
  const audio = AudioFile.createEmpty(id);
  const ctx = (audio as unknown as { context: Record<string, unknown> }).context;
  ctx['blob'] = opts.blob ?? null;
  ctx['url'] = opts.url ?? '';
  return audio;
}

function makeTask(
  overrides: Partial<{
    identifier: string;
    sendTo: string;
    start: ReturnType<typeof vi.fn>;
    cancel: ReturnType<typeof vi.fn>;
    onprogress: unknown;
    onfinish: unknown;
  }> = {}
) {
  return {
    identifier: overrides.identifier ?? 'audio-id',
    sendTo: overrides.sendTo ?? 'peer-a',
    start: overrides.start ?? vi.fn(),
    cancel: overrides.cancel ?? vi.fn(),
    onprogress: undefined as unknown,
    onfinish: undefined as unknown,
  };
}

// emit() — localDispatch を経由して networkMessage$ にメッセージを流す
function emit(eventName: string, data: unknown, opts: { sendFrom?: string } = {}) {
  NetworkMessaging.localDispatch(eventName, data, opts.sendFrom ?? 'peer-a');
}

// ─── テストスイート ────────────────────────────────────────────────────────────

describe('AudioSharingSystem', () => {
  let sendSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // 前のインスタンスのサブスクリプションをクリーンアップ（real networkMessage$ を使うため）
    // @ts-expect-error accessing private
    AudioSharingSystem._instance?.subscription?.unsubscribe();
    // シングルトンをリセット
    // @ts-expect-error accessing private
    AudioSharingSystem._instance = undefined;

    vi.clearAllMocks();

    // Network.peerIds は毎回コピーが必要なためゲッターで設定
    Object.defineProperty(Network, 'peerIds', { get: () => ['self-peer', 'peer-a', 'peer-b'], configurable: true });
    Object.defineProperty(Network, 'peerId', { get: () => 'self-peer', configurable: true });

    // Network.instance.send をスパイして実際のネットワーク送信を防ぐ
    sendSpy = vi.spyOn(Network.instance, 'send').mockImplementation(() => {});

    vi.spyOn(AudioStorage.instance, 'getCatalog').mockReturnValue([]);
    vi.spyOn(AudioStorage.instance, 'get').mockReturnValue(null!);
    vi.spyOn(AudioStorage.instance, 'add').mockReturnValue(undefined!);
    vi.spyOn(AudioStorage.instance, 'synchronize').mockReturnValue(undefined!);
    vi.spyOn(BufferSharingTask, 'createSendTask').mockReturnValue(undefined!);
    vi.spyOn(BufferSharingTask, 'createReceiveTask').mockReturnValue(undefined!);
  });

  afterEach(() => {
    // @ts-expect-error accessing private
    AudioSharingSystem._instance?.subscription?.unsubscribe();
    vi.restoreAllMocks();
  });

  // ─── instance (シングルトン) ────────────────────────────────────────────────

  describe('instance', () => {
    it('初回アクセスでインスタンスを生成する', () => {
      const a = AudioSharingSystem.instance;
      expect(a).toBeInstanceOf(AudioSharingSystem);
    });

    it('2回目以降は同じインスタンスを返す', () => {
      const a = AudioSharingSystem.instance;
      const b = AudioSharingSystem.instance;
      expect(a).toBe(b);
    });
  });

  // ─── initialize ────────────────────────────────────────────────────────────

  describe('initialize()', () => {
    it('初期化が正常に完了する', () => {
      expect(() => AudioSharingSystem.instance.initialize()).not.toThrow();
    });
  });

  // ─── CONNECT_PEER ──────────────────────────────────────────────────────────

  describe('on CONNECT_PEER', () => {
    beforeEach(() => AudioSharingSystem.instance.initialize());

    it('isSendFromSelf=true のとき synchronize を呼ぶ', () => {
      emit('CONNECT_PEER', { peerId: 'peer-a' }, { sendFrom: 'self-peer' });
      expect(AudioStorageMock.synchronize).toHaveBeenCalled();
    });

    it('isSendFromSelf=false のとき何もしない', () => {
      emit('CONNECT_PEER', { peerId: 'peer-a' });
      expect(AudioStorageMock.synchronize).not.toHaveBeenCalled();
    });
  });

  // ─── SYNCHRONIZE_AUDIO_LIST ────────────────────────────────────────────────

  describe('on SYNCHRONIZE_AUDIO_LIST', () => {
    beforeEach(() => AudioSharingSystem.instance.initialize());

    it('isSendFromSelf=true のとき何もしない', () => {
      emit('SYNCHRONIZE_AUDIO_LIST', [], { sendFrom: 'self-peer' });
      expect(sendSpy).not.toHaveBeenCalled();
    });

    it('未知の audio は createEmpty して add する', () => {
      AudioStorageMock.get.mockReturnValue(null);
      emit('SYNCHRONIZE_AUDIO_LIST', [{ identifier: 'new-audio', state: AudioState.COMPLETE }]);
      expect(AudioStorageMock.add).toHaveBeenCalled();
    });

    it('COMPLETE 未満 (NULL) の audio は request に追加する', () => {
      const audio = makeAudioFile({ identifier: 'partial-audio' });
      AudioStorageMock.get.mockReturnValue(audio);
      emit('SYNCHRONIZE_AUDIO_LIST', [{ identifier: 'partial-audio', state: audio.state }]);
      expect(sendSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          eventName: 'REQUEST_AUDIO_RESOURE',
          data: expect.objectContaining({ receiver: 'self-peer' }),
        }),
        'peer-a'
      );
    });

    it('既に receiveTask があれば request しない', () => {
      const audio = makeAudioFile({ identifier: 'in-progress', url: 'http://a.mp3' });
      AudioStorageMock.get.mockReturnValue(audio);
      const task = makeTask({ identifier: 'in-progress' });
      BufferSharingTaskMock.createReceiveTask.mockReturnValue(task);
      // @ts-expect-error accessing private
      AudioSharingSystem.instance.receiveTaskMap.set('in-progress', task);
      emit('SYNCHRONIZE_AUDIO_LIST', [{ identifier: 'in-progress', state: audio.state }]);
      expect(sendSpy).not.toHaveBeenCalled();
    });

    it('request が空かつ receiveLimitに達していれば return する', () => {
      const audio = makeAudioFile({ identifier: 'done', blob: new Blob(['x']) });
      AudioStorageMock.get.mockReturnValue(audio);
      emit('SYNCHRONIZE_AUDIO_LIST', [{ identifier: 'done', state: AudioState.COMPLETE }]);
      expect(sendSpy).not.toHaveBeenCalled();
    });

    it('request が空 & アクティブタスクなし & catalog が少なければ自分から synchronize', () => {
      AudioStorageMock.get.mockReturnValue(null);
      AudioStorageMock.getCatalog.mockReturnValue([
        { identifier: 'local-only', state: AudioState.COMPLETE },
        { identifier: 'local-only2', state: AudioState.COMPLETE },
      ]);
      emit('SYNCHRONIZE_AUDIO_LIST', []);
      expect(AudioStorageMock.synchronize).toHaveBeenCalledWith('peer-a');
    });

    it('maxReceiveTask に達していれば request しない', () => {
      const audio = makeAudioFile({ identifier: 'limit', url: 'http://a.mp3' });
      AudioStorageMock.get.mockImplementation((id: string) => {
        if (id === 'limit') return audio;
        return makeAudioFile({ identifier: id, url: 'http://a.mp3' });
      });
      const instance = AudioSharingSystem.instance;
      for (let i = 0; i < 4; i++) {
        // @ts-expect-error accessing private
        instance.receiveTaskMap.set(`fill-${i}`, makeTask({ identifier: `fill-${i}` }));
      }
      emit('SYNCHRONIZE_AUDIO_LIST', [{ identifier: 'limit', state: AudioState.NULL }]);
      expect(sendSpy).not.toHaveBeenCalled();
    });
  });

  // ─── REQUEST_AUDIO_RESOURE ─────────────────────────────────────────────────

  describe('on REQUEST_AUDIO_RESOURE', () => {
    beforeEach(() => AudioSharingSystem.instance.initialize());

    it('isSendFromSelf=true のとき何もしない', () => {
      emit('REQUEST_AUDIO_RESOURE', { identifiers: [], receiver: 'p', candidatePeers: [] }, { sendFrom: 'self-peer' });
      expect(sendSpy).not.toHaveBeenCalled();
    });

    it('送信可能な audio があれば startSendTask を呼ぶ', async () => {
      const audio = makeAudioFile({ identifier: 'send-audio', blob: new Blob(['x']) });
      AudioStorageMock.get.mockReturnValue(audio);
      const task = makeTask({ identifier: 'send-audio', sendTo: 'peer-a' });
      BufferSharingTaskMock.createSendTask.mockReturnValue(task);

      emit('REQUEST_AUDIO_RESOURE', {
        identifiers: [{ identifier: 'send-audio', state: AudioState.NULL }],
        receiver: 'peer-r',
        candidatePeers: ['peer-a'],
      });
      await vi.waitFor(() =>
        expect(sendSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            eventName: 'START_AUDIO_TRANSMISSION',
            data: { fileIdentifier: 'send-audio' },
          }),
          'peer-r'
        )
      );
    });

    it('既に sendTask があれば中継する', () => {
      const audio = makeAudioFile({ identifier: 'exist-send', blob: new Blob(['x']) });
      AudioStorageMock.get.mockReturnValue(audio);
      const existingTask = makeTask({ identifier: 'exist-send', sendTo: 'peer-r' });
      // @ts-expect-error accessing private
      AudioSharingSystem.instance.sendTaskMap.set('exist-send', existingTask);

      emit('REQUEST_AUDIO_RESOURE', {
        identifiers: [{ identifier: 'exist-send', state: AudioState.NULL }],
        receiver: 'peer-r',
        candidatePeers: ['peer-a', 'peer-b'],
      });
      expect(sendSpy).toHaveBeenCalled();
    });

    it('randomRequest が空なら中継する', () => {
      AudioStorageMock.get.mockReturnValue(null);
      emit('REQUEST_AUDIO_RESOURE', {
        identifiers: [{ identifier: 'none', state: AudioState.NULL }],
        receiver: 'peer-r',
        candidatePeers: ['peer-b'],
      });
      expect(sendSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          eventName: 'REQUEST_AUDIO_RESOURE',
          data: expect.objectContaining({ receiver: 'peer-r' }),
        }),
        'peer-b'
      );
    });

    it('candidatePeers に自己 peer が含まれていれば splice して中継する', () => {
      AudioStorageMock.get.mockReturnValue(null);
      emit('REQUEST_AUDIO_RESOURE', {
        identifiers: [{ identifier: 'none', state: AudioState.NULL }],
        receiver: 'peer-r',
        candidatePeers: ['self-peer', 'peer-b'],
      });
      expect(sendSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          eventName: 'REQUEST_AUDIO_RESOURE',
          data: expect.objectContaining({ receiver: 'peer-r' }),
        }),
        'peer-b'
      );
    });

    it('candidatePeers が空のとき中継も行わない', () => {
      AudioStorageMock.get.mockReturnValue(null);
      emit('REQUEST_AUDIO_RESOURE', {
        identifiers: [{ identifier: 'none', state: AudioState.NULL }],
        receiver: 'peer-r',
        candidatePeers: [],
      });
      expect(sendSpy).not.toHaveBeenCalled();
    });

    it('sendTask 上限に達していれば中継する', () => {
      const audio = makeAudioFile({ identifier: 'limited', blob: new Blob(['x']) });
      AudioStorageMock.get.mockReturnValue(audio);
      const instance = AudioSharingSystem.instance;
      for (let i = 0; i < 2; i++) {
        // @ts-expect-error accessing private
        instance.sendTaskMap.set(`fill-${i}`, makeTask({ identifier: `fill-${i}`, sendTo: `peer-fill-${i}` }));
      }
      emit('REQUEST_AUDIO_RESOURE', {
        identifiers: [{ identifier: 'limited', state: AudioState.NULL }],
        receiver: 'peer-r',
        candidatePeers: ['peer-b'],
      });
      expect(BufferSharingTaskMock.createSendTask).not.toHaveBeenCalled();
    });
  });

  // ─── UPDATE_AUDIO_RESOURE ──────────────────────────────────────────────────

  describe('on UPDATE_AUDIO_RESOURE', () => {
    beforeEach(() => AudioSharingSystem.instance.initialize());

    it('blob があれば Blob に変換して add する', () => {
      const fakeArrayBuffer = new Uint8Array([1, 2, 3]).buffer;
      emit('UPDATE_AUDIO_RESOURE', [
        { identifier: 'u1', blob: fakeArrayBuffer, type: 'audio/mpeg', name: 'test', url: '' },
      ]);
      expect(AudioStorageMock.add).toHaveBeenCalled();
      const addedArg = AudioStorageMock.add.mock.calls[0][0] as AudioFileContext;
      expect(addedArg.blob).toBeInstanceOf(Blob);
    });

    it('blob がなければそのまま add する', () => {
      emit('UPDATE_AUDIO_RESOURE', [{ identifier: 'u2', blob: null, type: '', name: 'test', url: 'http://a.mp3' }]);
      expect(AudioStorageMock.add).toHaveBeenCalledWith(expect.objectContaining({ identifier: 'u2', blob: null }));
    });
  });

  // ─── START_AUDIO_TRANSMISSION ──────────────────────────────────────────────

  describe('on START_AUDIO_TRANSMISSION', () => {
    beforeEach(() => AudioSharingSystem.instance.initialize());

    it('既に receiveTask がある場合は CANCEL_TASK_ を送る', () => {
      const instance = AudioSharingSystem.instance;
      // @ts-expect-error accessing private
      instance.receiveTaskMap.set('cancel-id', makeTask({ identifier: 'cancel-id' }));
      emit('START_AUDIO_TRANSMISSION', { fileIdentifier: 'cancel-id' });
      expect(sendSpy).toHaveBeenCalledWith(
        expect.objectContaining({ eventName: 'CANCEL_TASK_cancel-id', data: null }),
        'peer-a'
      );
    });

    it('audio が COMPLETE 状態なら CANCEL_TASK_ を送る', () => {
      const audio = makeAudioFile({ identifier: 'complete-id', blob: new Blob(['x']) });
      AudioStorageMock.get.mockReturnValue(audio);
      emit('START_AUDIO_TRANSMISSION', { fileIdentifier: 'complete-id' });
      expect(sendSpy).toHaveBeenCalledWith(
        expect.objectContaining({ eventName: 'CANCEL_TASK_complete-id', data: null }),
        'peer-a'
      );
    });

    it('正常ケースでは startReceiveTask を呼ぶ', () => {
      AudioStorageMock.get.mockReturnValue(null);
      const task = makeTask({ identifier: 'recv-id' });
      BufferSharingTaskMock.createReceiveTask.mockReturnValue(task);
      emit('START_AUDIO_TRANSMISSION', { fileIdentifier: 'recv-id' });
      expect(BufferSharingTaskMock.createReceiveTask).toHaveBeenCalledWith('recv-id');
    });
  });

  // ─── startSendTask (COMPLETE 状態) ────────────────────────────────────────

  describe('startSendTask (via REQUEST_AUDIO_RESOURE)', () => {
    beforeEach(() => AudioSharingSystem.instance.initialize());

    it('URL 状態の audio は context.url をセットして送信する', async () => {
      const audio = makeAudioFile({ identifier: 'url-audio', url: 'http://example.com/a.mp3' });
      AudioStorageMock.get.mockReturnValue(audio);
      const task = makeTask({ identifier: 'url-audio', sendTo: 'peer-r' });
      BufferSharingTaskMock.createSendTask.mockReturnValue(task);

      emit('REQUEST_AUDIO_RESOURE', {
        identifiers: [{ identifier: 'url-audio', state: AudioState.NULL }],
        receiver: 'peer-r',
        candidatePeers: [],
      });

      await vi.waitFor(() => expect(task.start).toHaveBeenCalled());
      const sentContext = (task.start as ReturnType<typeof vi.fn>).mock.calls[0][0] as AudioFileContext;
      expect(sentContext.url).toBe('http://example.com/a.mp3');
    });

    it('task.onfinish が呼ばれると sendTask が削除され synchronize する', async () => {
      const audio = makeAudioFile({ identifier: 'finish-audio', blob: new Blob(['x']) });
      AudioStorageMock.get.mockReturnValue(audio);
      const task = makeTask({ identifier: 'finish-audio', sendTo: 'peer-r' });
      BufferSharingTaskMock.createSendTask.mockReturnValue(task);

      emit('REQUEST_AUDIO_RESOURE', {
        identifiers: [{ identifier: 'finish-audio', state: AudioState.NULL }],
        receiver: 'peer-r',
        candidatePeers: [],
      });

      await vi.waitFor(() => expect(task.start).toHaveBeenCalled());
      (task as unknown as { onfinish: () => void }).onfinish();
      // @ts-expect-error accessing private
      expect(AudioSharingSystem.instance.sendTaskMap.has('finish-audio')).toBe(false);
      expect(AudioStorageMock.synchronize).toHaveBeenCalled();
    });
  });

  // ─── startReceiveTask / onprogress / onfinish ─────────────────────────────

  describe('startReceiveTask (via START_AUDIO_TRANSMISSION)', () => {
    beforeEach(() => AudioSharingSystem.instance.initialize());

    it('task.onprogress が audio.apply を呼ぶ', () => {
      const audio = makeAudioFile({ identifier: 'prog-id' });
      AudioStorageMock.get.mockReturnValue(audio);
      const task = makeTask({ identifier: 'prog-id' });
      BufferSharingTaskMock.createReceiveTask.mockReturnValue(task);
      const applySpy = vi.spyOn(audio, 'apply');

      emit('START_AUDIO_TRANSMISSION', { fileIdentifier: 'prog-id' });

      const onprogress = (
        task as unknown as {
          onprogress: (t: unknown, loaded: number, total: number) => void;
        }
      ).onprogress;
      onprogress(task, 50, 100);
      expect(applySpy).toHaveBeenCalled();
    });

    it('task.onfinish が呼ばれると receiveTask が削除され synchronize する', () => {
      const audio = makeAudioFile({ identifier: 'fin-id' });
      AudioStorageMock.get.mockReturnValue(audio);
      const task = makeTask({ identifier: 'fin-id' });
      BufferSharingTaskMock.createReceiveTask.mockReturnValue(task);

      emit('START_AUDIO_TRANSMISSION', { fileIdentifier: 'fin-id' });

      const onfinish = (
        task as unknown as {
          onfinish: (t: unknown, data: AudioFileContext | null) => void;
        }
      ).onfinish;
      const fakeContext: AudioFileContext = { identifier: 'fin-id', name: 'fin', blob: null, type: '', url: '' };
      onfinish(task, fakeContext);

      // @ts-expect-error accessing private
      expect(AudioSharingSystem.instance.receiveTaskMap.has('fin-id')).toBe(false);
      // localDispatch が UPDATE_AUDIO_RESOURE を発行 → SUT が add する
      expect(AudioStorageMock.add).toHaveBeenCalledWith(expect.objectContaining({ identifier: 'fin-id' }));
      expect(AudioStorageMock.synchronize).toHaveBeenCalled();
    });

    it('task.onfinish で data が null なら localDispatch しない', () => {
      const audio = makeAudioFile({ identifier: 'nil-id' });
      AudioStorageMock.get.mockReturnValue(audio);
      const task = makeTask({ identifier: 'nil-id' });
      BufferSharingTaskMock.createReceiveTask.mockReturnValue(task);

      emit('START_AUDIO_TRANSMISSION', { fileIdentifier: 'nil-id' });

      const onfinish = (
        task as unknown as {
          onfinish: (t: unknown, data: AudioFileContext | null) => void;
        }
      ).onfinish;
      AudioStorageMock.add.mockClear();
      onfinish(task, null);
      // data が null なら localDispatch されないため add も呼ばれない
      expect(AudioStorageMock.add).not.toHaveBeenCalled();
    });
  });
});
