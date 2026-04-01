import { GameCharacter } from '@axe/domain/character/game-character';
import { ChatTab } from '@axe/domain/chat/chat-tab';
import { ChatMessageService } from '@axe/shared/chat/chat-message.service';
import GameSystemClass from 'bcdice/lib/game_system';

export interface RemoteControllerSelect {
  name: string;
  nowOrMax: string;
  dispName: string;
}

export interface ParsedBuffInput {
  buffname: string;
  sub: string;
  round: number;
  bufftext: string;
}

export function parseBuffInput(text: string): ParsedBuffInput | null {
  const parts = text.split(/\s+/);
  if (parts.length === 0 || parts[0] === '') return null;
  const buffname = parts[0];
  let bufftext = parts[0];
  let sub = '';
  let round = 3;
  if (parts.length > 1) {
    sub = parts[1];
    bufftext += '/' + parts[1];
  }
  if (parts.length > 2) {
    round = parseInt(parts[2]);
    if (Number.isNaN(round)) round = 3;
  }
  bufftext += '/' + round + 'R';
  return { buffname, sub, round, bufftext };
}

export function addBuffRound(characters: GameCharacter[], name: string, info: string, round: number): void {
  for (const character of characters) {
    character.buffs.addRound(name, info, round);
  }
}

export function sendDecBuffRoundMessage(
  chatTab: ChatTab,
  svc: ChatMessageService,
  gameSystem: GameSystemClass,
  sendFrom: string,
  tachieNum: number,
  gameCharacters: GameCharacter[]
): void {
  if (gameCharacters.length <= 0 || !chatTab) return;
  const parts: string[] = [];
  for (const object of gameCharacters) {
    object.buffs.decreaseRound();
    parts.push(`[${object.name}]`);
  }
  svc.sendMessage(chatTab, 'バフのRを減少 ' + parts.join(''), gameSystem, sendFrom, '', tachieNum);
}

export function sendDeleteZeroRoundBuffMessage(
  chatTab: ChatTab,
  svc: ChatMessageService,
  gameSystem: GameSystemClass,
  sendFrom: string,
  tachieNum: number,
  gameCharacters: GameCharacter[]
): void {
  if (gameCharacters.length <= 0) return;
  const parts: string[] = [];
  for (const object of gameCharacters) {
    object.buffs.deleteZeroRound();
    parts.push(`[${object.name}]`);
  }
  svc.sendMessage(chatTab, '0R以下のバフを消去 ' + parts.join(''), gameSystem, sendFrom, '', tachieNum);
}
