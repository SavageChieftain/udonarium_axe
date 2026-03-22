import { Event } from './event';
import { Subject } from './subject';

export type Callback<T> = (event: Event<T>, listener?: Observer) => void;

export interface EventMap {
  OPEN_NETWORK: { peerId: string };
  CLOSE_NETWORK: { peerId: string };
  NETWORK_ERROR: { peerId: string; errorType: string; errorMessage: string; errorObject: unknown };
  CONNECT_PEER: { peerId: string };
  DISCONNECT_PEER: { peerId: string };
  UPDATE_GAME_OBJECT: {
    aliasName: string;
    identifier: string;
    majorVersion: number;
    minorVersion: number;
    syncData: object;
  };
  DELETE_GAME_OBJECT: {
    aliasName: string;
    identifier: string;
  };
  ALARM_TIMEUP_ORIGIN: { text: string };
  ALARM_POP: { title: string; time: number };
  START_VOTE: Record<string, never>;
  FINISH_VOTE: { text: string };
  END_OLD_VOTE: Record<string, never>;
  LOCAL_OBJECT_UPDATED: null;
  UPDATE_INVENTORY: null;
  MESSAGE_ADDED: { tabIdentifier: string; messageIdentifier: string };
  SEND_MESSAGE: {
    tabIdentifier: string;
    messageIdentifier: string;
    messageTrget: { text: string; object: { name: string } | null } | null;
  };
  DICE_TABLE_MESSAGE: { tabIdentifier: string; messageIdentifier: string };
  APRIL_MESSAGE: { tabIdentifier: string; messageIdentifier: string };
  WRITING_A_MESSAGE: string;
  RE_DRAW_CHAT: Record<string, never>;
  RE_DRAW_TABLE: Record<string, never>;
  SELECT_GAME_TABLE: { identifier: string };
  SELECT_TABLETOP_OBJECT: { identifier: string; className: string };
  HIGHTLIGHT_TABLETOP_OBJECT: { identifier: string };
  FOCUS_TO_TABLETOP_COORDINATE: { x: number; y: number };
  TABLE_VIEW_ROTATE: { x: number; y: number; z: number };
  DISP_TERRAIN_GRID: Record<string, never>;
  DISP_TERRAIN_GRID_END: Record<string, never>;
  DRAG_LOCKED_OBJECT: { srcEvent?: globalThis.Event };
  RESIZE_NOTE_OBJECT: { identifier: string };
  CHK_TARGET_CHANGE: { identifier: string; className: string };
  SHUFFLE_CARD_STACK: { identifier: string };
  ROLL_DICE_SYMBOL: { identifier: string };
  CARD_STACK_DECREASED: { cardStackIdentifier: string; cardIdentifier: string };
  JUMP_INDEX: { targetId: string; lineNo: number };
  SELECT_FILE: { fileIdentifier: string };
  XML_LOADED: { xmlElement: Element };
  START_FILE_TRANSMISSION: { taskIdentifier: string };
  START_AUDIO_TRANSMISSION: { fileIdentifier: string };
  REQUEST_GAME_OBJECT: string;
  CURSOR_MOVE: [number, number, number];
  HEART_BEAT: [number, string, number | null, number];
  SOUND_EFFECT: string;
  CHANGE_GM_MODE: Record<string, never>;
  CHANGE_JUKEBOX_VOLUME: null;
}

export interface Observer {
  readonly subject: Subject;
  readonly key: object;
  readonly eventName: string;
  readonly priority: number;
  readonly callback: Callback<unknown>;
  readonly isOnlyOnce: boolean;
  readonly isRegistered: boolean;

  on<K extends keyof EventMap>(eventName: K, callback: Callback<EventMap[K]>): Observer;
  on<K extends keyof EventMap>(eventName: K, priority: number, callback: Callback<EventMap[K]>): Observer;
  on<T>(eventName: string, callback: Callback<T>): Observer;
  on<T>(eventName: string, priority: number, callback: Callback<T>): Observer;

  once<K extends keyof EventMap>(eventName: K, callback: Callback<EventMap[K]>): Observer;
  once<K extends keyof EventMap>(eventName: K, priority: number, callback: Callback<EventMap[K]>): Observer;
  once<T>(eventName: string, callback: Callback<T>): Observer;
  once<T>(eventName: string, priority: number, callback: Callback<T>): Observer;

  unregister(): Observer;

  trigger(event: Event<unknown>): void;
  isEqual(key: unknown, eventName: string, callback: unknown): boolean;
}
