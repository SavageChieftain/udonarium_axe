import { GameCharacter } from '@axe/domain/character/game-character';
import { NpcDragService } from '@axe/features/gm-tools/npc-bar/npc-drag.service';

function makeCharacter(name: string, isNpc = false): GameCharacter {
  const character = GameCharacter.create(name, 1, '');
  character.isNpc = isNpc;
  return character;
}

describe('NpcDragService', () => {
  beforeEach(() => {});

  it('holds the character and the point through a drag', () => {
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

  it('registers the character on a drop and lets go', () => {
    const service = new NpcDragService();
    const npc = makeCharacter('B', false);
    service.begin(npc);
    service.end(true);
    expect(npc.isNpc).toBe(true);
    expect(service.character()).toBeNull();
  });

  it('registers nothing on a cancel and lets go all the same', () => {
    const service = new NpcDragService();
    const npc = makeCharacter('C', false);
    service.begin(npc);
    service.end(false);
    expect(npc.isNpc).toBe(false);
    expect(service.character()).toBeNull();
  });
});
