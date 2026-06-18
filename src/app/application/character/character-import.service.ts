import { inject, Injectable } from '@angular/core';
import { ImageStorage } from '@axe/core/storage/image-storage';
import { GameCharacter } from '@axe/domain/character/game-character';
import { parseImportedCharacterJson } from '@axe/domain/character/import/character-import-format';
import { detectImportFetchPlan, ImportFetchPlan } from '@axe/domain/character/import/import-source';
import { ImportedCharacter } from '@axe/domain/character/import/imported-character';
import { ImportedCharacterFactory } from '@axe/domain/character/import/imported-character-factory';
import { DisclosureMode } from '@axe/domain/disclosure/disclosure';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';

export type CharacterImportError = 'unrecognized' | 'unsupported' | 'fetch-failed' | 'failed';

export interface CharacterImportResult {
  character: GameCharacter | null;
  error: CharacterImportError | null;
  imageResolved: boolean;
  service: string;
}

let jsonpCounter = 0;

/**
 * 貼り付けテキストから AXE のキャラコマを生成してテーブルへ配置する。
 *
 * 入力は次のいずれでも良い:
 *   - ココフォリア コマJSON / キャラクター保管所 JSON / キャラクターシート倉庫 JSON の貼り付け
 *   - キャラクター保管所の URL（CORS 許可があるため直 fetch で取得）
 *   - キャラクターシート倉庫の URL（CORS 不可のため JSONP で取得）
 *
 * パース・組み立てはドメイン層へ委譲し、本サービスは取得（fetch/JSONP）・画像解決・
 * テーブル配置という Web API / 共有状態に依存する責務を担う。
 */
@Injectable({ providedIn: 'root' })
export class CharacterImportService {
  private readonly imageStorage = inject(ImageStorage);

  async importFromText(text: string): Promise<CharacterImportResult> {
    const plan = detectImportFetchPlan(text);
    if (plan.kind === 'unsupported') {
      return { character: null, error: 'unsupported', imageResolved: false, service: plan.service };
    }

    let json: unknown;
    try {
      json = await this.fetchJson(plan, text);
    } catch {
      return { character: null, error: 'fetch-failed', imageResolved: false, service: serviceOf(plan) };
    }

    const imported = parseImportedCharacterJson(json, plan.kind === 'jsonp' ? plan.system : undefined);
    if (!imported) {
      return { character: null, error: 'unrecognized', imageResolved: false, service: serviceOf(plan) };
    }

    try {
      const imageIdentifier = await this.resolveImageIdentifier(imported);
      const character = ImportedCharacterFactory.create(imported, imageIdentifier);
      character.owner = PeerCursor.myCursor?.userId ?? '';
      if (PeerCursor.isMyselfGameMaster) character.disclosureMode = DisclosureMode.GameMaster;
      character.update();
      return { character, error: null, imageResolved: imageIdentifier !== '', service: imported.sourceFormat };
    } catch {
      return { character: null, error: 'failed', imageResolved: false, service: serviceOf(plan) };
    }
  }

  private async fetchJson(plan: ImportFetchPlan, text: string): Promise<unknown> {
    if (plan.kind === 'fetch') {
      const response = await fetch(plan.url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return JSON.parse(await response.text());
    }
    if (plan.kind === 'jsonp') {
      return this.loadJsonp(plan.url, plan.callbackParam);
    }
    return JSON.parse(text.trim());
  }

  /**
   * CORS を返さない倉庫向けに、script タグ注入で JSONP 取得する（プロキシ非依存）。
   */
  private loadJsonp(url: string, callbackParam: string, timeoutMs = 15000): Promise<unknown> {
    return new Promise<unknown>((resolve, reject) => {
      const callbackName = `__axeJsonp${++jsonpCounter}`;
      const script = document.createElement('script');
      const globals = window as unknown as Record<string, unknown>;
      let timer: ReturnType<typeof setTimeout> | null = null;

      const cleanup = () => {
        if (timer != null) clearTimeout(timer);
        delete globals[callbackName];
        script.remove();
      };

      globals[callbackName] = (data: unknown) => {
        cleanup();
        resolve(data);
      };
      script.onerror = () => {
        cleanup();
        reject(new Error('jsonp load error'));
      };
      timer = setTimeout(() => {
        cleanup();
        reject(new Error('jsonp timeout'));
      }, timeoutMs);

      const separator = url.includes('?') ? '&' : '?';
      script.src = `${url}${separator}${callbackParam}=${callbackName}`;
      document.body.appendChild(script);
    });
  }

  /**
   * アイコン画像URL/Data URIを取得して ImageStorage へ登録し、identifier を返す。
   * 取得に失敗（CORS等）した場合は空文字を返し、キャラ生成自体は継続する。
   */
  private async resolveImageIdentifier(imported: ImportedCharacter): Promise<string> {
    if (imported.iconImageIdentifier !== '') return imported.iconImageIdentifier;
    const url = imported.iconUrl.trim();
    if (url === '') return '';
    try {
      const response = await fetch(url);
      if (!response.ok) return '';
      const blob = await response.blob();
      const imageFile = await this.imageStorage.addAsync(blob);
      return imageFile.identifier;
    } catch {
      return '';
    }
  }
}

function serviceOf(plan: ImportFetchPlan): string {
  return plan.kind === 'json' ? 'json' : plan.kind === 'unsupported' ? plan.service : plan.service;
}
