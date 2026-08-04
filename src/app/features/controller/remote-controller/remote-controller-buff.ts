import { ChatMessageService } from '@axe/application/chat/chat-message.service';
import { BuffAppearance, parseBuffAppearance } from '@axe/domain/character/buff-appearance';
import { GameCharacter } from '@axe/domain/character/game-character';
import { ChatTab } from '@axe/domain/chat/chat-tab';
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
  appearance: BuffAppearance;
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
  const appearance = parseBuffAppearance(parts.slice(3));
  for (const token of parts.slice(3)) bufftext += '/' + token;
  return { buffname, sub, round, bufftext, appearance };
}

export function addBuffRound(
  characters: GameCharacter[],
  name: string,
  info: string,
  round: number,
  appearance: BuffAppearance = {}
): void {
  for (const character of characters) {
    character.buffs.addRound(name, info, round, appearance);
  }
}

export function sendDecBuffRoundMessage(
  chatTab: ChatTab,
  svc: ChatMessageService,
  gameSystem: GameSystemClass,
  sendFrom: string,
  portraitIndex: number,
  gameCharacters: GameCharacter[],
  formatMessage: (targets: string) => string
): void {
  if (gameCharacters.length <= 0 || !chatTab) return;
  const parts: string[] = [];
  for (const object of gameCharacters) {
    object.buffs.decreaseRound();
    parts.push(`[${object.name}]`);
  }
  svc.sendMessage(chatTab, formatMessage(parts.join('')), gameSystem, sendFrom, '', portraitIndex);
}

export function sendDeleteZeroRoundBuffMessage(
  chatTab: ChatTab,
  svc: ChatMessageService,
  gameSystem: GameSystemClass,
  sendFrom: string,
  portraitIndex: number,
  gameCharacters: GameCharacter[],
  formatMessage: (targets: string) => string
): void {
  if (gameCharacters.length <= 0 || !chatTab) return;
  const parts: string[] = [];
  for (const object of gameCharacters) {
    object.buffs.deleteZeroRound();
    parts.push(`[${object.name}]`);
  }
  svc.sendMessage(chatTab, formatMessage(parts.join('')), gameSystem, sendFrom, '', portraitIndex);
}
