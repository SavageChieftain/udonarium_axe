import { VN_EMOTE_DEFAULT, VnEmote, VnMessageKind } from '@axe/features/visual-novel/visual-novel-emote';
import { buildVnStage, VN_STAGE_MAX, VnStageSource } from '@axe/features/visual-novel/visual-novel-stage';

function emote(overrides: Partial<VnEmote> = {}): VnEmote {
  return { ...VN_EMOTE_DEFAULT, ...overrides };
}

function source(overrides: Partial<VnStageSource> = {}): VnStageSource {
  return {
    name: 'アリス',
    imageIdentifier: 'image-alice',
    imagePos: 0,
    isSystemMessage: false,
    isDicebot: false,
    isGameCharacter: true,
    isDiceCommand: false,
    emote: emote(),
    ...overrides,
  };
}

const resolveUrl = (imageIdentifier: string) => `url://${imageIdentifier}`;

describe('buildVnStage()', () => {
  it('puts nobody on stage for an empty history', () => {
    expect(buildVnStage([], resolveUrl)).toEqual([]);
  });

  it('puts the recent speakers on stage and marks only the one speaking now', () => {
    const stage = buildVnStage(
      [
        source({ name: 'ボブ', imageIdentifier: 'image-bob', imagePos: 6 }),
        source({ name: 'アリス', imageIdentifier: 'image-alice', imagePos: 0 }),
      ],
      resolveUrl
    );

    expect(stage.map((chara) => chara.name)).toEqual(['アリス', 'ボブ']);
    expect(stage.map((chara) => chara.isActive)).toEqual([true, false]);
    expect(stage[0].url).toBe('url://image-alice');
  });

  it('orders them by their place and keeps only the latest line of a name', () => {
    const stage = buildVnStage(
      [
        source({ name: 'アリス', imagePos: 11 }),
        source({ name: 'ボブ', imageIdentifier: 'image-bob', imagePos: 5 }),
        source({ name: 'アリス', imagePos: 2 }),
      ],
      resolveUrl
    );

    expect(stage.map((chara) => [chara.name, chara.slot])).toEqual([
      ['アリス', 2],
      ['ボブ', 5],
    ]);
  });

  it('shifts two sharing a place apart', () => {
    const stage = buildVnStage(
      [source({ name: 'ボブ', imageIdentifier: 'image-bob', imagePos: 3 }), source({ name: 'アリス', imagePos: 3 })],
      resolveUrl
    );

    expect(stage[1].left - stage[0].left).toBeCloseTo(4);
  });

  it('puts no more than six on stage', () => {
    const window = Array.from({ length: 10 }, (_, index) =>
      source({ name: `キャラ${index}`, imageIdentifier: `image-${index}`, imagePos: index })
    );

    expect(buildVnStage(window, resolveUrl)).toHaveLength(VN_STAGE_MAX);
  });

  it.each<VnMessageKind>(['location', 'scene'])('現在の発言が %s なら立ち絵を隠すこと', (kind) => {
    const stage = buildVnStage([source(), source({ emote: emote({ kind }) })], resolveUrl);

    expect(stage).toEqual([]);
  });

  it('carries nobody across a change of scene', () => {
    const stage = buildVnStage(
      [
        source({ name: 'ボブ', imageIdentifier: 'image-bob', imagePos: 6 }),
        source({ name: 'ナレーター', imageIdentifier: '', emote: emote({ kind: 'scene' }) }),
        source({ name: 'アリス', imagePos: 0 }),
      ],
      resolveUrl
    );

    expect(stage.map((chara) => chara.name)).toEqual(['アリス']);
  });

  it('puts neither the system, the dice bot nor a dice command on stage', () => {
    const stage = buildVnStage(
      [
        source({ name: 'システム', isSystemMessage: true }),
        source({ name: 'ダイスボット', isDicebot: true }),
        source({ name: 'コマンド', isDiceCommand: true }),
        source({ name: 'アリス' }),
      ],
      resolveUrl
    );

    expect(stage.map((chara) => chara.name)).toEqual(['アリス']);
  });

  it('leaves out anything but a character, anything without a picture and any picture it cannot resolve', () => {
    const stage = buildVnStage(
      [
        source({ name: 'プレイヤー', isGameCharacter: false }),
        source({ name: '画像なし', imageIdentifier: '' }),
        source({ name: '欠番', imageIdentifier: 'missing' }),
        source({ name: 'アリス' }),
      ],
      (imageIdentifier) => (imageIdentifier === 'missing' ? '' : `url://${imageIdentifier}`)
    );

    expect(stage.map((chara) => chara.name)).toEqual(['アリス']);
  });

  it('marks nobody while the current line is a dice command', () => {
    const stage = buildVnStage([source({ name: 'アリス' }), source({ name: 'ボブ', isDiceCommand: true })], resolveUrl);

    expect(stage.every((chara) => !chara.isActive)).toBe(true);
  });

  it('keeps a portrait off stage once its line says it leaves', () => {
    const stage = buildVnStage(
      [
        source({ name: 'アリス', imagePos: 0 }),
        source({ name: 'ボブ', imageIdentifier: 'image-bob', imagePos: 6 }),
        source({ name: 'アリス', imagePos: 0, emote: emote({ exited: true }) }),
        source({ name: 'ボブ', imageIdentifier: 'image-bob', imagePos: 6 }),
      ],
      resolveUrl
    );

    expect(stage.map((chara) => chara.name)).toEqual(['ボブ']);
  });

  it('brings it back once it speaks again', () => {
    const stage = buildVnStage(
      [
        source({ name: 'アリス', emote: emote({ exited: true }) }),
        source({ name: 'ボブ', imageIdentifier: 'image-bob', imagePos: 6 }),
        source({ name: 'アリス', imagePos: 0 }),
      ],
      resolveUrl
    );

    expect(stage.map((chara) => chara.name)).toEqual(['アリス', 'ボブ']);
  });

  it('carries a flip onto the portrait', () => {
    const stage = buildVnStage([source({ emote: emote({ flipped: true }) })], resolveUrl);

    expect(stage[0].isFlipped).toBe(true);
  });

  it('pulls a place outside the stage back to the first', () => {
    expect(buildVnStage([source({ imagePos: 99 })], resolveUrl)[0].slot).toBe(0);
    expect(buildVnStage([source({ imagePos: null })], resolveUrl)[0].slot).toBe(0);
  });
});
