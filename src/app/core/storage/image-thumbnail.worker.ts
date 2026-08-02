import type { ThumbnailWorkerRequest, ThumbnailWorkerResponse } from '@axe/core/storage/image-thumbnail-message';

interface WorkerScope {
  addEventListener(type: 'message', listener: (event: MessageEvent<ThumbnailWorkerRequest>) => void): void;
  postMessage(message: ThumbnailWorkerResponse): void;
}

const scope = self as unknown as WorkerScope;

scope.addEventListener('message', (event) => {
  void run(event.data);
});

async function run(request: ThumbnailWorkerRequest): Promise<void> {
  try {
    const bitmap = await createImageBitmap(request.blob);
    const scale = Math.min(request.maxDimension / Math.max(bitmap.width, bitmap.height), 1);
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = new OffscreenCanvas(width, height);
    const context = canvas.getContext('2d');
    if (!context) throw new Error('2d context is unavailable');
    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await canvas.convertToBlob({ type: request.type });
    scope.postMessage({ id: request.id, ok: true, blob });
  } catch (reason) {
    scope.postMessage({
      id: request.id,
      ok: false,
      message: reason instanceof Error ? reason.message : String(reason),
    });
  }
}
