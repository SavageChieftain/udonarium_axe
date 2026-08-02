import { Logger } from '@axe/core/logging/logger';
import * as MimeType from '@axe/core/storage/mime-type';
import type { ZipEntry, ZipWorkerRequest, ZipWorkerResponse } from '@axe/core/storage/zip-archive-message';
import { zipCompressionLevel } from '@axe/core/storage/zip-compression';
import { type AsyncZippable, unzip, type Unzipped, zip } from 'fflate';

const ZIP_MIME_TYPE = 'application/zip';

let isWorkerBroken = false;

export async function createZipBlob(files: readonly File[]): Promise<Blob> {
  const entries: ZipEntry[] = files.map((file) => ({ name: file.name, type: file.type, blob: file }));
  const response = await requestWorker({ kind: 'zip', entries });
  if (response?.kind === 'zip') return new Blob([response.buffer], { type: ZIP_MIME_TYPE });
  return createZipBlobOnMainThread(files);
}

export async function readZipEntries(blob: Blob): Promise<ZipEntry[]> {
  const response = await requestWorker({ kind: 'unzip', blob });
  if (response?.kind === 'unzip') return response.entries;
  return readZipEntriesOnMainThread(blob);
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

export async function readZipEntriesOnMainThread(blob: Blob): Promise<ZipEntry[]> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const unzipped = await new Promise<Unzipped>((resolve, reject) => {
    unzip(bytes, (err, data) => {
      if (err) reject(err);
      else resolve(data);
    });
  });
  return Object.entries(unzipped).map(([name, data]) => {
    const type = MimeType.type(name);
    return { name, type, blob: new Blob([data.slice()], type.length > 0 ? { type } : undefined) };
  });
}

function createWorker(): Worker | null {
  if (isWorkerBroken || typeof Worker === 'undefined') return null;
  try {
    return new Worker(new URL('./zip-archive.worker', import.meta.url), { type: 'module' });
  } catch (reason) {
    isWorkerBroken = true;
    Logger.warn('[ZipArchive] ワーカーを起動できないためメインスレッドで処理します', reason);
    return null;
  }
}

function requestWorker(request: ZipWorkerRequest): Promise<ZipWorkerResponse | null> {
  const worker = createWorker();
  if (!worker) return Promise.resolve(null);

  return new Promise<ZipWorkerResponse | null>((resolve) => {
    const finish = (response: ZipWorkerResponse | null) => {
      worker.terminate();
      resolve(response);
    };
    worker.addEventListener('message', (event: MessageEvent<ZipWorkerResponse>) => {
      if (event.data.ok) {
        finish(event.data);
        return;
      }
      Logger.warn('[ZipArchive] ワーカーでの処理に失敗しました', event.data.message);
      finish(null);
    });
    worker.addEventListener('error', (event) => {
      isWorkerBroken = true;
      Logger.warn('[ZipArchive] ワーカーでの処理に失敗しました', event.message);
      finish(null);
    });
    try {
      worker.postMessage(request);
    } catch (reason) {
      isWorkerBroken = true;
      Logger.warn('[ZipArchive] ワーカーへ渡せないためメインスレッドで処理します', reason);
      finish(null);
    }
  });
}
