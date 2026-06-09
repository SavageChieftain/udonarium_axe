import { ObjectStore } from '@axe/core/sync/object-store';
import { GameCharacter } from '@axe/domain/character/game-character';
import { NpcDragService } from '@axe/features/gm-tools/npc-bar/npc-drag.service';

function makeCharacter(name: string, isNpc = false): GameCharacter {
  const character = GameCharacter.create(name, 1, '');
  character.isNpc = isNpc;
  return character;
}

describe('NpcDragService', () => {
  let store: ObjectStore;

  beforeEach(() => {
    store = ObjectStore.instance;
    store.getObjects().forEach((obj) => store.delete(obj, false));
    store.clearDeleteHistory();
  });

  afterEach(() => {
    store.getObjects().forEach((obj) => store.delete(obj, false));
    store.clearDeleteHistory();
  });

  it('begin / move でドラッグ中のキャラと座標を保持する', () => {
    const service = new NpcDragService();
    const npc = makeCharacter('A');
    service.begin(npc, 10, 20);
    expect(service.character()).toBe(npc);
    expect(service.x()).toBe(10);
    expect(service.y()).toBe(20);
    service.move(30, 40);
    expect(service.x()).toBe(30);
    expect(service.y()).toBe(40);
  });

  it('end(true) で isNpc=true に登録し、状態を解除する', () => {
    const service = new NpcDragService();
    const npc = makeCharacter('B', false);
    service.begin(npc);
    service.end(true);
    expect(npc.isNpc).toBe(true);
    expect(service.character()).toBeNull();
  });

  it('end(false) では登録せず、状態だけ解除する', () => {
    const service = new NpcDragService();
    const npc = makeCharacter('C', false);
    service.begin(npc);
    service.end(false);
    expect(npc.isNpc).toBe(false);
    expect(service.character()).toBeNull();
  });
});
