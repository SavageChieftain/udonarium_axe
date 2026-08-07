import { ReplayDetailLevel, ReplayEventKind } from '@axe/domain/replay/replay-event';
import {
  interpretObjectChange,
  interpretObjectRemove,
  interpretSignal,
  isIgnoredReplayEvent,
  isRecordableKind,
} from '@axe/domain/replay/replay-interpreter';

describe('isIgnoredReplayEvent()', () => {
  it('カーソルや心拍などの雑音を捨てること', () => {
    expect(isIgnoredReplayEvent('CURSOR_MOVE')).toBe(true);
    expect(isIgnoredReplayEvent('HEART_BEAT')).toBe(true);
    expect(isIgnoredReplayEvent('WRITING_A_MESSAGE')).toBe(true);
  });

  it('同期・ファイル転送のイベントを捨てること', () => {
    expect(isIgnoredReplayEvent('SYNCHRONIZE_GAME_OBJECT')).toBe(true);
    expect(isIgnoredReplayEvent('FILE_SEND_CHUNK_abc')).toBe(true);
    expect(isIgnoredReplayEvent('CANCEL_TASK_abc')).toBe(true);
  });

  it('記録対象のイベントは捨てないこと', () => {
    expect(isIgnoredReplayEvent('UPDATE_GAME_OBJECT')).toBe(false);
    expect(isIgnoredReplayEvent('ROLL_DICE_SYMBOL')).toBe(false);
  });
});

describe('isRecordableKind()', () => {
  it('chat-only ではチャットと目印だけ残すこと', () => {
    expect(isRecordableKind(ReplayEventKind.ChatMessage, ReplayDetailLevel.ChatOnly)).toBe(true);
    expect(isRecordableKind(ReplayEventKind.Marker, ReplayDetailLevel.ChatOnly)).toBe(true);
    expect(isRecordableKind(ReplayEventKind.ObjectMove, ReplayDetailLevel.ChatOnly)).toBe(false);
  });

  it('notable では細かい属性変更だけを落とすこと', () => {
    expect(isRecordableKind(ReplayEventKind.ObjectMove, ReplayDetailLevel.Notable)).toBe(true);
    expect(isRecordableKind(ReplayEventKind.ObjectUpdate, ReplayDetailLevel.Notable)).toBe(false);
  });

  it('full では全部残すこと', () => {
    expect(isRecordableKind(ReplayEventKind.ObjectUpdate, ReplayDetailLevel.Full)).toBe(true);
  });
});

describe('interpretObjectChange()', () => {
  it('変化が無ければ null を返すこと', () => {
    const data = { location: { name: 'table', x: 0, y: 0 }, posZ: 0 };
    expect(
      interpretObjectChange({ aliasName: 'character', identifier: 'c1', before: data, after: structuredClone(data) })
    ).toBeNull();
  });

  it('座標の変化を移動として読むこと', () => {
    const draft = interpretObjectChange({
      aliasName: 'character',
      identifier: 'c1',
      before: { attributes: { location: { name: 'table', x: 0, y: 0 }, posZ: 0 } },
      after: { attributes: { location: { name: 'table', x: 100, y: 50 }, posZ: 30 } },
    });
    expect(draft?.kind).toBe(ReplayEventKind.ObjectMove);
    expect(draft?.targetIdentifier).toBe('c1');
    expect(draft?.detail['from']).toEqual({ name: 'table', x: 0, y: 0, z: 0 });
    expect(draft?.detail['to']).toEqual({ name: 'table', x: 100, y: 50, z: 30 });
  });

  it('移動に前後の値を持つパッチを添えること', () => {
    const draft = interpretObjectChange({
      aliasName: 'character',
      identifier: 'c1',
      before: { attributes: { location: { name: 'table', x: 0, y: 0 }, posZ: 0 } },
      after: { attributes: { location: { name: 'table', x: 100, y: 0 }, posZ: 0 } },
    });
    expect(draft?.patch).toEqual({
      identifier: 'c1',
      aliasName: 'character',
      before: { 'attributes.location': { name: 'table', x: 0, y: 0 } },
      after: { 'attributes.location': { name: 'table', x: 100, y: 0 } },
    });
  });

  it('壁面を跨ぐ移動で surface を残すこと', () => {
    const draft = interpretObjectChange({
      aliasName: 'character',
      identifier: 'c1',
      before: { attributes: { location: { name: 'table', x: 0, y: 0 }, posZ: 0 } },
      after: { attributes: { location: { name: 'table', x: 0, y: 0, surface: 'north-wall' }, posZ: 0 } },
    });
    expect(draft?.detail['to']).toEqual({ name: 'table', x: 0, y: 0, z: 0, surface: 'north-wall' });
  });

  it('回転の変化を読むこと', () => {
    const draft = interpretObjectChange({
      aliasName: 'character',
      identifier: 'c1',
      before: { attributes: { rotate: 0, roll: 0 } },
      after: { attributes: { rotate: 90, roll: 0 } },
    });
    expect(draft?.kind).toBe(ReplayEventKind.ObjectRotate);
    expect(draft?.detail['rotate']).toEqual({ from: 0, to: 90 });
    expect(draft?.detail['roll']).toBeUndefined();
  });

  it('カードの表裏を読むこと', () => {
    const draft = interpretObjectChange({
      aliasName: 'card',
      identifier: 'k1',
      before: { attributes: { state: 'back' } },
      after: { attributes: { state: 'front' } },
    });
    expect(draft?.kind).toBe(ReplayEventKind.ObjectFace);
    expect(draft?.detail).toEqual({ from: 'back', to: 'front' });
  });

  it('コインやダイスの出目を読むこと', () => {
    const draft = interpretObjectChange({
      aliasName: 'dice-symbol',
      identifier: 'd1',
      before: { attributes: { face: '1' } },
      after: { attributes: { face: '6' } },
    });
    expect(draft?.kind).toBe(ReplayEventKind.ObjectFace);
    expect(draft?.detail).toEqual({ from: '1', to: '6' });
  });

  it('リソースの増減を要素名つきで読むこと', () => {
    const draft = interpretObjectChange({
      aliasName: 'data',
      identifier: 'hp1',
      before: { value: 12, attributes: { name: 'HP', currentValue: 12 } },
      after: { value: 12, attributes: { name: 'HP', currentValue: 7 } },
    });
    expect(draft?.kind).toBe(ReplayEventKind.ObjectValue);
    expect(draft?.detail).toEqual({ name: 'HP', current: { from: 12, to: 7 } });
  });

  it('持ち主の変更を読むこと', () => {
    const draft = interpretObjectChange({
      aliasName: 'character',
      identifier: 'c1',
      before: { attributes: { owner: '' } },
      after: { attributes: { owner: 'alice' } },
    });
    expect(draft?.kind).toBe(ReplayEventKind.ObjectOwner);
    expect(draft?.detail).toEqual({ from: '', to: 'alice' });
  });

  it('固定の切り替えを読むこと', () => {
    const draft = interpretObjectChange({
      aliasName: 'character',
      identifier: 'c1',
      before: { attributes: { isLock: false } },
      after: { attributes: { isLock: true } },
    });
    expect(draft?.kind).toBe(ReplayEventKind.ObjectLock);
    expect(draft?.detail).toEqual({ locked: true });
  });

  it('新規オブジェクトを作成として読むこと', () => {
    const draft = interpretObjectChange({
      aliasName: 'character',
      identifier: 'c1',
      before: null,
      after: { attributes: { location: { name: 'table', x: 0, y: 0 } } },
    });
    expect(draft?.kind).toBe(ReplayEventKind.ObjectCreate);
    expect(draft?.detail).toEqual({ aliasName: 'character' });
  });

  it('新規チャットを発言として読むこと', () => {
    const draft = interpretObjectChange({
      aliasName: 'chat',
      identifier: 'm1',
      before: null,
      after: {
        value: 'こんばんは',
        parentIdentifier: 'tab1',
        attributes: { name: 'アリス', from: 'alice', to: '', tag: '', dicebot: '', timestamp: 1700000000000 },
      },
    });
    expect(draft?.kind).toBe(ReplayEventKind.ChatMessage);
    expect(draft?.detail).toEqual({
      text: 'こんばんは',
      name: 'アリス',
      from: 'alice',
      to: '',
      tag: '',
      dicebot: '',
      timestamp: 1700000000000,
      tabIdentifier: 'tab1',
    });
  });

  it('ダイスボットの発言をダイスとして読むこと', () => {
    const draft = interpretObjectChange({
      aliasName: 'chat',
      identifier: 'm2',
      before: null,
      after: { value: '(1D100) ＞ 42 ＞ 成功', attributes: { from: 'System-BCDice' } },
    });
    expect(draft?.kind).toBe(ReplayEventKind.ChatDice);
  });

  it('見出しの付かない変更をその他の更新として読むこと', () => {
    const draft = interpretObjectChange({
      aliasName: 'character',
      identifier: 'c1',
      before: { attributes: { hideName: false } },
      after: { attributes: { hideName: true } },
    });
    expect(draft?.kind).toBe(ReplayEventKind.ObjectUpdate);
    expect(draft?.detail).toEqual({ keys: ['attributes.hideName'] });
  });
});

describe('カットインの読み取り', () => {
  it('カットインの開始を読むこと', () => {
    const draft = interpretObjectChange({
      aliasName: 'cut-in-launcher',
      identifier: 'launcher',
      before: { attributes: { launchTimeStamp: 3, launchCutInIdentifier: 'cut-a', launchIsStart: true } },
      after: { attributes: { launchTimeStamp: 4, launchCutInIdentifier: 'cut-b', launchIsStart: true } },
    });
    expect(draft?.kind).toBe(ReplayEventKind.MediaCutIn);
    expect(draft?.targetIdentifier).toBe('cut-b');
    expect(draft?.detail).toEqual({ soundOnly: false, isStart: true });
  });

  it('カットインの停止を読むこと', () => {
    const draft = interpretObjectChange({
      aliasName: 'cut-in-launcher',
      identifier: 'launcher',
      before: { attributes: { launchTimeStamp: 4, launchCutInIdentifier: 'cut-b', launchIsStart: true } },
      after: { attributes: { launchTimeStamp: 5, launchCutInIdentifier: 'cut-b', launchIsStart: false } },
    });
    expect(draft?.detail['isStart']).toBe(false);
  });

  it('音だけのカットインを読むこと', () => {
    const draft = interpretObjectChange({
      aliasName: 'cut-in-launcher',
      identifier: 'launcher',
      before: { attributes: { soundOnlyTimeStamp: 1, soundOnlyCutInIdentifier: 'se-a' } },
      after: { attributes: { soundOnlyTimeStamp: 2, soundOnlyCutInIdentifier: 'se-b' } },
    });
    expect(draft?.kind).toBe(ReplayEventKind.MediaCutIn);
    expect(draft?.targetIdentifier).toBe('se-b');
    expect(draft?.detail['soundOnly']).toBe(true);
  });

  it('標準の細かさでもカットインを残すこと', () => {
    expect(isRecordableKind(ReplayEventKind.MediaCutIn, ReplayDetailLevel.Notable)).toBe(true);
  });

  it('関係ない変更はカットインとして読まないこと', () => {
    const draft = interpretObjectChange({
      aliasName: 'cut-in-launcher',
      identifier: 'launcher',
      before: { attributes: { sendTo: '' } },
      after: { attributes: { sendTo: 'alice' } },
    });
    expect(draft?.kind).toBe(ReplayEventKind.ObjectUpdate);
  });
});

describe('interpretObjectRemove()', () => {
  it('削除として読むこと', () => {
    const draft = interpretObjectRemove('c1', 'character');
    expect(draft.kind).toBe(ReplayEventKind.ObjectRemove);
    expect(draft.targetIdentifier).toBe('c1');
    expect(draft.detail).toEqual({ aliasName: 'character' });
  });
});

describe('interpretSignal()', () => {
  it('ダイスシンボルを振った操作を読むこと', () => {
    const draft = interpretSignal('ROLL_DICE_SYMBOL', { identifier: 'd1' });
    expect(draft?.kind).toBe(ReplayEventKind.ObjectDiceRoll);
    expect(draft?.targetIdentifier).toBe('d1');
  });

  it('鳴らし直せる合図に元のイベントを添えること', () => {
    expect(interpretSignal('SOUND_EFFECT', 'se-dice')?.signal).toEqual({ name: 'SOUND_EFFECT', data: 'se-dice' });
    expect(interpretSignal('ROLL_DICE_SYMBOL', { identifier: 'd1' })?.signal?.name).toBe('ROLL_DICE_SYMBOL');
    expect(interpretSignal('SHUFFLE_CARD_STACK', { identifier: 's1' })?.signal?.name).toBe('SHUFFLE_CARD_STACK');
    expect(interpretSignal('FLIP_COIN', { identifier: 'c1', face: 'back' })?.signal?.name).toBe('FLIP_COIN');
    expect(interpretSignal('EFFECT_CAST', {})?.signal?.name).toBe('EFFECT_CAST');
    expect(interpretSignal('SELECT_GAME_TABLE', { identifier: 't1' })?.signal?.name).toBe('SELECT_GAME_TABLE');
  });

  it('鳴らし直してはいけない合図には添えないこと', () => {
    expect(interpretSignal('CONNECT_PEER', { peerId: 'p1' })?.signal).toBeUndefined();
    expect(interpretSignal('DISCONNECT_PEER', { peerId: 'p1' })?.signal).toBeUndefined();
    expect(interpretSignal('RESOURCE_CHANGE', { characterIdentifier: 'c1' })?.signal).toBeUndefined();
  });

  it('コイン投げを読むこと', () => {
    const draft = interpretSignal('FLIP_COIN', { identifier: 'co1', face: 'back' });
    expect(draft?.kind).toBe(ReplayEventKind.ObjectFace);
    expect(draft?.detail).toEqual({ to: 'back' });
  });

  it('山札のシャッフルを読むこと', () => {
    expect(interpretSignal('SHUFFLE_CARD_STACK', { identifier: 's1' })?.kind).toBe(ReplayEventKind.ObjectShuffle);
  });

  it('効果音を読むこと', () => {
    const draft = interpretSignal('SOUND_EFFECT', 'se-dice');
    expect(draft?.kind).toBe(ReplayEventKind.MediaSoundEffect);
    expect(draft?.detail).toEqual({ identifier: 'se-dice' });
  });

  it('テーブル切替を読むこと', () => {
    const draft = interpretSignal('SELECT_GAME_TABLE', { identifier: 't1' });
    expect(draft?.kind).toBe(ReplayEventKind.TableChange);
    expect(draft?.targetIdentifier).toBe('t1');
  });

  it('リソース増減の通知をコマ単位で読むこと', () => {
    const draft = interpretSignal('RESOURCE_CHANGE', {
      characterIdentifier: 'c1',
      changes: [{ name: 'HP', diff: -5 }],
    });
    expect(draft?.kind).toBe(ReplayEventKind.ObjectValue);
    expect(draft?.targetIdentifier).toBe('c1');
    expect(draft?.detail['changes']).toEqual([{ name: 'HP', diff: -5 }]);
  });

  it('演出の発動を効果・撃ち手・対象で読むこと', () => {
    const draft = interpretSignal('EFFECT_CAST', {
      presetIdentifier: 'preset-fire',
      casterIdentifier: 'c1',
      targets: [
        { identifier: 'c2', x: 0, y: 0, z: 0 },
        { identifier: 'c3', x: 0, y: 0, z: 0 },
      ],
      seed: 42,
    });
    expect(draft?.kind).toBe(ReplayEventKind.EffectCast);
    expect(draft?.targetIdentifier).toBe('preset-fire');
    expect(draft?.detail).toEqual({ caster: 'c1', targets: ['c2', 'c3'] });
    expect(draft?.relatedIdentifiers).toEqual(['c1', 'c2', 'c3']);
    expect(draft?.signal?.name).toBe('EFFECT_CAST');
  });

  it('撃ち手のない演出も読むこと', () => {
    const draft = interpretSignal('EFFECT_CAST', {
      presetIdentifier: 'preset-heal',
      casterIdentifier: '',
      targets: [{ identifier: 'c1', x: 0, y: 0, z: 0 }],
    });
    expect(draft?.detail).toEqual({ caster: '', targets: ['c1'] });
    expect(draft?.relatedIdentifiers).toEqual(['c1']);
  });

  it('壊れた演出でも落ちないこと', () => {
    const draft = interpretSignal('EFFECT_CAST', { presetIdentifier: 'p', targets: 'not-an-array' });
    expect(draft?.detail).toEqual({ caster: '', targets: [] });
  });

  it('入退室を読むこと', () => {
    expect(interpretSignal('CONNECT_PEER', { peerId: 'p1' })?.kind).toBe(ReplayEventKind.PeerJoin);
    expect(interpretSignal('DISCONNECT_PEER', { peerId: 'p1' })?.kind).toBe(ReplayEventKind.PeerLeave);
  });

  it('知らないイベントでは null を返すこと', () => {
    expect(interpretSignal('SOMETHING_ELSE', {})).toBeNull();
  });
});
