import { DestroyRef, inject, Injectable } from '@angular/core';
import { ObjectChangeService } from '@axe/application/sync/object-change.service';
import { AudioStorage } from '@axe/core/storage/audio-storage';
import { ObjectStore } from '@axe/core/sync/object-store';
import { ChatMessage } from '@axe/domain/chat/chat-message';
import { CutIn } from '@axe/domain/media/cut-in';
import { CutInLauncher } from '@axe/domain/media/cut-in-launcher';
import { Jukebox } from '@axe/domain/media/jukebox';
import { parseCutInIdentifiers, pickCutInIdentifier, rollCutIn } from '@axe/domain/media/table-cut-in';
import { GameTable } from '@axe/domain/tabletop/game-table';

const CHAT_TAIL_PATTERN = /\s(@?)(\S+)$/i;

@Injectable({ providedIn: 'root' })
export class CutInService {
  private readonly destroyRef = inject(DestroyRef);
  private readonly objectChange = inject(ObjectChangeService);
  private readonly objectStore = inject(ObjectStore);
  private readonly audioStorage = inject(AudioStorage);

  constructor() {
    this.objectChange.messageAdded$.subscribe((event) => {
      const message = this.objectStore.get<ChatMessage>(event.messageIdentifier);
      if (!message || message.tags.includes('secret')) return;
      this.activateFromChatText(message.text, message.to ?? '');
    }, this.destroyRef);
  }

  activateFromChatText(text: string, sendTo: string): void {
    const matches = ` ${text}`.match(CHAT_TAIL_PATTERN);
    if (!matches) return;

    const isSoundOnly = matches[1] === '@';
    const activateName = matches[2];

    const launcher = this.objectStore.get<CutInLauncher>('CutInLauncher');
    if (!launcher) return;

    const target = this.objectStore.getObjects(CutIn).find((c) => c.chatActivate && c.name === activateName);
    if (!target) return;

    if (isSoundOnly) {
      launcher.startSoundOnlyCutIn(target, sendTo);
    } else {
      this.launch(target, sendTo);
    }
  }

  /**
   * Plays what the table asks for on being chosen, drawing one when it names several.
   *
   * The draw happens here, on the machine that changed the table, and reaches everyone
   * else as the launcher's own update — so the whole room sees the same cut-in.
   */
  launchForTable(table: GameTable, roll: (count: number) => number = rollCutIn): boolean {
    const identifiers = parseCutInIdentifiers(table.cutInIdentifiers);
    const picked = pickCutInIdentifier(identifiers, (id) => this.objectStore.get<CutIn>(id) != null, roll);
    if (!picked) return false;

    const cutIn = this.objectStore.get<CutIn>(picked);
    return cutIn ? this.launch(cutIn) : false;
  }

  /** Plays a cut-in for everyone, handling the music the same way a chat-started one does. */
  launch(cutIn: CutIn, sendTo = ''): boolean {
    const launcher = this.objectStore.get<CutInLauncher>('CutInLauncher');
    if (!launcher) return false;

    if (this.isCutInBgmUploaded(cutIn.audioIdentifier) && cutIn.tagName === '') {
      this.objectStore.get<Jukebox>('Jukebox')?.stop();
    }
    launcher.startCutIn(cutIn, sendTo);
    return true;
  }

  private isCutInBgmUploaded(audioIdentifier: string): boolean {
    return this.audioStorage.get(audioIdentifier) !== null;
  }
}
