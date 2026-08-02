import * as MimeType from '@axe/core/storage/mime-type';
import type { ZipEntry, ZipWorkerRequest, ZipWorkerResponse } from '@axe/core/storage/zip-archive-message';
import { zipCompressionLevel } from '@axe/core/storage/zip-compression';
import { unzipSync, type Zippable, zipSync } from 'fflate';

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
    if (request.kind === 'zip') {
      await runZip(request.entries);
    } else {
      await runUnzip(request.blob);
    }
  } catch (reason) {
    scope.postMessage({ kind: 'error', ok: false, message: reason instanceof Error ? reason.message : String(reason) });
  }
}

async function runZip(entries: readonly ZipEntry[]): Promise<void> {
  const zippable: Zippable = {};
  for (const entry of entries) {
    const bytes = new Uint8Array(await entry.blob.arrayBuffer());
    zippable[entry.name] = [bytes, { level: zipCompressionLevel(entry.name, entry.type) }];
  }
  const zipped = zipSync(zippable);
  const buffer = zipped.buffer.slice(zipped.byteOffset, zipped.byteOffset + zipped.byteLength) as ArrayBuffer;
  scope.postMessage({ kind: 'zip', ok: true, buffer }, [buffer]);
}

async function runUnzip(blob: Blob): Promise<void> {
  const unzipped = unzipSync(new Uint8Array(await blob.arrayBuffer()));
  const entries: ZipEntry[] = Object.entries(unzipped).map(([name, bytes]) => {
    const type = MimeType.type(name);
    return { name, type, blob: new Blob([bytes], type.length > 0 ? { type } : undefined) };
  });
  scope.postMessage({ kind: 'unzip', ok: true, entries });
}
