import { LogLevel, Logger } from '@axe/core/logger';

// npm test (Angular unit-test runner) ではロガー出力を既定で無効化する。
Logger.setLevel(LogLevel.NONE);

// ─── RTCPeerConnection スタブ ──────────────────────────────────────────────────
// @skyway-sdk/core がモジュール読み込み時に RTCPeerConnection を参照するため、
// happy-dom テスト環境向けにスタブを提供する。
if (typeof globalThis.RTCPeerConnection === 'undefined') {
  (globalThis as unknown as Record<string, unknown>)['RTCPeerConnection'] = class RTCPeerConnection {
    addTransceiver(kind: string) {
      return { receiver: { track: { kind, stop() {} } } };
    }
    close() {}
  };
}

// ─── navigator.mediaDevices スタブ ─────────────────────────────────────────
// @skyway-sdk/core の StreamFactory がモジュール読み込み時に navigator.mediaDevices を要求する
if (!navigator.mediaDevices) {
  Object.defineProperty(navigator, 'mediaDevices', {
    value: {
      addEventListener() {},
      removeEventListener() {},
      enumerateDevices: () => Promise.resolve([]),
      getUserMedia: () => Promise.resolve(new MediaStream()),
    },
    configurable: true,
  });
}

// ─── FileReader polyfill ───────────────────────────────────────────────────
// happy-dom の FileReader は zone.js にパッチされると readAs* メソッドが欠落する。
// モダンな Blob API (arrayBuffer / text) を使って再実装する。
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
        this.onload?.({ target: this } as unknown as Partial<ProgressEvent>);
      })
      .catch(() => this.onerror?.({ target: this } as unknown as Partial<ProgressEvent>));
  }

  readAsText(blob: Blob): void {
    blob
      .text()
      .then((text) => {
        this.result = text;
        this.onload?.({ target: this } as unknown as Partial<ProgressEvent>);
      })
      .catch(() => this.onerror?.({ target: this } as unknown as Partial<ProgressEvent>));
  }

  readAsDataURL(blob: Blob): void {
    blob
      .arrayBuffer()
      .then((buffer) => {
        const bytes = Array.from(new Uint8Array(buffer));
        const base64 = btoa(bytes.map((b) => String.fromCharCode(b)).join(''));
        this.result = `data:${(blob as Blob & { type: string }).type};base64,${base64}`;
        this.onload?.({ target: this } as unknown as Partial<ProgressEvent>);
      })
      .catch(() => this.onerror?.({ target: this } as unknown as Partial<ProgressEvent>));
  }
}

(globalThis as unknown as Record<string, unknown>)['FileReader'] = FileReaderPolyfill;
