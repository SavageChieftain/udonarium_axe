import { computed, inject, Injectable } from '@angular/core';
import { ImageService } from '@axe/application/storage/image.service';
import { ObjectChangeService } from '@axe/application/sync/object-change.service';
import { ModalService } from '@axe/application/ui/modal.service';
import { ObjectStore } from '@axe/core/sync/object-store';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { VnStage, VnStageTransition } from '@axe/domain/visual-novel/vn-stage';
import { FileSelecterComponent } from '@axe/ui/components/file-selecter/file-selecter.component';

const STAGE_IDENTIFIER = 'VnStage';

@Injectable({ providedIn: 'root' })
export class VisualNovelSceneService {
  private readonly objectStore = inject(ObjectStore);
  private readonly objectChange = inject(ObjectChangeService);
  private readonly imageService = inject(ImageService);
  private readonly modalService = inject(ModalService);

  private get stage(): VnStage | null {
    return this.objectStore.get<VnStage>(STAGE_IDENTIFIER) ?? null;
  }

  readonly backgroundUrl = computed(() => {
    this.objectChange.versionOf(STAGE_IDENTIFIER)();
    this.objectChange.fileVersion();
    const identifier = this.stage?.backgroundImageIdentifier ?? '';
    if (identifier.length < 1) return '';
    return this.imageService.getEmptyOr(identifier).url;
  });

  readonly hasBackground = computed(() => this.backgroundUrl().length > 0);

  readonly transition = computed<VnStageTransition>(() => {
    this.objectChange.versionOf(STAGE_IDENTIFIER)();
    return this.stage?.transition ?? 'fade';
  });

  readonly transitionTrigger = computed(() => {
    this.objectChange.versionOf(STAGE_IDENTIFIER)();
    return this.stage?.transitionTrigger ?? 0;
  });

  readonly canDirect = computed(() => {
    if (PeerCursor.myCursor) this.objectChange.versionOf(PeerCursor.myCursor.identifier)();
    return PeerCursor.isMyselfGameMaster;
  });

  pickBackground(): void {
    if (!this.canDirect()) return;
    this.modalService.open<string>(FileSelecterComponent, { isAllowedEmpty: true }).then((identifier) => {
      const stage = this.stage;
      if (!stage || typeof identifier !== 'string') return;
      stage.setBackground(identifier);
    });
  }

  clearBackground(): void {
    if (!this.canDirect()) return;
    this.stage?.clearBackground();
  }

  setTransition(transition: VnStageTransition): void {
    if (!this.canDirect()) return;
    const stage = this.stage;
    if (!stage) return;
    stage.transition = transition;
    stage.update();
  }

  playTransition(): void {
    if (!this.canDirect()) return;
    this.stage?.playTransition();
  }
}
