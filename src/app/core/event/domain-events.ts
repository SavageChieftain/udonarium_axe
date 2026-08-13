import { EventChannel, StickyEventChannel } from '@axe/core/event/event-channel';
import { localDispatch, networkMessage$, networkSend } from '@axe/core/network/network-messaging';
import { getPeerContext } from '@axe/core/network/peer-context-source';
import { ArchiveEntries } from '@axe/core/storage/room-archive';

export interface SendMessageEvent {
  messageIdentifier: string;
  messageTarget: { text: string; object: { name: string } | null } | null;
}

export interface DiceTableMessageEvent {
  messageIdentifier: string;
}

export interface ResourceChangeEvent {
  /** 増減が起きたコマ。 */
  characterIdentifier: string;
  /** 何がどれだけ動いたか。描くのに要る情報だけを載せる。 */
  changes: unknown[];
  /** 知らせた端末。自分が知らせたぶんは、その場で描いているので受け流す。 */
  emittedBy?: string;
}

export interface ResourceEditMessageEvent {
  messageIdentifier: string;
  messageTargetContext: unknown[] | null;
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

export interface VoteTally {
  choice: string;
  count: number;
}

export interface FinishVoteEvent {
  isRollCall: boolean;
  voteTitle: string;
  voted: number;
  total: number;
  abstained: number;
  unanswered: number;
  tally: VoteTally[];
  chatTabIdentifier?: string;
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

export interface ImageDroppedEvent {
  identifier: string;
  fileName: string;
  dropPoint: { x: number; y: number };
}

export interface CcfoliaRoomDroppedEvent {
  entries: ArchiveEntries;
}

export interface LoadConfigEvent {
  config: unknown;
}

export interface EffectCastEvent {
  cast: unknown;
}

export const sendMessage$ = new EventChannel<SendMessageEvent>();
export const diceTableMessage$ = new EventChannel<DiceTableMessageEvent>();
export const resourceEditMessage$ = new EventChannel<ResourceEditMessageEvent>();
export const domainPeerDisconnect$ = new EventChannel<DomainPeerDisconnectEvent>();
export const soundEffect$ = new EventChannel<string>();

export const effectCast$ = new EventChannel<EffectCastEvent>();
export const resourceChange$ = new EventChannel<ResourceChangeEvent>();

export const selectGameTable$ = new EventChannel<SelectGameTableEvent>();
export const updateAudioResource$ = new EventChannel<void>();
export const messageAdded$ = new EventChannel<MessageAddedEvent>();
export const cardStackDecreased$ = new EventChannel<CardStackDecreasedEvent>();
export const startCutIn$ = new EventChannel<CutInEvent>();
export const soundOnlyCutIn$ = new EventChannel<CutInEvent>();
export const stopCutIn$ = new EventChannel<CutInEvent>();
export const stopCutInByBgm$ = new EventChannel<void>();
export const finishVote$ = new EventChannel<FinishVoteEvent>();
export const endOldVote$ = new EventChannel<void>();
export const startVote$ = new EventChannel<void>();
export const alarmTimeUp$ = new EventChannel<AlarmTimeUpEvent>();
export const alarmPop$ = new EventChannel<AlarmPopEvent>();
export const fileLoaded$ = new EventChannel<void>();
export const xmlLoaded$ = new EventChannel<XmlLoadedEvent>();
export const imageDropped$ = new EventChannel<ImageDroppedEvent>();
export const ccfoliaRoomDropped$ = new EventChannel<CcfoliaRoomDroppedEvent>();
// APP_INITIALIZER の設定ロード(emit)が AppComponent 生成時の購読より先に走り得るため、
// 取りこぼし（= openStandby 未実行で peerId が '???' のまま固定）を防ぐ sticky チャネルにする。
export const loadConfig$ = new StickyEventChannel<LoadConfigEvent>();
export const fileResourceUpdated$ = new EventChannel<void>();

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
export function emitSoundOnlyCutIn(event: CutInEvent) {
  soundOnlyCutIn$.emit(event);
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
export function emitFileLoaded() {
  fileLoaded$.emit();
}
export function emitXmlLoaded(event: XmlLoadedEvent) {
  xmlLoaded$.emit(event);
}
export function emitImageDropped(event: ImageDroppedEvent) {
  imageDropped$.emit(event);
}
export function emitCcfoliaRoomDropped(event: CcfoliaRoomDroppedEvent) {
  ccfoliaRoomDropped$.emit(event);
}
export function emitLoadConfig(event: LoadConfigEvent) {
  loadConfig$.emit(event);
}
export interface FileSelectedEvent {
  fileIdentifier: string;
}

export const selectFile$ = new EventChannel<FileSelectedEvent>();
export function emitSelectFile(event: FileSelectedEvent) {
  selectFile$.emit(event);
}

export function triggerUpdateGameObject(context: unknown) {
  localDispatch('UPDATE_GAME_OBJECT', context);
}

export function callRollDiceSymbol(identifier: string) {
  networkSend('ROLL_DICE_SYMBOL', { identifier });
}

export function callFlipCoin(identifier: string, face: string) {
  networkSend('FLIP_COIN', { identifier, face });
}

export function callShuffleCardStack(identifier: string) {
  networkSend('SHUFFLE_CARD_STACK', { identifier });
}

export function callSoundEffect(identifier: string) {
  networkSend('SOUND_EFFECT', identifier);
}

export function callEffectCast(cast: unknown) {
  networkSend('EFFECT_CAST', cast);
}

/**
 * リソースの増減を全員へ知らせる。
 *
 * 値の差分を各自が見張ると、部屋データの読み込みや同期で入れ替わった値まで
 * 増減として扱ってしまう。変えた端末だけが知らせ、全員はこれを見て描く。
 */
export function callResourceChange(event: ResourceChangeEvent) {
  networkSend('RESOURCE_CHANGE', { ...event, emittedBy: getPeerContext().peerId });
}

export function callWritingAMessage(tabIdentifier: string, sendTo?: string | null, speakerIdentifier?: string | null) {
  networkSend('WRITING_A_MESSAGE', tabIdentifier, sendTo ?? undefined);
  if (speakerIdentifier) {
    networkSend('WRITING_A_MESSAGE_DETAIL', { tabIdentifier, speakerIdentifier }, sendTo ?? undefined);
  }
}

export function callHeartBeat(data: [number, string, number | null, number]) {
  networkSend('HEART_BEAT', data);
}

export function callCursorMove(data: [number, number, number]) {
  networkSend('CURSOR_MOVE', data);
}

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
    case 'EFFECT_CAST':
      effectCast$.emit({ cast: msg.data });
      break;
    case 'RESOURCE_CHANGE':
      resourceChange$.emit(msg.data as ResourceChangeEvent);
      break;
  }
});
