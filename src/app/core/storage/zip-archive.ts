import { Logger } from '@axe/core/logging/logger';
import type { ZipWorkerEntry, ZipWorkerResponse } from '@axe/core/storage/zip-archive-message';
import { zipCompressionLevel } from '@axe/core/storage/zip-compression';
import { type AsyncZippable, zip } from 'fflate';

const ZIP_MIME_TYPE = 'application/zip';

let isWorkerBroken = false;

export async function createZipBlob(files: readonly File[]): Promise<Blob> {
  const entries: ZipWorkerEntry[] = files.map((file) => ({ name: file.name, type: file.type, blob: file }));
  const fromWorker = await createZipBlobInWorker(entries);
  if (fromWorker) return fromWorker;
  return createZipBlobOnMainThread(files);
}

export async function createZipBlobOnMainThread(files: readonly File[]): Promise<Blob> {
  const zipData: AsyncZippable = {};
  for (const file of files) {
    const level = zipCompressionLevel(file.name, file.type);
    zipData[file.name] = [new Uint8Array(await file.arrayBuffer()), { level }];
  }
  return new Promise<Blob>((resolve, reject) => {
    zip(zipData, (err, data) => {
      if (err) reject(err);
      else resolve(new Blob([data.slice()], { type: ZIP_MIME_TYPE }));
    });
  });
}

function createWorker(): Worker | null {
  if (isWorkerBroken || typeof Worker === 'undefined') return null;
  try {
    return new Worker(new URL('./zip-archive.worker', import.meta.url), { type: 'module' });
  } catch (reason) {
    isWorkerBroken = true;
    Logger.warn('[ZipArchive] ワーカーを起動できないためメインスレッドで圧縮します', reason);
    return null;
  }
}

function createZipBlobInWorker(entries: ZipWorkerEntry[]): Promise<Blob | null> {
  const worker = createWorker();
  if (!worker) return Promise.resolve(null);

  return new Promise<Blob | null>((resolve) => {
    const finish = (blob: Blob | null) => {
      worker.terminate();
      resolve(blob);
    };
    worker.addEventListener('message', (event: MessageEvent<ZipWorkerResponse>) => {
      const response = event.data;
      if (response.ok) {
        finish(new Blob([response.buffer], { type: ZIP_MIME_TYPE }));
        return;
      }
      Logger.warn('[ZipArchive] ワーカーでの圧縮に失敗しました', response.message);
      finish(null);
    });
    worker.addEventListener('error', (event) => {
      isWorkerBroken = true;
      Logger.warn('[ZipArchive] ワーカーでの圧縮に失敗しました', event.message);
      finish(null);
    });
    try {
      worker.postMessage({ entries });
    } catch (reason) {
      isWorkerBroken = true;
      Logger.warn('[ZipArchive] ワーカーへ渡せないためメインスレッドで圧縮します', reason);
      finish(null);
    }
  });
}
