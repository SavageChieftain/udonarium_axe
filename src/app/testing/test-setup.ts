// Angular JIT compiler — TestBed を使う spec でテンプレートをコンパイルするために必要
import '@angular/compiler';

import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ɵresolveComponentResources as resolveComponentResources } from '@angular/core';
import { TestBed, TestModuleMetadata } from '@angular/core/testing';
import { BrowserDynamicTestingModule, platformBrowserDynamicTesting } from '@angular/platform-browser-dynamic/testing';
import { Logger, LogLevel } from '@axe/core/logger';
import { readdirSync, readFileSync, statSync } from 'fs';
import { basename, join, resolve } from 'path';

// テスト実行時はロガー出力を無効化する
Logger.setLevel(LogLevel.NONE);

// 非 providedIn:'root' なサービス — 全テストで自動提供する
import { AppConfigService } from '@axe/core/app-config.service';
import { LoggerService } from '@axe/core/logger.service';
import { ChatMessageService } from '@axe/features/chat/chat-message.service';
import { TabletopService } from '@axe/features/tabletop/tabletop.service';
import { ContextMenuService } from '@axe/shared/context-menu.service';
import { ModalService } from '@axe/shared/modal.service';
import { PanelService } from '@axe/shared/panel.service';

// src/app 以下の全 HTML/CSS ファイルをファイル名でインデックス化
const srcAppDir = resolve(process.cwd(), 'src/app');
const fileMap = new Map<string, string>();

function buildFileMap(dir: string): void {
  for (const name of readdirSync(dir)) {
    const fullPath = join(dir, name);
    if (statSync(fullPath).isDirectory()) {
      buildFileMap(fullPath);
    } else if (name.endsWith('.html') || name.endsWith('.css')) {
      fileMap.set(name, fullPath);
    }
  }
}
buildFileMap(srcAppDir);

const resourceResolver = (url: string): Promise<{ text(): Promise<string> }> => {
  const name = basename(url);
  const absPath = fileMap.get(name);
  const content = absPath ? readFileSync(absPath, 'utf-8') : '';
  return Promise.resolve({ text: () => Promise.resolve(content) });
};

// ─── WebRTC / Media stub ──────────────────────────────────────────────────
// happy-dom には WebRTC API が存在しないため、@skyway-sdk/core のインポート時に
// RTCPeerConnection や navigator.mediaDevices を参照するコードがエラーになる。
// 最小限のスタブを提供する。
if (typeof globalThis.RTCPeerConnection === 'undefined') {
  const emptyTrack = {
    stop() {},
    getConstraints() {
      return {};
    },
  };
  (globalThis as unknown as Record<string, unknown>)['RTCPeerConnection'] = class RTCPeerConnection {
    addTransceiver() {
      return { sender: { track: emptyTrack }, receiver: { track: emptyTrack } };
    }
    close() {}
    createDataChannel() {
      return {};
    }
  };
  (globalThis as unknown as Record<string, unknown>)['RTCSessionDescription'] = class RTCSessionDescription {};
  (globalThis as unknown as Record<string, unknown>)['RTCIceCandidate'] = class RTCIceCandidate {};
}
if (!navigator.mediaDevices) {
  Object.defineProperty(navigator, 'mediaDevices', {
    value: {
      addEventListener() {},
      removeEventListener() {},
      enumerateDevices() {
        return Promise.resolve([]);
      },
      getUserMedia() {
        return Promise.resolve({
          getTracks() {
            return [];
          },
        });
      },
      getDisplayMedia() {
        return Promise.resolve({
          getTracks() {
            return [];
          },
        });
      },
    },
    configurable: true,
  });
}

// ─── FileReader polyfill ───────────────────────────────────────────────────
// happy-dom の FileReader は zone.js にパッチされると readAs* メソッドが欠落する
// モダンな Blob API (arrayBuffer / text) を使って再実装する
class FileReaderPolyfill {
  result: string | ArrayBuffer | null = null;
  onload: ((event: Partial<ProgressEvent>) => void) | null = null;
  onerror: ((event: Partial<ProgressEvent>) => void) | null = null;
  onabort: ((event: Partial<ProgressEvent>) => void) | null = null;

  readAsArrayBuffer(blob: Blob): void {
    blob
      .arrayBuffer()
      .then((buffer) => {
        this.result = buffer;
        this.onload?.(this.progressEvent());
      })
      .catch(() => this.onerror?.(this.progressEvent()));
  }

  readAsText(blob: Blob): void {
    blob
      .text()
      .then((text) => {
        this.result = text;
        this.onload?.(this.progressEvent());
      })
      .catch(() => this.onerror?.(this.progressEvent()));
  }

  readAsDataURL(blob: Blob): void {
    blob
      .arrayBuffer()
      .then((buffer) => {
        const bytes = Array.from(new Uint8Array(buffer));
        const base64 = btoa(bytes.map((b) => String.fromCharCode(b)).join(''));
        this.result = `data:${(blob as Blob & { type: string }).type};base64,${base64}`;
        this.onload?.(this.progressEvent());
      })
      .catch(() => this.onerror?.(this.progressEvent()));
  }

  private progressEvent(): Partial<ProgressEvent> {
    return { target: this } as unknown as Partial<ProgressEvent>;
  }
}
(globalThis as unknown as Record<string, unknown>)['FileReader'] = FileReaderPolyfill;

// 全テストで自動提供するサービス群
const GLOBAL_TEST_PROVIDERS = [
  AppConfigService,
  ChatMessageService,
  ContextMenuService,
  LoggerService,
  ModalService,
  PanelService,
  TabletopService,
] as const;

// TestBed.configureTestingModule を wrap して以下を自動付与:
//  - GLOBAL_TEST_PROVIDERS (非 root サービスを全テストで利用可能にする)
//  - NO_ERRORS_SCHEMA (<font> 等レガシー要素や未解決子コンポーネントを許容)
//
// Angular テストランナーがラッパーをリセットする可能性があるため beforeEach 内で
// 毎回適用する。sentinel プロパティを使って二重ラップを防ぐ。
const WRAPPER_SENTINEL = '__globalProviderWrapped__';

function applyConfigureTestingModuleWrapper(): void {
  if ((TestBed.configureTestingModule as unknown as Record<string, unknown>)[WRAPPER_SENTINEL]) return;
  const orig = TestBed.configureTestingModule.bind(TestBed) as (config: TestModuleMetadata) => typeof TestBed;
  const wrapped = (config: TestModuleMetadata) =>
    orig({
      ...config,
      providers: [...(config.providers ?? []), ...GLOBAL_TEST_PROVIDERS],
      schemas: [...(config.schemas ?? []), NO_ERRORS_SCHEMA],
    });
  (wrapped as unknown as Record<string, unknown>)[WRAPPER_SENTINEL] = true;
  TestBed.configureTestingModule = wrapped as typeof TestBed.configureTestingModule;
}

// TestBed テスト環境を初期化
// Vitest は各テストファイルごとにセットアップを実行するため、
// 未初期化の場合のみ initTestEnvironment を呼ぶ
try {
  TestBed.initTestEnvironment(BrowserDynamicTestingModule, platformBrowserDynamicTesting());
} catch {
  // すでに初期化済みの場合は無視
}

// 各テストファイルのモジュール import 後、TestBed.configureTestingModule の前に
// コンポーネントリソース (templateUrl / styleUrls) を解決し、ラッパーを適用する
beforeEach(async () => {
  await resolveComponentResources(resourceResolver as Parameters<typeof resolveComponentResources>[0]);
  applyConfigureTestingModuleWrapper();
});
