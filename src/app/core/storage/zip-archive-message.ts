export interface ZipWorkerEntry {
  name: string;
  type: string;
  blob: Blob;
}

export interface ZipWorkerRequest {
  entries: ZipWorkerEntry[];
}

export type ZipWorkerResponse = { ok: true; buffer: ArrayBuffer } | { ok: false; message: string };
