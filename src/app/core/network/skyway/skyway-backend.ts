import { Logger } from '@axe/core/logging/logger';

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

async function fetchSkyWayAuthToken(url: string, channelName: string, peerId: string): Promise<string> {
  try {
    const api = resolveApi(url, 'v1/skyway2023/token');

    const body = JSON.stringify({
      formatVersion: 1,
      channelName,
      peerId,
    });

    const response = await fetch(api, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });

    if (response.status !== 200) return '';

    const jsonObj = await response.json();
    return jsonObj.token ?? '';
  } catch (err) {
    Logger.error('[SkyWay] トークン取得エラー', err);
    return '';
  }
}
