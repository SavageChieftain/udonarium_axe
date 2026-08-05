/**
 * チャット本文に混ぜる演出トークン。
 *
 * `2d6+3 t:HP-10 《爆炎》` のように書いておくと、ダイスとダメージ処理に続けて演出が出る。
 * VN の `〔…〕` と同じく二重山括弧はチャット記法として空いているので、
 * 既存のダイス式やリソース操作と衝突しない。
 */

const TOKEN_PATTERN = /《([^《》]+)》/g;

export interface EffectChatToken {
  /** 呼び出すエフェクトの名前。 */
  name: string;
  /** トークンを取り除いた本文。 */
  text: string;
}

/** 本文から最初の演出トークンを取り出す。無ければ null。 */
export function parseEffectChatToken(text: string): EffectChatToken | null {
  TOKEN_PATTERN.lastIndex = 0;
  const matched = TOKEN_PATTERN.exec(text);
  if (!matched) return null;

  const name = matched[1].trim();
  if (name.length < 1) return null;

  return { name, text: stripEffectChatTokens(text) };
}

/** 本文から演出トークンを全部取り除く。 */
export function stripEffectChatTokens(text: string): string {
  return text
    .replace(TOKEN_PATTERN, '')
    .replace(/[\s\u3000]{2,}/g, ' ')
    .trim();
}

/** パレット行へ足すトークン。 */
export function buildEffectChatToken(name: string): string {
  return `《${name}》`;
}
