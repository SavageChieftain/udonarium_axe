export interface ZipEntry {
  name: string;
  type: string;
  blob: Blob;
}

export type ZipWorkerRequest = { kind: 'zip'; entries: ZipEntry[] } | { kind: 'unzip'; blob: Blob };

export type ZipWorkerResponse =
  | { kind: 'zip'; ok: true; buffer: ArrayBuffer }
  | { kind: 'unzip'; ok: true; entries: ZipEntry[] }
  | { kind: 'error'; ok: false; message: string };
