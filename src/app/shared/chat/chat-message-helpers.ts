import { ChatMessageTargetContext } from '@axe/domain/chat/chat-message';
import GameSystemClass from 'bcdice/lib/game_system';

export interface DiceBotTagResolver {
  checkSecretDiceCommand(gameSystem: GameSystemClass, text: string): boolean;
  checkSecretEditCommand(text: string): boolean;
}

export type PortraitCommand =
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

export function resolvePortraitIndex(portraitIndex?: number): number {
  return portraitIndex != null && portraitIndex > 0 ? portraitIndex : 0;
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

export function parsePortraitCommand(text: string): PortraitCommand {
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

export function stripPortraitCommand(text: string): string {
  return text.replace(/([@＠]\S+\s*)$/i, '');
}

export function findImageIdentifierByName(entries: ImageNameEntry[], name: string): ImageIdentifierResult {
  for (let i = 0; i < entries.length; i++) {
    if (entries[i].label === name) {
      return { identifier: entries[i].identifier, index: i };
    }
  }

  for (let i = 0; i < entries.length; i++) {
    if (entries[i].label.startsWith(name)) {
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
  return pos >= 0 && pos <= 11 ? pos : 0;
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
