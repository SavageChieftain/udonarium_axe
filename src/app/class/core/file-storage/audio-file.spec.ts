import { AudioFile, AudioFileContext, AudioState } from '@axe/class/core/file-storage/audio-file';

describe('AudioFile', () => {
  let createObjectURLSpy: ReturnType<typeof vi.spyOn>;
  let revokeObjectURLSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
    revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockReturnValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ----------------------------------------------------------------
  // isHidden
  // ----------------------------------------------------------------
  describe('isHidden', () => {
    it('デフォルト値は false', () => {
      const audio = AudioFile.createEmpty('id1');
      expect(audio.isHidden).toBe(false);
    });
  });

  // ----------------------------------------------------------------
  // AudioState
  // ----------------------------------------------------------------
  describe('state', () => {
    it('url も blob もなければ NULL', () => {
      const audio = AudioFile.createEmpty('id1');
      expect(audio.state).toBe(AudioState.NULL);
    });

    it('url があり blob がなければ URL', () => {
      const audio = AudioFile.create('https://example.com/sound.mp3');
      expect(audio.state).toBe(AudioState.URL);
    });

    it('blob があれば COMPLETE', () => {
      const context: AudioFileContext = {
        identifier: 'id1',
        name: 'sound.mp3',
        type: 'audio/mpeg',
        blob: new Blob(['data'], { type: 'audio/mpeg' }),
        url: '',
      };
      const audio = AudioFile.create(context);
      expect(audio.state).toBe(AudioState.COMPLETE);
    });

    it('url と blob が両方ある場合も COMPLETE', () => {
      const context: AudioFileContext = {
        identifier: 'id1',
        name: 'sound.mp3',
        type: 'audio/mpeg',
        blob: new Blob(['data'], { type: 'audio/mpeg' }),
        url: 'https://example.com/sound.mp3',
      };
      const audio = AudioFile.create(context);
      expect(audio.state).toBe(AudioState.COMPLETE);
    });
  });

  // ----------------------------------------------------------------
  // isReady
  // ----------------------------------------------------------------
  describe('isReady', () => {
    it('state が NULL のとき false', () => {
      const audio = AudioFile.createEmpty('id1');
      expect(audio.isReady).toBe(false);
    });

    it('state が URL のとき true', () => {
      const audio = AudioFile.create('https://example.com/sound.mp3');
      expect(audio.isReady).toBe(true);
    });
  });

  // ----------------------------------------------------------------
  // createEmpty
  // ----------------------------------------------------------------
  describe('createEmpty', () => {
    it('identifier が設定される', () => {
      const audio = AudioFile.createEmpty('test-id');
      expect(audio.identifier).toBe('test-id');
    });

    it('name / url / blob は空', () => {
      const audio = AudioFile.createEmpty('test-id');
      expect(audio.name).toBe('');
      expect(audio.url).toBe('');
      expect(audio.blob).toBeNull();
    });
  });

  // ----------------------------------------------------------------
  // create(string)
  // ----------------------------------------------------------------
  describe('create(url: string)', () => {
    it('identifier / name / url がすべて引数の文字列になる', () => {
      const url = 'https://example.com/sound.mp3';
      const audio = AudioFile.create(url);
      expect(audio.identifier).toBe(url);
      expect(audio.name).toBe(url);
      expect(audio.url).toBe(url);
    });

    it('state が URL になる', () => {
      const audio = AudioFile.create('https://example.com/sound.mp3');
      expect(audio.state).toBe(AudioState.URL);
    });
  });

  // ----------------------------------------------------------------
  // create(AudioFileContext)
  // ----------------------------------------------------------------
  describe('create(context: AudioFileContext)', () => {
    it('context の内容が反映される', () => {
      const blob = new Blob(['data'], { type: 'audio/mpeg' });
      const context: AudioFileContext = {
        identifier: 'ctx-id',
        name: 'ctx.mp3',
        type: 'audio/mpeg',
        blob,
        url: '',
      };
      const audio = AudioFile.create(context);
      expect(audio.identifier).toBe('ctx-id');
      expect(audio.name).toBe('ctx.mp3');
      expect(audio.blob).toBe(blob);
    });

    it('blob があれば createObjectURL が呼ばれ url が設定される', () => {
      const blob = new Blob(['data'], { type: 'audio/mpeg' });
      const context: AudioFileContext = {
        identifier: 'ctx-id',
        name: 'ctx.mp3',
        type: 'audio/mpeg',
        blob,
        url: '',
      };
      AudioFile.create(context);
      expect(createObjectURLSpy).toHaveBeenCalledWith(blob);
    });
  });

  // ----------------------------------------------------------------
  // apply
  // ----------------------------------------------------------------
  describe('apply', () => {
    it('identifier は空のときのみ上書きされる', () => {
      const audio = AudioFile.createEmpty('original-id');
      audio.apply({ identifier: 'new-id', name: '', type: '', blob: null, url: '' });
      expect(audio.identifier).toBe('original-id');
    });

    it('identifier が空なら apply で設定される', () => {
      const audio = AudioFile.createEmpty('');
      audio.apply({ identifier: 'set-id', name: '', type: '', blob: null, url: '' });
      expect(audio.identifier).toBe('set-id');
    });

    it('name は常に上書きされる', () => {
      const context: AudioFileContext = {
        identifier: 'id1',
        name: 'original.mp3',
        type: 'audio/mpeg',
        blob: null,
        url: 'https://example.com/sound.mp3',
      };
      const audio = AudioFile.create(context);
      audio.apply({ identifier: '', name: 'updated.mp3', type: '', blob: null, url: '' });
      expect(audio.name).toBe('updated.mp3');
    });

    it('blob は null のときのみ上書きされる', () => {
      const originalBlob = new Blob(['original'], { type: 'audio/mpeg' });
      const newBlob = new Blob(['new'], { type: 'audio/mpeg' });
      const context: AudioFileContext = {
        identifier: 'id1',
        name: 'sound.mp3',
        type: 'audio/mpeg',
        blob: originalBlob,
        url: '',
      };
      const audio = AudioFile.create(context);
      audio.apply({ identifier: '', name: '', type: '', blob: newBlob, url: '' });
      expect(audio.blob).toBe(originalBlob);
    });

    it('url は空のときのみ上書きされる', () => {
      const context: AudioFileContext = {
        identifier: 'id1',
        name: 'sound.mp3',
        type: 'audio/mpeg',
        blob: null,
        url: 'https://example.com/original.mp3',
      };
      const audio = AudioFile.create(context);
      audio.apply({ identifier: '', name: '', type: '', blob: null, url: 'https://example.com/new.mp3' });
      expect(audio.url).toBe('https://example.com/original.mp3');
    });

    it('type は空のときのみ上書きされる', () => {
      const context: AudioFileContext = {
        identifier: 'id1',
        name: 'sound.mp3',
        type: 'audio/mpeg',
        blob: null,
        url: 'https://example.com/sound.mp3',
      };
      const audio = AudioFile.create(context);
      audio.apply({ identifier: '', name: '', type: 'audio/ogg', blob: null, url: '' });
      expect(audio.toContext().type).toBe('audio/mpeg');
    });

    it('blob がない状態で blob を apply すると url が自動生成される', () => {
      const audio = AudioFile.createEmpty('id1');
      const blob = new Blob(['data'], { type: 'audio/mpeg' });
      audio.apply({ identifier: '', name: 'sound.mp3', type: 'audio/mpeg', blob, url: '' });
      expect(createObjectURLSpy).toHaveBeenCalledWith(blob);
      expect(audio.url).toBe('blob:mock-url');
    });
  });

  // ----------------------------------------------------------------
  // toContext
  // ----------------------------------------------------------------
  describe('toContext', () => {
    it('現在の context を返す', () => {
      const url = 'https://example.com/sound.mp3';
      const audio = AudioFile.create(url);
      const ctx = audio.toContext();
      expect(ctx.identifier).toBe(url);
      expect(ctx.url).toBe(url);
    });

    it('blob / type を含む完全な context を返す', () => {
      const blob = new Blob(['data'], { type: 'audio/mpeg' });
      const context: AudioFileContext = {
        identifier: 'id1',
        name: 'sound.mp3',
        type: 'audio/mpeg',
        blob,
        url: '',
      };
      const audio = AudioFile.create(context);
      const ctx = audio.toContext();
      expect(ctx.blob).toBe(blob);
      expect(ctx.type).toBe('audio/mpeg');
      expect(ctx.name).toBe('sound.mp3');
    });
  });

  // ----------------------------------------------------------------
  // createAsync
  // ----------------------------------------------------------------
  describe('createAsync', () => {
    it('Blob から AudioFile を生成する', async () => {
      const blob = new Blob(['audio data'], { type: 'audio/mpeg' });
      const audio = await AudioFile.createAsync(blob);
      expect(audio).toBeTruthy();
      expect(audio.identifier).toBeTruthy();
      expect(audio.blob).toBeTruthy();
      expect(audio.state).toBe(AudioState.COMPLETE);
    });

    it('File から生成すると name が設定される', async () => {
      const file = new File(['audio data'], 'test.mp3', { type: 'audio/mpeg' });
      const audio = await AudioFile.createAsync(file);
      expect(audio.name).toBe('test.mp3');
    });

    it('name のない Blob から生成すると name が identifier になる', async () => {
      const blob = new Blob(['audio data'], { type: 'audio/mpeg' });
      const audio = await AudioFile.createAsync(blob);
      expect(audio.name).toBe(audio.identifier);
    });
  });

  // ----------------------------------------------------------------
  // destroy
  // ----------------------------------------------------------------
  describe('destroy', () => {
    it('blob がある場合 revokeObjectURL が呼ばれる', async () => {
      const file = new File(['audio data'], 'test.mp3', { type: 'audio/mpeg' });
      const audio = await AudioFile.createAsync(file);
      audio.destroy();
      expect(revokeObjectURLSpy).toHaveBeenCalled();
    });

    it('blob がない場合 revokeObjectURL は呼ばれない', () => {
      const audio = AudioFile.create('https://example.com/sound.mp3');
      audio.destroy();
      expect(revokeObjectURLSpy).not.toHaveBeenCalled();
    });
  });
});
