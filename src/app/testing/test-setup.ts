import '@angular/compiler';

import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ɵresolveComponentResources as resolveComponentResources } from '@angular/core';
import { TestBed, TestModuleMetadata } from '@angular/core/testing';
import { BrowserDynamicTestingModule, platformBrowserDynamicTesting } from '@angular/platform-browser-dynamic/testing';
import { Logger, LogLevel } from '@axe/core/logging/logger';
import { readdirSync, readFileSync, statSync } from 'fs';
import { basename, join, resolve } from 'path';

Logger.setLevel(LogLevel.NONE);

import { ChatMessageService } from '@axe/application/chat/chat-message.service';
import { TabletopService } from '@axe/application/tabletop/tabletop.service';
import { ContextMenuService } from '@axe/application/ui/context-menu.service';
import { ModalService } from '@axe/application/ui/modal.service';
import { PanelService } from '@axe/application/ui/panel.service';
import { AppConfigService } from '@axe/composition/app-config.service';
import { LoggerService } from '@axe/core/logging/logger.service';
import { provideTranslocoTesting } from '@axe/testing/transloco-testing';

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

// happy-dom has no WebRTC API; @skyway-sdk/core touches RTC* at import time.
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

// happy-dom's FileReader loses readAs* once zone.js patches it; rebuild on Blob API.
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

const GLOBAL_TEST_PROVIDERS = [
  AppConfigService,
  ChatMessageService,
  ContextMenuService,
  LoggerService,
  ModalService,
  PanelService,
  TabletopService,
  ...provideTranslocoTesting(),
];

// Re-apply per beforeEach; the Angular test runner may reset the wrapper. Sentinel guards re-wrap.
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

// Vitest runs setup once per test file; swallow the "already initialized" throw on re-entry.
try {
  TestBed.initTestEnvironment(BrowserDynamicTestingModule, platformBrowserDynamicTesting());
} catch {
  /* already initialized */
}

beforeEach(async () => {
  await resolveComponentResources(resourceResolver as Parameters<typeof resolveComponentResources>[0]);
  applyConfigureTestingModuleWrapper();
});
