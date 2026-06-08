import { RolePermissionService } from '@axe/application/permission/role-permission.service';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { PeerRole } from '@axe/domain/peer/peer-role';

function setMyRole(role: PeerRole | null) {
  PeerCursor.myCursor = (role == null ? null : ({ role, isGameMaster: role === PeerRole.GameMaster } as PeerCursor))!;
}

describe('RolePermissionService', () => {
  const service = new RolePermissionService();
  const original = PeerCursor.myCursor;

  afterEach(() => {
    PeerCursor.myCursor = original;
  });

  it('treats a missing cursor as the default player role', () => {
    setMyRole(null);
    expect(service.myRole).toBe(PeerRole.Player);
    expect(service.canEditTabletop).toBe(true);
    expect(service.canSeeHidden).toBe(false);
  });

  it('lets the game master edit and see hidden info', () => {
    setMyRole(PeerRole.GameMaster);
    expect(service.canEditTabletop).toBe(true);
    expect(service.canSeeHidden).toBe(true);
  });

  it('lets a player edit but not see hidden info', () => {
    setMyRole(PeerRole.Player);
    expect(service.canEditTabletop).toBe(true);
    expect(service.canSeeHidden).toBe(false);
  });

  it('blocks a guest from editing and seeing hidden info', () => {
    setMyRole(PeerRole.Guest);
    expect(service.canEditTabletop).toBe(false);
    expect(service.canSeeHidden).toBe(false);
  });
});
