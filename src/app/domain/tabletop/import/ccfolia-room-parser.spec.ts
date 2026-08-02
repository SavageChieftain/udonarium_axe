import { isCcfoliaRoomData, parseCcfoliaRoom } from '@axe/domain/tabletop/import/ccfolia-room-parser';

function roomData(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    meta: { version: '1.1.0' },
    entities: {
      room: {
        backgroundUrl: 'aaaa.jpeg',
        foregroundUrl: null,
        fieldWidth: 67,
        fieldHeight: 37,
        messageChannels: [],
        markers: {},
      },
      items: {},
      decks: {},
      characters: {},
      effects: {},
      scenes: {},
      ...overrides,
    },
    resources: {
      'aaaa.jpeg': { type: 'image/jpeg' },
      'bbbb.png': { type: 'image/png' },
    },
  };
}

describe('isCcfoliaRoomData', () => {
  it('meta.version と entities を持つ JSON をルームデータと判定する', () => {
    expect(isCcfoliaRoomData(roomData())).toBe(true);
  });

  it('コマ JSON はルームデータと判定しない', () => {
    expect(isCcfoliaRoomData({ kind: 'character', data: { name: '探索者A' } })).toBe(false);
  });

  it('entities を欠く JSON を弾く', () => {
    expect(isCcfoliaRoomData({ meta: { version: '1.1.0' } })).toBe(false);
    expect(isCcfoliaRoomData(null)).toBe(false);
    expect(isCcfoliaRoomData('__data.json')).toBe(false);
  });
});

describe('parseCcfoliaRoom', () => {
  it('盤面サイズ・背景・画像リソースを取り込む', () => {
    const room = parseCcfoliaRoom(roomData())!;

    expect(room.version).toBe('1.1.0');
    expect(room.fieldWidth).toBe(67);
    expect(room.fieldHeight).toBe(37);
    expect(room.backgroundFileName).toBe('aaaa.jpeg');
    expect(room.resources).toEqual([
      { fileName: 'aaaa.jpeg', mime: 'image/jpeg' },
      { fileName: 'bbbb.png', mime: 'image/png' },
    ]);
  });

  it('前景画像を盤面の絵として取り込む', () => {
    const data = roomData();
    (data['entities'] as Record<string, unknown>)['room'] = {
      backgroundUrl: 'aaaa.jpeg',
      foregroundUrl: 'bbbb.png',
      fieldWidth: 67,
      fieldHeight: 37,
    };

    expect(parseCcfoliaRoom(data)!.foregroundFileName).toBe('bbbb.png');
  });

  it('scenes を order 順の場面として取り込む', () => {
    const room = parseCcfoliaRoom(
      roomData({
        scenes: {
          s2: {
            name: '戦闘シート',
            order: 1,
            backgroundUrl: 'aaaa.jpeg',
            foregroundUrl: 'bbbb.png',
            fieldWidth: 84,
            fieldHeight: 60,
          },
          s1: {
            name: '前景なし',
            order: 0,
            backgroundUrl: 'aaaa.jpeg',
            foregroundUrl: null,
            fieldWidth: 0,
            fieldHeight: 0,
          },
        },
      })
    )!;

    expect(room.scenes).toEqual([
      {
        name: '前景なし',
        order: 0,
        backgroundFileName: 'aaaa.jpeg',
        foregroundFileName: '',
        fieldWidth: 0,
        fieldHeight: 0,
      },
      {
        name: '戦闘シート',
        order: 1,
        backgroundFileName: 'aaaa.jpeg',
        foregroundFileName: 'bbbb.png',
        fieldWidth: 84,
        fieldHeight: 60,
      },
    ]);
  });

  it('画像でないリソースを除外する', () => {
    const data = roomData();
    data['resources'] = { 'cccc.mp3': { type: 'audio/mpeg' }, 'bbbb.png': { type: 'image/png' } };

    expect(parseCcfoliaRoom(data)!.resources).toEqual([{ fileName: 'bbbb.png', mime: 'image/png' }]);
  });

  it('items をパネルとして order 順に取り込む', () => {
    const room = parseCcfoliaRoom(
      roomData({
        items: {
          bbbbbbbbbbbbbbbbbbbb: {
            x: 4,
            y: 5,
            z: 2,
            angle: 90,
            width: 3,
            height: 2,
            locked: true,
            visible: true,
            type: 'plane',
            memo: '奥',
            imageUrl: 'bbbb.png',
            order: 1,
          },
          aaaaaaaaaaaaaaaaaaaa: {
            x: -7,
            y: -14,
            width: 15,
            height: 15,
            type: 'plane',
            memo: '手前',
            imageUrl: 'aaaa.jpeg',
            order: 0,
          },
        },
      })
    )!;

    expect(room.panels.map((panel) => panel.memo)).toEqual(['手前', '奥']);
    expect(room.panels[0]).toEqual({
      imageFileName: 'aaaa.jpeg',
      x: -7,
      y: -14,
      z: 0,
      width: 15,
      height: 15,
      angle: 0,
      order: 0,
      locked: false,
      visible: true,
      memo: '手前',
    });
    expect(room.panels[1].angle).toBe(90);
    expect(room.panels[1].locked).toBe(true);
    expect(room.skipped.panels).toBe(0);
  });

  it('画像を持たない item はパネルにせず件数だけ残す', () => {
    const room = parseCcfoliaRoom(
      roomData({ items: { aaaaaaaaaaaaaaaaaaaa: { x: 0, y: 0, width: 1, height: 1, imageUrl: null } } })
    )!;

    expect(room.panels).toEqual([]);
    expect(room.skipped.panels).toBe(1);
  });

  it('characters をコマとして取り込み、アイコンは ZIP 内ファイル名として持つ', () => {
    const room = parseCcfoliaRoom(
      roomData({
        characters: {
          aaaaaaaaaaaaaaaaaaaa: {
            name: '探索者A',
            memo: 'メモ',
            initiative: 12,
            externalUrl: 'https://charasheet.example/1',
            color: '#1a2b3c',
            commands: 'CCB<={SAN}',
            iconUrl: 'aaaa.jpeg',
            faces: [
              { label: '通常', iconUrl: 'aaaa.jpeg' },
              { label: '笑顔', iconUrl: 'bbbb.png' },
              { label: '欠番', iconUrl: null },
            ],
            x: -3,
            y: 4,
            angle: 180,
            width: 2,
            height: 3,
            active: true,
            secret: true,
            invisible: false,
            hideStatus: true,
            owner: 'user-1',
            status: [{ label: 'HP', value: 8, max: 12 }],
            params: [{ label: 'STR', value: '13' }],
          },
        },
      })
    )!;

    expect(room.pieces).toHaveLength(1);
    const piece = room.pieces[0];
    expect(piece.character.name).toBe('探索者A');
    expect(piece.character.sourceFormat).toBe('ccfolia');
    expect(piece.character.statuses).toEqual([{ label: 'HP', value: 8, max: 12 }]);
    expect(piece.character.size).toBe(3);
    expect(piece.character.iconUrl).toBe('');
    expect(piece.iconFileName).toBe('aaaa.jpeg');
    expect(piece.faces).toEqual([
      { label: '通常', fileName: 'aaaa.jpeg' },
      { label: '笑顔', fileName: 'bbbb.png' },
    ]);
    expect(piece).toMatchObject({
      x: -3,
      y: 4,
      width: 2,
      height: 3,
      angle: 180,
      active: true,
      secret: true,
      invisible: false,
      hideStatus: true,
      owner: 'user-1',
    });
  });

  it('未対応の decks / effects は件数だけ数える', () => {
    const room = parseCcfoliaRoom(roomData({ decks: { d1: {}, d2: {} }, effects: { e1: {} } }))!;

    expect(room.skipped).toEqual({ panels: 0, decks: 2, effects: 1 });
  });

  it('ルームデータでない JSON は null を返す', () => {
    expect(parseCcfoliaRoom({ kind: 'character', data: { name: '探索者A' } })).toBeNull();
  });
});
