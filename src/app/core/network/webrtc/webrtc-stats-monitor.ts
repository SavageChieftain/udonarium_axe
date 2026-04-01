import { ResettableTimeout } from '@axe/core/util/resettable-timeout';

export interface WebRTCConnection {
  open: boolean;
  updateStatsAsync(): Promise<void>;
}

export class WebRTCStatsMonitor {
  private static updateWebRTCStatsTimer: ResettableTimeout | null = null;
  private static monitoringConnections: Set<WebRTCConnection> = new Set();

  private constructor() {}

  static add(connection: WebRTCConnection) {
    this.monitoringConnections.add(connection);
    connection.updateStatsAsync();
    this.restart();
  }

  static remove(connection: WebRTCConnection) {
    this.monitoringConnections.delete(connection);
  }

  private static restart() {
    const intervalMs = Math.min(2000 + 1000 * this.monitoringConnections.size, 8000);
    if (this.updateWebRTCStatsTimer === null) {
      this.updateWebRTCStatsTimer = new ResettableTimeout(() => this.doMonitoringAsync(), intervalMs);
    } else if (!this.updateWebRTCStatsTimer.isActive) {
      this.updateWebRTCStatsTimer.reset(intervalMs);
    }
  }

  private static async doMonitoringAsync() {
    const toRemove: WebRTCConnection[] = [];
    for (const connection of this.monitoringConnections) {
      if (connection.open) {
        await connection.updateStatsAsync();
      } else {
        toRemove.push(connection);
      }
    }
    for (const connection of toRemove) {
      this.remove(connection);
    }
    if (this.monitoringConnections.size === 0) {
      this.updateWebRTCStatsTimer = null;
      return;
    }
    this.restart();
  }
}
