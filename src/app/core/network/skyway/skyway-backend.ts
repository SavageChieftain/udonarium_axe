import { Logger } from '@axe/core/logging/logger';

/** トークン取得の総試行回数（初回＋リトライ）。サーバレスバックエンドのコールドスタート窓を吸収する。 */
const TOKEN_FETCH_ATTEMPTS = 3;
/** 1 試行あたりのタイムアウト(ms)。応答が返らず固まる（→ ID が `???` のまま）状態を防ぐ。 */
const TOKEN_FETCH_TIMEOUT_MS = 5000;
/** 各リトライ前の待機(ms)。インデックスは「次に待つ試行」に対応。 */
const TOKEN_FETCH_BACKOFF_MS = [500, 1500];

export class SkyWayBackend {
  constructor(readonly url: string) {}

  async alive(): Promise<boolean> {
    return fetchStatus(this.url);
  }

  async createSkyWayAuthToken(channelName: string, peerId: string): Promise<string> {
    return fetchSkyWayAuthToken(this.url, channelName, peerId);
  }
}

function resolveApi(base: string, path: string): URL {
  const normalized = base.endsWith('/') ? base : base + '/';
  return new URL(path, normalized);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 5xx・408・429 は一時的（コールドスタート / 過負荷 / ゲートウェイ）とみなしリトライ対象。
 * それ以外の 4xx（URL 誤り・認証設定ミス等）は恒久的なのでリトライせず即失敗させる。
 */
function isRetriableStatus(status: number): boolean {
  return status >= 500 || status === 408 || status === 429;
}

async function fetchWithTimeout(input: URL, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchStatus(url: string): Promise<boolean> {
  try {
    const api = resolveApi(url, 'v1/status');
    const response = await fetch(api);

    return response.ok;
  } catch (err) {
    Logger.error('[SkyWay] ステータス取得エラー', err);
    return false;
  }
}

/**
 * トークン発行バックエンドからトークンを取得する。
 *
 * 再起動直後やデプロイ直後はサーバレスバックエンドがコールドスタートし、初回リクエストが
 * 5xx / タイムアウト / 接続失敗になりやすい。タイムアウト付きで数回リトライし、その窓を吸収する。
 * 取得できなければ空文字を返す（呼び出し側は `server-error` として扱う）。
 */
async function fetchSkyWayAuthToken(url: string, channelName: string, peerId: string): Promise<string> {
  const api = resolveApi(url, 'v1/skyway2023/token');
  const body = JSON.stringify({
    formatVersion: 1,
    channelName,
    peerId,
  });

  for (let attempt = 0; attempt < TOKEN_FETCH_ATTEMPTS; attempt++) {
    try {
      const response = await fetchWithTimeout(
        api,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
        },
        TOKEN_FETCH_TIMEOUT_MS
      );

      if (response.status === 200) {
        const jsonObj = await response.json();
        return jsonObj.token ?? '';
      }

      if (!isRetriableStatus(response.status)) return '';
      Logger.warn(
        `[SkyWay] トークン取得が一時失敗 (status=${response.status}) 試行 ${attempt + 1}/${TOKEN_FETCH_ATTEMPTS}`
      );
    } catch (err) {
      Logger.warn(`[SkyWay] トークン取得に失敗 試行 ${attempt + 1}/${TOKEN_FETCH_ATTEMPTS}`, err);
    }

    if (attempt < TOKEN_FETCH_ATTEMPTS - 1) {
      await delay(TOKEN_FETCH_BACKOFF_MS[attempt] ?? TOKEN_FETCH_BACKOFF_MS[TOKEN_FETCH_BACKOFF_MS.length - 1]);
    }
  }

  Logger.error('[SkyWay] トークン取得に繰り返し失敗しました');
  return '';
}
