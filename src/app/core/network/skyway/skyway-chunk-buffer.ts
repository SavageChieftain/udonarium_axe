export interface DataChank {
  id: string;
  data: Uint8Array;
  index: number;
  total: number;
}

interface ReceivedChank {
  id: string;
  chanks: Uint8Array[];
  length: number;
  byteLength: number;
  createdAt: number;
}

const CHUNK_TTL_MS = 30000;

export class ChunkBuffer {
  private receivedMap: Map<string, ReceivedChank> = new Map();

  /**
   * Add a chunk. Returns the fully assembled Uint8Array when all chunks have
   * arrived, or null if the message is still incomplete.
   */
  add(chank: DataChank): Uint8Array | null {
    let received = this.receivedMap.get(chank.id);
    if (received == null) {
      this.evictStale();
      received = {
        id: chank.id,
        chanks: new Array(chank.total),
        length: 0,
        byteLength: 0,
        createdAt: performance.now(),
      };
      this.receivedMap.set(chank.id, received);
    }

    if (received.chanks[chank.index] != null) return null;

    received.length++;
    received.byteLength += chank.data.byteLength;
    received.chanks[chank.index] = chank.data;

    if (received.length < chank.total) return null;
    this.receivedMap.delete(chank.id);

    const uint8Array = new Uint8Array(received.byteLength);
    let pos = 0;
    for (const c of received.chanks) {
      uint8Array.set(c, pos);
      pos += c.byteLength;
    }
    return uint8Array;
  }

  clear(): void {
    this.receivedMap.clear();
  }

  private evictStale(): void {
    const now = performance.now();
    for (const [id, received] of this.receivedMap) {
      if (now - received.createdAt > CHUNK_TTL_MS) {
        this.receivedMap.delete(id);
      }
    }
  }
}
