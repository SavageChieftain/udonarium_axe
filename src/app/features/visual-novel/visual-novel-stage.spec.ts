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
  it('空の履歴では立ち絵を並べないこと', () => {
    expect(buildVnStage([], resolveUrl)).toEqual([]);
  });

  it('直近の発言者を立ち絵として並べ、現在の発言者だけを isActive にすること', () => {
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

  it('スロット順に並べ、同じ名前は最新の発言だけを採用すること', () => {
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

  it('スロットが重なった立ち絵は横にずらすこと', () => {
    const stage = buildVnStage(
      [source({ name: 'ボブ', imageIdentifier: 'image-bob', imagePos: 3 }), source({ name: 'アリス', imagePos: 3 })],
      resolveUrl
    );

    expect(stage[1].left - stage[0].left).toBeCloseTo(4);
  });

  it('立ち絵は最大 6 人までにすること', () => {
    const window = Array.from({ length: 10 }, (_, index) =>
      source({ name: `キャラ${index}`, imageIdentifier: `image-${index}`, imagePos: index })
    );

    expect(buildVnStage(window, resolveUrl)).toHaveLength(VN_STAGE_MAX);
  });

  it.each<VnMessageKind>(['location', 'scene'])('現在の発言が %s なら立ち絵を隠すこと', (kind) => {
    const stage = buildVnStage([source(), source({ emote: emote({ kind }) })], resolveUrl);

    expect(stage).toEqual([]);
  });

  it('場面転換より前の立ち絵は引き継がないこと', () => {
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

  it('システム発言・ダイスボット・ダイスコマンドは立ち絵にしないこと', () => {
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

  it('キャラクター以外の発言・画像なし・URL 解決できない画像は除くこと', () => {
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

  it('現在の発言がダイスコマンドなら誰も isActive にしないこと', () => {
    const stage = buildVnStage([source({ name: 'アリス' }), source({ name: 'ボブ', isDiceCommand: true })], resolveUrl);

    expect(stage.every((chara) => !chara.isActive)).toBe(true);
  });

  it('反転指定を立ち絵に引き継ぐこと', () => {
    const stage = buildVnStage([source({ emote: emote({ flipped: true }) })], resolveUrl);

    expect(stage[0].isFlipped).toBe(true);
  });

  it('範囲外のスロット指定は先頭スロットに寄せること', () => {
    expect(buildVnStage([source({ imagePos: 99 })], resolveUrl)[0].slot).toBe(0);
    expect(buildVnStage([source({ imagePos: null })], resolveUrl)[0].slot).toBe(0);
  });
});
