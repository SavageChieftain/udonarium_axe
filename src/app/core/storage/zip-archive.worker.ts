import type { ZipWorkerRequest, ZipWorkerResponse } from '@axe/core/storage/zip-archive-message';
import { zipCompressionLevel } from '@axe/core/storage/zip-compression';
import { type Zippable, zipSync } from 'fflate';

interface WorkerScope {
  addEventListener(type: 'message', listener: (event: MessageEvent<ZipWorkerRequest>) => void): void;
  postMessage(message: ZipWorkerResponse, transfer?: Transferable[]): void;
}

const scope = self as unknown as WorkerScope;

scope.addEventListener('message', (event) => {
  void run(event.data);
});

async function run(request: ZipWorkerRequest): Promise<void> {
  try {
    const zippable: Zippable = {};
    for (const entry of request.entries) {
      const bytes = new Uint8Array(await entry.blob.arrayBuffer());
      zippable[entry.name] = [bytes, { level: zipCompressionLevel(entry.name, entry.type) }];
    }
    const zipped = zipSync(zippable);
    const buffer = zipped.buffer.slice(zipped.byteOffset, zipped.byteOffset + zipped.byteLength) as ArrayBuffer;
    scope.postMessage({ ok: true, buffer }, [buffer]);
  } catch (reason) {
    scope.postMessage({ ok: false, message: reason instanceof Error ? reason.message : String(reason) });
  }
}
