import {
  buildVnEmoteSuffix,
  parseVnEmote,
  splitVnEmoteSuffix,
  VN_EMOTE_DEFAULT,
} from '@axe/features/visual-novel/visual-novel-emote';

describe('buildVnEmoteSuffix()', () => {
  it('returns nothing when everything is at its default', () => {
    expect(buildVnEmoteSuffix(VN_EMOTE_DEFAULT)).toBe('');
  });

  it('joins the shape, the balloon, the portrait and the mark into one suffix', () => {
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

  it('writes a suffix for even one of them', () => {
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

  it('makes the round trip with the newer tokens as well', () => {
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
  it('makes it with the kind of line too', () => {
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

  it('reads a suffix it wrote back and takes it off the text', () => {
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

  it('leaves text without one alone', () => {
    const parsed = parseVnEmote('こんにちは');
    expect(parsed.text).toBe('こんにちは');
    expect(parsed.shape).toBe('normal');
    expect(parsed.bubbleAnimation).toBe('none');
    expect(parsed.portraitEmote).toBe('none');
  });

  it('does not read a bracket holding an unknown token as one', () => {
    const parsed = parseVnEmote('メモ 〔重要〕');
    expect(parsed.text).toBe('メモ 〔重要〕');
    expect(parsed.shape).toBe('normal');
  });

  it('does not read one holding two tokens of a kind as one', () => {
    const parsed = parseVnEmote('やあ 〔ゆれ・ぽよん〕');
    expect(parsed.text).toBe('やあ 〔ゆれ・ぽよん〕');
    expect(parsed.bubbleAnimation).toBe('none');
  });

  it('ignores a bracket that is not at the end', () => {
    const parsed = parseVnEmote('〔叫び〕という表記について');
    expect(parsed.text).toBe('〔叫び〕という表記について');
    expect(parsed.shape).toBe('normal');
  });
});

describe('the flip token', () => {
  it('makes the round trip', () => {
    const suffix = buildVnEmoteSuffix({ ...VN_EMOTE_DEFAULT, shape: 'shout', flipped: true });
    expect(suffix).toBe(' 〔叫び・反転〕');
    const parsed = parseVnEmote(`どけっ！${suffix}`);
    expect(parsed.text).toBe('どけっ！');
    expect(parsed.shape).toBe('shout');
    expect(parsed.flipped).toBe(true);
  });

  it('reads a suffix that carries nothing else', () => {
    const parsed = parseVnEmote('ふりむく 〔反転〕');
    expect(parsed.flipped).toBe(true);
    expect(parsed.text).toBe('ふりむく');
  });
});

describe('the exit token', () => {
  it('makes the round trip', () => {
    const suffix = buildVnEmoteSuffix({ ...VN_EMOTE_DEFAULT, flipped: true, exited: true });
    expect(suffix).toBe(' 〔反転・退場〕');
    const parsed = parseVnEmote(`またね${suffix}`);
    expect(parsed.text).toBe('またね');
    expect(parsed.flipped).toBe(true);
    expect(parsed.exited).toBe(true);
  });

  it('leaves a line without one unexited', () => {
    expect(parseVnEmote('やあ 〔叫び〕').exited).toBe(false);
  });
});

describe('splitVnEmoteSuffix()', () => {
  it('parts the body from the suffix', () => {
    const split = splitVnEmoteSuffix('やあ 〔叫び・ゆれ〕');
    expect(split.text).toBe('やあ');
    expect(split.suffix).toBe('〔叫び・ゆれ〕');
  });

  it('returns an empty suffix when there is none', () => {
    const split = splitVnEmoteSuffix('やあ');
    expect(split.text).toBe('やあ');
    expect(split.suffix).toBe('');
  });
});
