export type ImportFetchPlan =
  | { kind: 'json' }
  | { kind: 'fetch'; service: 'charasheet' | 'ytsheet'; url: string }
  | { kind: 'jsonp'; service: 'appspot'; url: string; callbackParam: string; system: string }
  | { kind: 'unsupported'; service: 'charaxiv' | 'unknown' };

const CHARASHEET_HOST = 'charasheet.vampire-blood.net';
const APPSPOT_HOST = 'character-sheets.appspot.com';
const CHARAXIV_HOSTS = ['charaxiv.app', 'charaxiv.com'];
const YTSHEET_HOSTS = ['yutorize.work', 'yutorize.2-d.jp'];

function parseUrl(text: string): URL | null {
  if (!/^https?:\/\//i.test(text)) return null;
  try {
    return new URL(text);
  } catch {
    return null;
  }
}

function lastPathSegment(pathname: string): string {
  const segments = pathname.split('/').filter((part) => part.length > 0);
  const last = segments[segments.length - 1] ?? '';
  const dot = last.indexOf('.');
  return dot >= 0 ? last.slice(0, dot) : last;
}

function firstPathSegment(pathname: string): string {
  return pathname.split('/').filter((part) => part.length > 0)[0] ?? '';
}

/**
 * 貼り付けテキストが URL の場合、サービスを判別して JSON 取得方法を決める純粋関数。
 * 実測した CORS 可否に基づく:
 *   - charasheet: `Access-Control-Allow-Origin: *` のため `{id}.js` を直 fetch できる
 *   - appspot: CORS 不可のため JSONP (callback) で取得する
 *   - ゆとシート: `?mode=json` が `Access-Control-Allow-Origin: *` を返すため直 fetch できる
 *   - CharaXiv: 公開 API が不安定 / CORS 閉のため未対応（ココフォリア形式の貼り付けへ誘導）
 * URL でなければ JSON テキストとして扱う。
 */
export function detectImportFetchPlan(text: string): ImportFetchPlan {
  const trimmed = text.trim();
  const url = parseUrl(trimmed);
  if (!url) return { kind: 'json' };

  const host = url.hostname.toLowerCase();

  if (host === CHARASHEET_HOST) {
    const id = lastPathSegment(url.pathname);
    if (id === '') return { kind: 'unsupported', service: 'unknown' };
    return { kind: 'fetch', service: 'charasheet', url: `https://${CHARASHEET_HOST}/${id}.js` };
  }

  if (host === APPSPOT_HOST) {
    const system = firstPathSegment(url.pathname);
    const key = url.searchParams.get('key') ?? '';
    if (system === '' || key === '') return { kind: 'unsupported', service: 'unknown' };
    const fetchUrl = `https://${APPSPOT_HOST}/${system}/display?ajax=1&base64Image=1&key=${encodeURIComponent(key)}`;
    return { kind: 'jsonp', service: 'appspot', url: fetchUrl, callbackParam: 'callback', system };
  }

  if (YTSHEET_HOSTS.includes(host)) {
    const segments = url.pathname.split('/').filter((part) => part.length > 0);
    const system = segments[0] === 'ytsheet' ? (segments[1] ?? '') : (segments[0] ?? '');
    const id = url.searchParams.get('id') ?? '';
    if (system === '' || id === '') return { kind: 'unsupported', service: 'unknown' };
    return {
      kind: 'fetch',
      service: 'ytsheet',
      url: `https://yutorize.work/ytsheet/${system}/?id=${encodeURIComponent(id)}&mode=json`,
    };
  }

  if (CHARAXIV_HOSTS.includes(host)) return { kind: 'unsupported', service: 'charaxiv' };

  return { kind: 'unsupported', service: 'unknown' };
}
