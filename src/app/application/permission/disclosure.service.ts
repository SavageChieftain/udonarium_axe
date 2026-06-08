import { Injectable } from '@angular/core';
import {
  canEditDisclosure,
  canViewDisclosable,
  Disclosable,
  DisclosureViewer,
} from '@axe/domain/disclosure/disclosure';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';

@Injectable({ providedIn: 'root' })
export class DisclosureService {
  canView(object: Disclosable & { owner?: string }): boolean {
    return canViewDisclosable(object, this.viewer(object.owner));
  }

  canEdit(object: { owner?: string }): boolean {
    return canEditDisclosure(this.viewer(object.owner));
  }

  private viewer(ownerUserId?: string): DisclosureViewer {
    return {
      userId: PeerCursor.myCursor?.userId ?? '',
      isGameMaster: PeerCursor.isMyselfGameMaster,
      ownerUserId,
    };
  }
}
