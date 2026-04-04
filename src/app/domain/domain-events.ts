import { EventChannel } from '@axe/core/event/event-channel';
import { localDispatch, networkMessage$, networkSend } from '@axe/core/network/network-messaging';
import { ChatMessageTargetContext } from '@axe/domain/chat/chat-message';

// --- Event interfaces ---

export interface SendMessageEvent {
  messageIdentifier: string;
  messageTarget: { text: string; object: { name: string } | null } | null;
}

export interface DiceTableMessageEvent {
  messageIdentifier: string;
}

export interface ResourceEditMessageEvent {
  messageIdentifier: string;
  messageTargetContext: ChatMessageTargetContext[] | null;
}

export interface SelectGameTableEvent {
  identifier: string;
}

export interface DomainPeerDisconnectEvent {
  peerId: string;
}

export interface MessageAddedEvent {
  tabIdentifier: string;
  messageIdentifier: string;
}

export interface CardStackDecreasedEvent {
  cardStackIdentifier: string;
  cardIdentifier: string;
}

export interface CutInEvent {
  cutIn: unknown;
}

export interface FinishVoteEvent {
  text: string;
}

export interface AlarmTimeUpEvent {
  text: string;
}

export interface AlarmPopEvent {
  title: string;
  time: number;
}

export interface XmlLoadedEvent {
  xmlElement: Element;
  dropPoint?: { x: number; y: number };
}

export interface LoadConfigEvent {
  config: unknown;
}

// --- EventChannels (importable without Angular DI) ---

/** Events fed by networkMessage$ bridge below. */
export const sendMessage$ = new EventChannel<SendMessageEvent>();
export const diceTableMessage$ = new EventChannel<DiceTableMessageEvent>();
export const resourceEditMessage$ = new EventChannel<ResourceEditMessageEvent>();
export const domainPeerDisconnect$ = new EventChannel<DomainPeerDisconnectEvent>();
export const soundEffect$ = new EventChannel<string>();

/** Events produced by domain/feature/core code. */
export const selectGameTable$ = new EventChannel<SelectGameTableEvent>();
export const updateAudioResource$ = new EventChannel<void>();
export const messageAdded$ = new EventChannel<MessageAddedEvent>();
export const cardStackDecreased$ = new EventChannel<CardStackDecreasedEvent>();
export const startCutIn$ = new EventChannel<CutInEvent>();
export const stopCutIn$ = new EventChannel<CutInEvent>();
export const stopCutInByBgm$ = new EventChannel<void>();
export const finishVote$ = new EventChannel<FinishVoteEvent>();
export const endOldVote$ = new EventChannel<void>();
export const startVote$ = new EventChannel<void>();
export const alarmTimeUp$ = new EventChannel<AlarmTimeUpEvent>();
export const alarmPop$ = new EventChannel<AlarmPopEvent>();
export const fileLoaded$ = new EventChannel<void>();
export const xmlLoaded$ = new EventChannel<XmlLoadedEvent>();
export const loadConfig$ = new EventChannel<LoadConfigEvent>();
export const fileResourceUpdated$ = new EventChannel<void>();

// --- Publish functions ---

export function emitSendMessage(event: SendMessageEvent) {
  sendMessage$.emit(event);
}
export function emitDiceTableMessage(event: DiceTableMessageEvent) {
  diceTableMessage$.emit(event);
}
export function emitResourceEditMessage(event: ResourceEditMessageEvent) {
  resourceEditMessage$.emit(event);
}
export function emitSelectGameTable(event: SelectGameTableEvent) {
  selectGameTable$.emit(event);
}
export function emitMessageAdded(event: MessageAddedEvent) {
  messageAdded$.emit(event);
}
export function emitCardStackDecreased(event: CardStackDecreasedEvent) {
  cardStackDecreased$.emit(event);
}
export function emitStartCutIn(event: CutInEvent) {
  startCutIn$.emit(event);
}
export function emitStopCutIn(event: CutInEvent) {
  stopCutIn$.emit(event);
}
export function emitStopCutInByBgm() {
  stopCutInByBgm$.emit();
}
export function emitFinishVote(event: FinishVoteEvent) {
  finishVote$.emit(event);
}
export function emitEndOldVote() {
  endOldVote$.emit();
}
export function emitStartVote() {
  startVote$.emit();
}
export function emitAlarmTimeUp(event: AlarmTimeUpEvent) {
  alarmTimeUp$.emit(event);
}
export function emitAlarmPop(event: AlarmPopEvent) {
  alarmPop$.emit(event);
}
export function emitUpdateAudioResource() {
  updateAudioResource$.emit();
}
export function emitFileLoaded() {
  fileLoaded$.emit();
}
export function emitXmlLoaded(event: XmlLoadedEvent) {
  xmlLoaded$.emit(event);
}
export function emitLoadConfig(event: LoadConfigEvent) {
  loadConfig$.emit(event);
}
export function emitFileResourceUpdated() {
  fileResourceUpdated$.emit();
}

// --- SELECT_FILE (local-only, self-targeted call replacement) ---

export interface FileSelectedEvent {
  fileIdentifier: string;
}

export const selectFile$ = new EventChannel<FileSelectedEvent>();
export function emitSelectFile(event: FileSelectedEvent) {
  selectFile$.emit(event);
}

// --- Trigger wrappers (local dispatch for core sync protocol) ---

export function triggerUpdateGameObject(context: unknown) {
  localDispatch('UPDATE_GAME_OBJECT', context);
}

// --- Call wrappers (P2P broadcast via Network) ---

export function callRollDiceSymbol(identifier: string) {
  networkSend('ROLL_DICE_SYMBOL', { identifier });
}

export function callShuffleCardStack(identifier: string) {
  networkSend('SHUFFLE_CARD_STACK', { identifier });
}

export function callSoundEffect(identifier: string) {
  networkSend('SOUND_EFFECT', identifier);
}

export function callWritingAMessage(tabIdentifier: string, sendTo?: string | null) {
  networkSend('WRITING_A_MESSAGE', tabIdentifier, sendTo ?? undefined);
}

export function callHeartBeat(data: [number, string, number | null, number]) {
  networkSend('HEART_BEAT', data);
}

export function callCursorMove(data: [number, number, number]) {
  networkSend('CURSOR_MOVE', data);
}

// --- Bridge: route networkMessage$ events into domain EventChannels ---

networkMessage$.subscribe((msg) => {
  switch (msg.eventName) {
    case 'SEND_MESSAGE':
      sendMessage$.emit(msg.data as SendMessageEvent);
      break;
    case 'DICE_TABLE_MESSAGE':
      diceTableMessage$.emit(msg.data as DiceTableMessageEvent);
      break;
    case 'RESOURCE_EDIT_MESSAGE':
      resourceEditMessage$.emit(msg.data as ResourceEditMessageEvent);
      break;
    case 'SELECT_GAME_TABLE':
      selectGameTable$.emit({ identifier: (msg.data as { identifier: string }).identifier });
      break;
    case 'DISCONNECT_PEER':
      domainPeerDisconnect$.emit({ peerId: (msg.data as { peerId: string }).peerId });
      break;
    case 'UPDATE_AUDIO_RESOURE':
      updateAudioResource$.emit();
      break;
    case 'SOUND_EFFECT':
      soundEffect$.emit(msg.data as string);
      break;
  }
});
