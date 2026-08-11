/** チャットカラーコードのデフォルト値 (黒・赤・青) */
export const DEFAULT_CHAT_COLOR_CODES: readonly string[] = ['#000000', '#FF0000', '#0099FF'];

/**
 * システムメッセージ専用タブの identifier。
 *
 * 入退室や無応答の知らせは、放っておくと会話のタブへ流れ込む。
 * 名前ではなく identifier で見分けるので、名前を変えても、部屋を保存し直しても同じタブを指す。
 */
export const SYSTEM_CHAT_TAB_IDENTIFIER = 'SystemTab';

export const SYSTEM_CHAT_TAB_NAME = 'システム';
