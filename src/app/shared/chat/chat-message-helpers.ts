import { ChatMessageTargetContext } from '@axe/domain/chat/chat-message';
import GameSystemClass from 'bcdice/lib/game_system';

export interface DiceBotTagResolver {
  checkSecretDiceCommand(gameSystem: GameSystemClass, text: string): boolean;
  checkSecretEditCommand(text: string): boolean;
}

export type TachieCommand =
  | { type: 'none' }
  | { type: 'hide' }
  | { type: 'index'; index: number }
  | { type: 'name'; name: string };

export interface ImageNameEntry {
  label: string;
  identifier: string;
}

export interface ImageIdentifierResult {
  identifier: string;
  index: number;
}

export interface ChatEventPlan {
  sendTargets: ChatMessageTargetContext[] | [null];
  shouldEmitDiceTable: true;
  resourceEditTargetContext: ChatMessageTargetContext[] | null;
}

export function resolveTachieIndex(tachieNum?: number): number {
  return tachieNum != null && tachieNum > 0 ? tachieNum : 0;
}

export function resolveMessageColor(color: string | undefined, defaultColor: string): string {
  return color ?? defaultColor;
}

export function resolveChatMessageTag(
  gameSystem: GameSystemClass | null,
  text: string,
  dicebot: DiceBotTagResolver
): string {
  if (gameSystem == null) return '';
  if (dicebot.checkSecretDiceCommand(gameSystem, text) || dicebot.checkSecretEditCommand(text)) {
    return `${gameSystem.ID} secret`;
  }
  return gameSystem.ID;
}

export function parseTachieCommand(text: string): TachieCommand {
  const matchesArray = (' ' + text).match(/\s[@＠](\S+)\s*$/i);
  if (!matchesArray) return { type: 'none' };

  const token = matchesArray[1];
  if (/^[hHｈＨ][iIｉＩ][dDｄＤ][eEｅＥ]$/.test(token)) {
    return { type: 'hide' };
  }

  const matchNum = token.match(/(\d+)$/);
  if (matchNum) {
    return { type: 'index', index: parseInt(matchNum[1]) };
  }

  return { type: 'name', name: token };
}

export function stripTachieCommand(text: string): string {
  return text.replace(/([@＠]\S+\s*)$/i, '');
}

export function findImageIdentifierByName(entries: ImageNameEntry[], name: string): ImageIdentifierResult {
  for (let i = 0; i < entries.length; i++) {
    if (entries[i].label === name) {
      return { identifier: entries[i].identifier, index: i };
    }
  }

  for (let i = 0; i < entries.length; i++) {
    if (entries[i].label.indexOf(name) === 0) {
      return { identifier: entries[i].identifier, index: i };
    }
  }

  return { identifier: '', index: 0 };
}

export function calcChatTimestamp(now: number, latest: number): number {
  return now <= latest ? latest + 1 : now;
}

export function resolveImagePos(pos: number | undefined): number {
  if (pos == null) return 0;
  return 0 <= pos && pos <= 11 ? pos : 0;
}

export function emitChatMessageEvents(messageTargetContext?: ChatMessageTargetContext[]): ChatEventPlan {
  if (messageTargetContext && messageTargetContext.length >= 1) {
    return {
      sendTargets: messageTargetContext,
      shouldEmitDiceTable: true,
      resourceEditTargetContext: messageTargetContext,
    };
  }

  return {
    sendTargets: [null],
    shouldEmitDiceTable: true,
    resourceEditTargetContext: null,
  };
}
