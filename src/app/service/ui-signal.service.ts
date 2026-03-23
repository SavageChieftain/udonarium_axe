import { Injectable, signal } from '@angular/core';

export interface TargetChangeData {
  identifier: string;
  className: string;
}

export interface NoteResizeData {
  identifier: string;
  timestamp: number;
}

export interface JumpIndexData {
  targetId: string;
  lineNo: number;
  timestamp: number;
}

export interface TableViewRotation {
  x: number;
  y: number;
  z: number;
}

@Injectable({
  providedIn: 'root',
})
export class UiSignalService {
  readonly chatRedrawVersion = signal(0);
  readonly terrainGridShowVersion = signal(0);
  readonly terrainGridEndVersion = signal(0);
  readonly targetChange = signal<TargetChangeData | null>(null);
  readonly noteResizeRequest = signal<NoteResizeData | null>(null);
  readonly jumpIndexRequest = signal<JumpIndexData | null>(null);
  readonly tableViewRotation = signal<TableViewRotation | null>(null);

  notifyChatRedraw(): void {
    this.chatRedrawVersion.update((v) => v + 1);
  }

  notifyTerrainGridShow(): void {
    this.terrainGridShowVersion.update((v) => v + 1);
  }

  notifyTerrainGridEnd(): void {
    this.terrainGridEndVersion.update((v) => v + 1);
  }

  notifyTargetChange(identifier: string, className: string): void {
    this.targetChange.set({ identifier, className });
  }

  requestNoteResize(identifier: string): void {
    this.noteResizeRequest.set({ identifier, timestamp: Date.now() });
  }

  requestJumpIndex(targetId: string, lineNo: number): void {
    this.jumpIndexRequest.set({ targetId, lineNo, timestamp: Date.now() });
  }

  notifyTableViewRotation(x: number, y: number, z: number): void {
    this.tableViewRotation.set({ x, y, z });
  }
}
