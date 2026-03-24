import { EventSystem, Network } from '@axe/core/index';
import { AudioFile, AudioFileContext, AudioState } from '@axe/core/storage/audio-file';
import { AudioSharingSystem } from '@axe/core/storage/audio-sharing-system';
import { AudioStorage } from '@axe/core/storage/audio-storage';
import { BufferSharingTask } from '@axe/core/storage/buffer-sharing-task';

// ─── helpers ─────────────────────────────────────────────────────────────────

// vi.spyOn でモック化するため型キャストのみ行う
const EventSystemMock = EventSystem as unknown as {
  register: ReturnType<typeof vi.fn>;
  unregister: ReturnType<typeof vi.fn>;
  call: ReturnType<typeof vi.fn>;
  trigger: ReturnType<typeof vi.fn>;
};
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

// EventSystem.register().on() チェーンで登録されたハンドラを event 名で取り出す
// beforeEach 内で設定される listenerMock を参照する
let currentListenerMock: { on: ReturnType<typeof vi.fn> };

function getHandler(eventName: string): ((event: Record<string, unknown>) => void) | undefined {
  for (const call of currentListenerMock.on.mock.calls) {
    if (call[0] === eventName) {
      // .on(name, priority, handler) or .on(name, handler)
      return typeof call[1] === 'function' ? call[1] : call[2];
    }
  }
  return undefined;
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

// ─── テストスイート ────────────────────────────────────────────────────────────

describe('AudioSharingSystem', () => {
  beforeEach(() => {
    // シングルトンをリセット
    // @ts-expect-error accessing private
    AudioSharingSystem._instance = undefined;

    vi.clearAllMocks();

    // register().on() が this を返すチェーンを再設定
    currentListenerMock = { on: vi.fn().mockReturnThis() };
    vi.spyOn(EventSystem, 'register').mockReturnValue(
      currentListenerMock as unknown as ReturnType<typeof EventSystem.register>
    );
    vi.spyOn(EventSystem, 'unregister').mockImplementation(() => {});
    vi.spyOn(EventSystem, 'call').mockImplementation(() => {});
    (
      vi.spyOn(EventSystem, 'trigger') as unknown as { mockImplementation: (fn: () => void) => void }
    ).mockImplementation(() => {});

    // Network.peerIds は毎回コピーが必要なためゲッターで設定
    Object.defineProperty(Network, 'peerIds', { get: () => ['self-peer', 'peer-a', 'peer-b'], configurable: true });
    Object.defineProperty(Network, 'peerId', { get: () => 'self-peer', configurable: true });

    vi.spyOn(AudioStorage.instance, 'getCatalog').mockReturnValue([]);
    vi.spyOn(AudioStorage.instance, 'get').mockReturnValue(null!);
    vi.spyOn(AudioStorage.instance, 'add').mockReturnValue(undefined!);
    vi.spyOn(AudioStorage.instance, 'synchronize').mockReturnValue(undefined!);
    vi.spyOn(BufferSharingTask, 'createSendTask').mockReturnValue(undefined!);
    vi.spyOn(BufferSharingTask, 'createReceiveTask').mockReturnValue(undefined!);
  });

  afterEach(() => {
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
    it('EventSystem.unregister を呼んでから EventSystem.register を呼ぶ', () => {
      AudioSharingSystem.instance.initialize();
      expect(EventSystemMock.unregister).toHaveBeenCalled();
      expect(EventSystemMock.register).toHaveBeenCalled();
    });

    it('.on() で必要なイベントをすべて登録する', () => {
      AudioSharingSystem.instance.initialize();
      const listenerMock = EventSystemMock.register.mock.results[0].value as { on: ReturnType<typeof vi.fn> };
      const registeredEvents = listenerMock.on.mock.calls.map((c: unknown[]) => c[0]);
      expect(registeredEvents).toContain('CONNECT_PEER');
      expect(registeredEvents).toContain('SYNCHRONIZE_AUDIO_LIST');
      expect(registeredEvents).toContain('REQUEST_AUDIO_RESOURE');
      expect(registeredEvents).toContain('UPDATE_AUDIO_RESOURE');
      expect(registeredEvents).toContain('START_AUDIO_TRANSMISSION');
    });
  });

  // ─── CONNECT_PEER ──────────────────────────────────────────────────────────

  describe('on CONNECT_PEER', () => {
    beforeEach(() => AudioSharingSystem.instance.initialize());

    it('isSendFromSelf=true のとき synchronize を呼ぶ', () => {
      const handler = getHandler('CONNECT_PEER')!;
      handler({ isSendFromSelf: true, data: { peerId: 'peer-a' } });
      expect(AudioStorageMock.synchronize).toHaveBeenCalled();
    });

    it('isSendFromSelf=false のとき何もしない', () => {
      const handler = getHandler('CONNECT_PEER')!;
      handler({ isSendFromSelf: false, data: { peerId: 'peer-a' } });
      expect(AudioStorageMock.synchronize).not.toHaveBeenCalled();
    });
  });

  // ─── SYNCHRONIZE_AUDIO_LIST ────────────────────────────────────────────────

  describe('on SYNCHRONIZE_AUDIO_LIST', () => {
    beforeEach(() => AudioSharingSystem.instance.initialize());

    it('isSendFromSelf=true のとき何もしない', () => {
      const handler = getHandler('SYNCHRONIZE_AUDIO_LIST')!;
      handler({ isSendFromSelf: true, data: [], sendFrom: 'peer-a' });
      expect(EventSystemMock.call).not.toHaveBeenCalled();
    });

    it('未知の audio は createEmpty して add する', () => {
      AudioStorageMock.get.mockReturnValue(null);
      const handler = getHandler('SYNCHRONIZE_AUDIO_LIST')!;
      handler({
        isSendFromSelf: false,
        sendFrom: 'peer-a',
        data: [{ identifier: 'new-audio', state: AudioState.COMPLETE }],
      });
      expect(AudioStorageMock.add).toHaveBeenCalled();
    });

    it('COMPLETE 未満 (NULL) の audio は request に追加する', () => {
      // AudioState.NULL=0 < AudioState.COMPLETE=1 なのでリクエスト対象になる
      const audio = makeAudioFile({ identifier: 'partial-audio' }); // blob/url なし → state=NULL
      AudioStorageMock.get.mockReturnValue(audio);
      const handler = getHandler('SYNCHRONIZE_AUDIO_LIST')!;
      handler({
        isSendFromSelf: false,
        sendFrom: 'peer-a',
        data: [{ identifier: 'partial-audio', state: audio.state }],
      });
      expect(EventSystemMock.call).toHaveBeenCalledWith(
        'REQUEST_AUDIO_RESOURE',
        expect.objectContaining({ receiver: 'self-peer' }),
        'peer-a'
      );
    });

    it('既に receiveTask があれば request しない', () => {
      const audio = makeAudioFile({ identifier: 'in-progress', url: 'http://a.mp3' });
      AudioStorageMock.get.mockReturnValue(audio);
      // receiveTask をセット
      const task = makeTask({ identifier: 'in-progress' });
      BufferSharingTaskMock.createReceiveTask.mockReturnValue(task);
      // @ts-expect-error accessing private
      AudioSharingSystem.instance.receiveTaskMap.set('in-progress', task);
      const handler = getHandler('SYNCHRONIZE_AUDIO_LIST')!;
      handler({
        isSendFromSelf: false,
        sendFrom: 'peer-a',
        data: [{ identifier: 'in-progress', state: audio.state }],
      });
      expect(EventSystemMock.call).not.toHaveBeenCalled();
    });

    it('request が空かつ receiveLimitに達していれば return する', () => {
      const audio = makeAudioFile({ identifier: 'done', blob: new Blob(['x']) });
      AudioStorageMock.get.mockReturnValue(audio);
      const handler = getHandler('SYNCHRONIZE_AUDIO_LIST')!;
      handler({
        isSendFromSelf: false,
        sendFrom: 'peer-a',
        data: [{ identifier: 'done', state: AudioState.COMPLETE }],
      });
      expect(EventSystemMock.call).not.toHaveBeenCalled();
    });

    it('request が空 & アクティブタスクなし & catalog が少なければ自分から synchronize', () => {
      AudioStorageMock.get.mockReturnValue(null);
      AudioStorageMock.getCatalog.mockReturnValue([
        { identifier: 'local-only', state: AudioState.COMPLETE },
        { identifier: 'local-only2', state: AudioState.COMPLETE },
      ]);
      // otherCatalog は 0 件 → request も空 → getCatalog().length > 0
      const handler = getHandler('SYNCHRONIZE_AUDIO_LIST')!;
      handler({
        isSendFromSelf: false,
        sendFrom: 'peer-a',
        data: [], // otherCatalog.length (0) < getCatalog().length (2)
      });
      expect(AudioStorageMock.synchronize).toHaveBeenCalledWith('peer-a');
    });

    it('maxReceiveTask に達していれば request しない', () => {
      const audio = makeAudioFile({ identifier: 'limit', url: 'http://a.mp3' });
      AudioStorageMock.get.mockImplementation((id) => {
        if (id === 'limit') return audio;
        return makeAudioFile({ identifier: id, url: 'http://a.mp3' });
      });
      // receiveTaskMap を maxReceiveTask(4) 個で埋める
      const instance = AudioSharingSystem.instance;
      for (let i = 0; i < 4; i++) {
        // @ts-expect-error accessing private
        instance.receiveTaskMap.set(`fill-${i}`, makeTask({ identifier: `fill-${i}` }));
      }
      const handler = getHandler('SYNCHRONIZE_AUDIO_LIST')!;
      handler({
        isSendFromSelf: false,
        sendFrom: 'peer-a',
        data: [{ identifier: 'limit', state: AudioState.NULL }],
      });
      expect(EventSystemMock.call).not.toHaveBeenCalled();
    });
  });

  // ─── REQUEST_AUDIO_RESOURE ─────────────────────────────────────────────────

  describe('on REQUEST_AUDIO_RESOURE', () => {
    beforeEach(() => AudioSharingSystem.instance.initialize());

    it('isSendFromSelf=true のとき何もしない', () => {
      const handler = getHandler('REQUEST_AUDIO_RESOURE')!;
      handler({ isSendFromSelf: true, data: { identifiers: [], receiver: 'p', candidatePeers: [] } });
      expect(EventSystemMock.call).not.toHaveBeenCalled();
    });

    it('送信可能な audio があれば startSendTask を呼ぶ', async () => {
      const audio = makeAudioFile({ identifier: 'send-audio', blob: new Blob(['x']) });
      AudioStorageMock.get.mockReturnValue(audio);
      const task = makeTask({ identifier: 'send-audio', sendTo: 'peer-a' });
      BufferSharingTaskMock.createSendTask.mockReturnValue(task);

      const handler = getHandler('REQUEST_AUDIO_RESOURE')!;
      handler({
        isSendFromSelf: false,
        sendFrom: 'peer-a',
        data: {
          identifiers: [{ identifier: 'send-audio', state: AudioState.NULL }],
          receiver: 'peer-r',
          candidatePeers: ['peer-a'],
        },
      });
      // startSendTask は async なので START_AUDIO_TRANSMISSION が呼ばれるのを待つ
      await vi.waitFor(() =>
        expect(EventSystemMock.call).toHaveBeenCalledWith(
          'START_AUDIO_TRANSMISSION',
          { fileIdentifier: 'send-audio' },
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

      const handler = getHandler('REQUEST_AUDIO_RESOURE')!;
      handler({
        isSendFromSelf: false,
        sendFrom: 'peer-a',
        data: {
          identifiers: [{ identifier: 'exist-send', state: AudioState.NULL }],
          receiver: 'peer-r',
          candidatePeers: ['peer-a', 'peer-b'],
          identifiers_raw: [],
        },
      });
      // 中継: candidatePeers のうち self を除いた先頭に call
      expect(EventSystemMock.call).toHaveBeenCalled();
    });

    it('randomRequest が空なら中継する', () => {
      // audio が null → randomRequest 空
      AudioStorageMock.get.mockReturnValue(null);
      const handler = getHandler('REQUEST_AUDIO_RESOURE')!;
      const mockEvent = {
        isSendFromSelf: false,
        sendFrom: 'peer-a',
        data: {
          identifiers: [{ identifier: 'none', state: AudioState.NULL }],
          receiver: 'peer-r',
          candidatePeers: ['peer-b'],
        },
      };
      handler(mockEvent);
      // candidatePeers から自分を除き peer-b に中継
      expect(EventSystemMock.call).toHaveBeenCalledWith(mockEvent, 'peer-b');
    });

    it('candidatePeers に自己 peer が含まれていれば splice して中継する', () => {
      // Network.peerId='self-peer' が candidatePeers に含まれる場合は splice で自己を除いてから中継する
      AudioStorageMock.get.mockReturnValue(null);
      const handler = getHandler('REQUEST_AUDIO_RESOURE')!;
      const mockEvent = {
        isSendFromSelf: false,
        sendFrom: 'peer-a',
        data: {
          identifiers: [{ identifier: 'none', state: AudioState.NULL }],
          receiver: 'peer-r',
          candidatePeers: ['self-peer', 'peer-b'], // 自己 peer を含む
        },
      };
      handler(mockEvent);
      // self-peer が除かれた後、peer-b に中継
      expect(EventSystemMock.call).toHaveBeenCalledWith(mockEvent, 'peer-b');
    });

    it('candidatePeers が空のとき中継も行わない', () => {
      AudioStorageMock.get.mockReturnValue(null);
      const handler = getHandler('REQUEST_AUDIO_RESOURE')!;
      handler({
        isSendFromSelf: false,
        sendFrom: 'peer-a',
        data: {
          identifiers: [{ identifier: 'none', state: AudioState.NULL }],
          receiver: 'peer-r',
          candidatePeers: [],
        },
      });
      expect(EventSystemMock.call).not.toHaveBeenCalled();
    });

    it('sendTask 上限に達していれば中継する', () => {
      const audio = makeAudioFile({ identifier: 'limited', blob: new Blob(['x']) });
      AudioStorageMock.get.mockReturnValue(audio);
      const instance = AudioSharingSystem.instance;
      // sendTaskMap を maxSendTask(2) 個で埋める
      for (let i = 0; i < 2; i++) {
        // @ts-expect-error accessing private
        instance.sendTaskMap.set(`fill-${i}`, makeTask({ identifier: `fill-${i}`, sendTo: `peer-fill-${i}` }));
      }
      const handler = getHandler('REQUEST_AUDIO_RESOURE')!;
      handler({
        isSendFromSelf: false,
        sendFrom: 'peer-a',
        data: {
          identifiers: [{ identifier: 'limited', state: AudioState.NULL }],
          receiver: 'peer-r',
          candidatePeers: ['peer-b'],
        },
      });
      // 送信ではなく中継
      expect(BufferSharingTaskMock.createSendTask).not.toHaveBeenCalled();
    });
  });

  // ─── UPDATE_AUDIO_RESOURE ──────────────────────────────────────────────────

  describe('on UPDATE_AUDIO_RESOURE', () => {
    beforeEach(() => AudioSharingSystem.instance.initialize());

    it('blob があれば Blob に変換して add する', () => {
      const handler = getHandler('UPDATE_AUDIO_RESOURE')!;
      const fakeArrayBuffer = new Uint8Array([1, 2, 3]).buffer;
      handler({
        isSendFromSelf: false,
        sendFrom: 'peer-a',
        data: [{ identifier: 'u1', blob: fakeArrayBuffer, type: 'audio/mpeg', name: 'test', url: '' }],
      });
      expect(AudioStorageMock.add).toHaveBeenCalled();
      const addedArg = AudioStorageMock.add.mock.calls[0][0] as AudioFileContext;
      expect(addedArg.blob).toBeInstanceOf(Blob);
    });

    it('blob がなければそのまま add する', () => {
      const handler = getHandler('UPDATE_AUDIO_RESOURE')!;
      handler({
        isSendFromSelf: false,
        sendFrom: 'peer-a',
        data: [{ identifier: 'u2', blob: null, type: '', name: 'test', url: 'http://a.mp3' }],
      });
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
      const handler = getHandler('START_AUDIO_TRANSMISSION')!;
      handler({ isSendFromSelf: false, sendFrom: 'peer-a', data: { fileIdentifier: 'cancel-id' } });
      expect(EventSystemMock.call).toHaveBeenCalledWith('CANCEL_TASK_cancel-id', null, 'peer-a');
    });

    it('audio が COMPLETE 状態なら CANCEL_TASK_ を送る', () => {
      const audio = makeAudioFile({ identifier: 'complete-id', blob: new Blob(['x']) });
      AudioStorageMock.get.mockReturnValue(audio);
      const handler = getHandler('START_AUDIO_TRANSMISSION')!;
      handler({ isSendFromSelf: false, sendFrom: 'peer-a', data: { fileIdentifier: 'complete-id' } });
      expect(EventSystemMock.call).toHaveBeenCalledWith('CANCEL_TASK_complete-id', null, 'peer-a');
    });

    it('正常ケースでは startReceiveTask を呼ぶ', () => {
      // audio が null か isReady=false のとき startReceiveTask ブランチに進む
      AudioStorageMock.get.mockReturnValue(null);
      const task = makeTask({ identifier: 'recv-id' });
      BufferSharingTaskMock.createReceiveTask.mockReturnValue(task);
      const handler = getHandler('START_AUDIO_TRANSMISSION')!;
      handler({ isSendFromSelf: false, sendFrom: 'peer-a', data: { fileIdentifier: 'recv-id' } });
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

      const handler = getHandler('REQUEST_AUDIO_RESOURE')!;
      handler({
        isSendFromSelf: false,
        sendFrom: 'peer-a',
        data: {
          identifiers: [{ identifier: 'url-audio', state: AudioState.NULL }],
          receiver: 'peer-r',
          candidatePeers: [],
        },
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

      const handler = getHandler('REQUEST_AUDIO_RESOURE')!;
      handler({
        isSendFromSelf: false,
        sendFrom: 'peer-a',
        data: {
          identifiers: [{ identifier: 'finish-audio', state: AudioState.NULL }],
          receiver: 'peer-r',
          candidatePeers: [],
        },
      });

      await vi.waitFor(() => expect(task.start).toHaveBeenCalled());
      // onfinish を手動発火
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
      // NULL 状態(blob/url なし) → isReady=false → startReceiveTask に進む
      const audio = makeAudioFile({ identifier: 'prog-id' });
      AudioStorageMock.get.mockReturnValue(audio);
      const task = makeTask({ identifier: 'prog-id' });
      BufferSharingTaskMock.createReceiveTask.mockReturnValue(task);
      const applySpy = vi.spyOn(audio, 'apply');

      const handler = getHandler('START_AUDIO_TRANSMISSION')!;
      handler({ isSendFromSelf: false, sendFrom: 'peer-a', data: { fileIdentifier: 'prog-id' } });

      const onprogress = (
        task as unknown as {
          onprogress: (t: unknown, loaded: number, total: number) => void;
        }
      ).onprogress;
      onprogress(task, 50, 100);
      expect(applySpy).toHaveBeenCalled();
    });

    it('task.onfinish が呼ばれると receiveTask が削除され synchronize する', () => {
      const audio = makeAudioFile({ identifier: 'fin-id' }); // NULL 状態
      AudioStorageMock.get.mockReturnValue(audio);
      const task = makeTask({ identifier: 'fin-id' });
      BufferSharingTaskMock.createReceiveTask.mockReturnValue(task);

      const handler = getHandler('START_AUDIO_TRANSMISSION')!;
      handler({ isSendFromSelf: false, sendFrom: 'peer-a', data: { fileIdentifier: 'fin-id' } });

      const onfinish = (
        task as unknown as {
          onfinish: (t: unknown, data: AudioFileContext | null) => void;
        }
      ).onfinish;
      const fakeContext: AudioFileContext = { identifier: 'fin-id', name: 'fin', blob: null, type: '', url: '' };
      onfinish(task, fakeContext);

      // @ts-expect-error accessing private
      expect(AudioSharingSystem.instance.receiveTaskMap.has('fin-id')).toBe(false);
      expect(EventSystemMock.trigger).toHaveBeenCalledWith('UPDATE_AUDIO_RESOURE', [fakeContext]);
      expect(AudioStorageMock.synchronize).toHaveBeenCalled();
    });

    it('task.onfinish で data が null なら trigger しない', () => {
      const audio = makeAudioFile({ identifier: 'nil-id' }); // NULL 状態
      AudioStorageMock.get.mockReturnValue(audio);
      const task = makeTask({ identifier: 'nil-id' });
      BufferSharingTaskMock.createReceiveTask.mockReturnValue(task);

      const handler = getHandler('START_AUDIO_TRANSMISSION')!;
      handler({ isSendFromSelf: false, sendFrom: 'peer-a', data: { fileIdentifier: 'nil-id' } });

      const onfinish = (
        task as unknown as {
          onfinish: (t: unknown, data: AudioFileContext | null) => void;
        }
      ).onfinish;
      onfinish(task, null);
      expect(EventSystemMock.trigger).not.toHaveBeenCalled();
    });
  });
});
