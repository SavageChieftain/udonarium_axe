import { Injectable } from '@angular/core';
import {
  canClaimOwnership,
  canEditDisclosure,
  canViewDisclosable,
  Disclosable,
  DisclosureViewer,
} from '@axe/domain/disclosure/disclosure';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { canRoleEdit } from '@axe/domain/peer/peer-role';

@Injectable({ providedIn: 'root' })
export class DisclosureService {
  canView(object: Disclosable & { owner?: string }): boolean {
    return canViewDisclosable(object, this.viewer(object.owner));
  }

  canEdit(object: { owner?: string }): boolean {
    return canEditDisclosure(this.viewer(object.owner));
  }

  canSetOwner(object: { owner?: string }): boolean {
    const viewer = this.viewer(object.owner);
    if (canEditDisclosure(viewer)) return true;
    return viewer.userId.length > 0 && canClaimOwnership(viewer) && canRoleEdit(PeerCursor.myRole);
  }

  private viewer(ownerUserId?: string): DisclosureViewer {
    return {
      userId: PeerCursor.myCursor?.userId ?? '',
      isGameMaster: PeerCursor.isMyselfGameMaster,
      ownerUserId,
    };
  }
}
