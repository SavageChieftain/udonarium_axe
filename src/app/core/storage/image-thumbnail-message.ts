export interface ThumbnailWorkerRequest {
  id: number;
  blob: Blob;
  type: string;
  maxDimension: number;
}

export type ThumbnailWorkerResponse = { id: number; ok: true; blob: Blob } | { id: number; ok: false; message: string };
