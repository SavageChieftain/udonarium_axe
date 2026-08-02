import {
  buildVnEmoteSuffix,
  parseVnEmote,
  splitVnEmoteSuffix,
  VN_EMOTE_DEFAULT,
} from '@axe/features/visual-novel/visual-novel-emote';

describe('buildVnEmoteSuffix()', () => {
  it('すべて既定値なら空文字を返すこと', () => {
    expect(buildVnEmoteSuffix(VN_EMOTE_DEFAULT)).toBe('');
  });

  it('形・吹き出し演出・立ち絵演出・漫符を 〔〕 で連結すること', () => {
    expect(
      buildVnEmoteSuffix({
        kind: 'normal',
        shape: 'shout',
        bubbleAnimation: 'shake',
        portraitEmote: 'jump',
        emotionMark: 'anger',
        flipped: false,
        exited: false,
      })
    ).toBe(' 〔叫び・ゆれ・ジャンプ・💢〕');
  });

  it('一部のみ指定でもサフィックスが付くこと', () => {
    expect(
      buildVnEmoteSuffix({
        kind: 'normal',
        shape: 'normal',
        bubbleAnimation: 'pop',
        portraitEmote: 'none',
        emotionMark: 'none',
        flipped: false,
        exited: false,
      })
    ).toBe(' 〔ぽよん〕');
    expect(
      buildVnEmoteSuffix({
        kind: 'normal',
        shape: 'thought',
        bubbleAnimation: 'none',
        portraitEmote: 'none',
        emotionMark: 'none',
        flipped: false,
        exited: false,
      })
    ).toBe(' 〔もやもや〕');
    expect(
      buildVnEmoteSuffix({
        kind: 'normal',
        shape: 'normal',
        bubbleAnimation: 'none',
        portraitEmote: 'none',
        emotionMark: 'surprise',
        flipped: false,
        exited: false,
      })
    ).toBe(' 〔！〕');
  });

  it('新しいトークン（ささやき・ふわふわ・うなずき）も往復できること', () => {
    const suffix = buildVnEmoteSuffix({
      kind: 'normal',
      shape: 'whisper',
      bubbleAnimation: 'float',
      portraitEmote: 'nod',
      emotionMark: 'sweat',
      flipped: false,
      exited: false,
    });
    expect(suffix).toBe(' 〔ささやき・ふわふわ・うなずき・💧〕');
    const parsed = parseVnEmote(`ねえ、聞いて${suffix}`);
    expect(parsed.text).toBe('ねえ、聞いて');
    expect(parsed.shape).toBe('whisper');
    expect(parsed.bubbleAnimation).toBe('float');
    expect(parsed.portraitEmote).toBe('nod');
    expect(parsed.emotionMark).toBe('sweat');
  });
});

describe('parseVnEmote()', () => {
  it('発言タイプ（地の文・ロケーション）が往復できること', () => {
    const narration = buildVnEmoteSuffix({
      kind: 'narration',
      shape: 'normal',
      bubbleAnimation: 'none',
      portraitEmote: 'none',
      emotionMark: 'none',
      flipped: false,
      exited: false,
    });
    expect(narration).toBe(' 〔地の文〕');
    const parsedNarration = parseVnEmote(`一行は森の奥へ進んだ。${narration}`);
    expect(parsedNarration.kind).toBe('narration');
    expect(parsedNarration.text).toBe('一行は森の奥へ進んだ。');

    const parsedLocation = parseVnEmote('忘れられた森 〔ロケーション〕');
    expect(parsedLocation.kind).toBe('location');
    expect(parsedLocation.text).toBe('忘れられた森');
  });

  it('build したサフィックスを正しく復元しテキストから取り除くこと', () => {
    const suffix = buildVnEmoteSuffix({
      kind: 'normal',
      shape: 'thought',
      bubbleAnimation: 'pulse',
      portraitEmote: 'tremble',
      emotionMark: 'none',
      flipped: false,
      exited: false,
    });
    const parsed = parseVnEmote(`考え中…${suffix}`);
    expect(parsed.text).toBe('考え中…');
    expect(parsed.shape).toBe('thought');
    expect(parsed.bubbleAnimation).toBe('pulse');
    expect(parsed.portraitEmote).toBe('tremble');
  });

  it('サフィックスのないテキストはそのまま返すこと', () => {
    const parsed = parseVnEmote('こんにちは');
    expect(parsed.text).toBe('こんにちは');
    expect(parsed.shape).toBe('normal');
    expect(parsed.bubbleAnimation).toBe('none');
    expect(parsed.portraitEmote).toBe('none');
  });

  it('未知のトークンを含む 〔〕 は演出として扱わないこと', () => {
    const parsed = parseVnEmote('メモ 〔重要〕');
    expect(parsed.text).toBe('メモ 〔重要〕');
    expect(parsed.shape).toBe('normal');
  });

  it('同一カテゴリのトークンが重複したら演出として扱わないこと', () => {
    const parsed = parseVnEmote('やあ 〔ゆれ・ぽよん〕');
    expect(parsed.text).toBe('やあ 〔ゆれ・ぽよん〕');
    expect(parsed.bubbleAnimation).toBe('none');
  });

  it('文中の 〔〕 は末尾でなければ無視されること', () => {
    const parsed = parseVnEmote('〔叫び〕という表記について');
    expect(parsed.text).toBe('〔叫び〕という表記について');
    expect(parsed.shape).toBe('normal');
  });
});

describe('parseVnEmote() 反転トークン', () => {
  it('反転トークンが往復できること', () => {
    const suffix = buildVnEmoteSuffix({ ...VN_EMOTE_DEFAULT, shape: 'shout', flipped: true });
    expect(suffix).toBe(' 〔叫び・反転〕');
    const parsed = parseVnEmote(`どけっ！${suffix}`);
    expect(parsed.text).toBe('どけっ！');
    expect(parsed.shape).toBe('shout');
    expect(parsed.flipped).toBe(true);
  });

  it('反転のみのサフィックスも解釈できること', () => {
    const parsed = parseVnEmote('ふりむく 〔反転〕');
    expect(parsed.flipped).toBe(true);
    expect(parsed.text).toBe('ふりむく');
  });
});

describe('parseVnEmote() 退場トークン', () => {
  it('退場トークンが往復できること', () => {
    const suffix = buildVnEmoteSuffix({ ...VN_EMOTE_DEFAULT, flipped: true, exited: true });
    expect(suffix).toBe(' 〔反転・退場〕');
    const parsed = parseVnEmote(`またね${suffix}`);
    expect(parsed.text).toBe('またね');
    expect(parsed.flipped).toBe(true);
    expect(parsed.exited).toBe(true);
  });

  it('退場を指定しない発言は exited が false であること', () => {
    expect(parseVnEmote('やあ 〔叫び〕').exited).toBe(false);
  });
});

describe('splitVnEmoteSuffix()', () => {
  it('本文とサフィックスを分離すること', () => {
    const split = splitVnEmoteSuffix('やあ 〔叫び・ゆれ〕');
    expect(split.text).toBe('やあ');
    expect(split.suffix).toBe('〔叫び・ゆれ〕');
  });

  it('サフィックスがなければ suffix は空文字であること', () => {
    const split = splitVnEmoteSuffix('やあ');
    expect(split.text).toBe('やあ');
    expect(split.suffix).toBe('');
  });
});
