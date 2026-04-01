import { localDispatch, networkMessage$, networkSend } from '@axe/core/network/network-messaging';
import { ChatMessageTargetContext } from '@axe/domain/chat/chat-message';
import { Subject } from 'rxjs';
import { filter } from 'rxjs/operators';

// --- Event interfaces ---

export interface SendMessageEvent {
  messageIdentifier: string;
  messageTrget: { text: string; object: { name: string } | null } | null;
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
}

export interface LoadConfigEvent {
  config: unknown;
}

// --- Standalone Subjects (importable without Angular DI) ---

// Subjects for events CONSUMED by domain models (fed by networkMessage$ bridge below)
const _sendMessage$ = new Subject<SendMessageEvent>();
const _diceTableMessage$ = new Subject<DiceTableMessageEvent>();
const _resourceEditMessage$ = new Subject<ResourceEditMessageEvent>();
const _peerDisconnect$ = new Subject<DomainPeerDisconnectEvent>();
const _soundEffect$ = new Subject<string>();

// Subjects for events PRODUCED by domain/feature/core code (direct .next())
const _selectGameTable$ = new Subject<SelectGameTableEvent>();
const _updateAudioResource$ = new Subject<void>();
const _messageAdded$ = new Subject<MessageAddedEvent>();
const _cardStackDecreased$ = new Subject<CardStackDecreasedEvent>();
const _startCutIn$ = new Subject<CutInEvent>();
const _stopCutIn$ = new Subject<CutInEvent>();
const _stopCutInByBgm$ = new Subject<void>();
const _finishVote$ = new Subject<FinishVoteEvent>();
const _endOldVote$ = new Subject<void>();
const _startVote$ = new Subject<void>();
const _alarmTimeUp$ = new Subject<AlarmTimeUpEvent>();
const _alarmPop$ = new Subject<AlarmPopEvent>();
const _fileLoaded$ = new Subject<void>();
const _xmlLoaded$ = new Subject<XmlLoadedEvent>();
const _loadConfig$ = new Subject<LoadConfigEvent>();
const _fileResourceUpdated$ = new Subject<void>();

// --- Observables (read-only, for consumers) ---

export const sendMessage$ = _sendMessage$.asObservable();
export const diceTableMessage$ = _diceTableMessage$.asObservable();
export const resourceEditMessage$ = _resourceEditMessage$.asObservable();
export const selectGameTable$ = _selectGameTable$.asObservable();
export const domainPeerDisconnect$ = _peerDisconnect$.asObservable();
export const updateAudioResource$ = _updateAudioResource$.asObservable();
export const soundEffect$ = _soundEffect$.asObservable();
export const messageAdded$ = _messageAdded$.asObservable();
export const cardStackDecreased$ = _cardStackDecreased$.asObservable();
export const startCutIn$ = _startCutIn$.asObservable();
export const stopCutIn$ = _stopCutIn$.asObservable();
export const stopCutInByBgm$ = _stopCutInByBgm$.asObservable();
export const finishVote$ = _finishVote$.asObservable();
export const endOldVote$ = _endOldVote$.asObservable();
export const startVote$ = _startVote$.asObservable();
export const alarmTimeUp$ = _alarmTimeUp$.asObservable();
export const alarmPop$ = _alarmPop$.asObservable();
export const fileLoaded$ = _fileLoaded$.asObservable();
export const xmlLoaded$ = _xmlLoaded$.asObservable();
export const loadConfig$ = _loadConfig$.asObservable();
export const fileResourceUpdated$ = _fileResourceUpdated$.asObservable();

// --- Publish functions (for producers to call instead of localDispatch) ---

export function emitSendMessage(event: SendMessageEvent) {
  _sendMessage$.next(event);
}
export function emitDiceTableMessage(event: DiceTableMessageEvent) {
  _diceTableMessage$.next(event);
}
export function emitResourceEditMessage(event: ResourceEditMessageEvent) {
  _resourceEditMessage$.next(event);
}
export function emitSelectGameTable(event: SelectGameTableEvent) {
  _selectGameTable$.next(event);
}
export function emitMessageAdded(event: MessageAddedEvent) {
  _messageAdded$.next(event);
}
export function emitCardStackDecreased(event: CardStackDecreasedEvent) {
  _cardStackDecreased$.next(event);
}
export function emitStartCutIn(event: CutInEvent) {
  _startCutIn$.next(event);
}
export function emitStopCutIn(event: CutInEvent) {
  _stopCutIn$.next(event);
}
export function emitStopCutInByBgm() {
  _stopCutInByBgm$.next();
}
export function emitFinishVote(event: FinishVoteEvent) {
  _finishVote$.next(event);
}
export function emitEndOldVote() {
  _endOldVote$.next();
}
export function emitStartVote() {
  _startVote$.next();
}
export function emitAlarmTimeUp(event: AlarmTimeUpEvent) {
  _alarmTimeUp$.next(event);
}
export function emitAlarmPop(event: AlarmPopEvent) {
  _alarmPop$.next(event);
}
export function emitUpdateAudioResource() {
  _updateAudioResource$.next();
}
export function emitFileLoaded() {
  _fileLoaded$.next();
}
export function emitXmlLoaded(event: XmlLoadedEvent) {
  _xmlLoaded$.next(event);
}
export function emitLoadConfig(event: LoadConfigEvent) {
  _loadConfig$.next(event);
}
export function emitFileResourceUpdated() {
  _fileResourceUpdated$.next();
}

// --- SELECT_FILE (local-only, self-targeted call replacement) ---

export interface FileSelectedEvent {
  fileIdentifier: string;
}

const _selectFile$ = new Subject<FileSelectedEvent>();
export const selectFile$ = _selectFile$.asObservable();
export function emitSelectFile(event: FileSelectedEvent) {
  _selectFile$.next(event);
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
  networkSend('WRITING_A_MESSAGE', tabIdentifier, sendTo!);
}

export function callHeartBeat(data: [number, string, number | null, number]) {
  networkSend('HEART_BEAT', data);
}

export function callCursorMove(data: [number, number, number]) {
  networkSend('CURSOR_MOVE', data);
}

// --- Bridge from network messages (for events received over P2P network) ---

networkMessage$.pipe(filter((msg) => msg.eventName === 'SEND_MESSAGE')).subscribe((msg) => {
  _sendMessage$.next(msg.data as SendMessageEvent);
});

networkMessage$.pipe(filter((msg) => msg.eventName === 'DICE_TABLE_MESSAGE')).subscribe((msg) => {
  _diceTableMessage$.next(msg.data as DiceTableMessageEvent);
});

networkMessage$.pipe(filter((msg) => msg.eventName === 'RESOURCE_EDIT_MESSAGE')).subscribe((msg) => {
  _resourceEditMessage$.next(msg.data as ResourceEditMessageEvent);
});

networkMessage$.pipe(filter((msg) => msg.eventName === 'SELECT_GAME_TABLE')).subscribe((msg) => {
  _selectGameTable$.next({ identifier: (msg.data as { identifier: string }).identifier });
});

networkMessage$.pipe(filter((msg) => msg.eventName === 'DISCONNECT_PEER')).subscribe((msg) => {
  _peerDisconnect$.next({ peerId: (msg.data as { peerId: string }).peerId });
});

networkMessage$.pipe(filter((msg) => msg.eventName === 'UPDATE_AUDIO_RESOURE')).subscribe(() => {
  _updateAudioResource$.next();
});

networkMessage$.pipe(filter((msg) => msg.eventName === 'SOUND_EFFECT')).subscribe((msg) => {
  _soundEffect$.next(msg.data as string);
});
