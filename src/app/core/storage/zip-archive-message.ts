export interface ZipEntry {
  name: string;
  type: string;
  blob: Blob;
}

export type ZipWorkerRequest =
  { id: number; kind: 'zip'; entries: ZipEntry[] } | { id: number; kind: 'unzip'; blob: Blob };

export type ZipWorkerResponse =
  | { id: number; kind: 'zip'; ok: true; buffer: ArrayBuffer }
  | { id: number; kind: 'unzip'; ok: true; entries: ZipEntry[] }
  | { id: number; kind: 'error'; ok: false; message: string };
