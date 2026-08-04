export const PEER_RECONNECT_BACKOFF_MS: readonly number[] = [1000, 2000, 4000, 8000, 15000];

export class PeerReconnectScheduler {
  private readonly attempts: Map<string, number> = new Map();
  private readonly timers: Map<string, ReturnType<typeof setTimeout>> = new Map();

  constructor(private readonly backoffMs: readonly number[] = PEER_RECONNECT_BACKOFF_MS) {}

  get scheduledPeerIds(): string[] {
    return [...this.timers.keys()];
  }

  attemptOf(peerId: string): number {
    return this.attempts.get(peerId) ?? 0;
  }

  isScheduled(peerId: string): boolean {
    return this.timers.has(peerId);
  }

  schedule(peerId: string, run: () => void): number | null {
    const attempt = this.attemptOf(peerId);
    if (attempt >= this.backoffMs.length) return null;
    if (this.timers.has(peerId)) return null;

    const delayMs = this.backoffMs[attempt];
    this.attempts.set(peerId, attempt + 1);
    this.timers.set(
      peerId,
      setTimeout(() => {
        this.timers.delete(peerId);
        run();
      }, delayMs)
    );
    return delayMs;
  }

  cancel(peerId: string): void {
    const timer = this.timers.get(peerId);
    if (timer != null) clearTimeout(timer);
    this.timers.delete(peerId);
  }

  reset(peerId: string): void {
    this.cancel(peerId);
    this.attempts.delete(peerId);
  }

  cancelAll(): void {
    for (const timer of this.timers.values()) clearTimeout(timer);
    this.timers.clear();
    this.attempts.clear();
  }
}
