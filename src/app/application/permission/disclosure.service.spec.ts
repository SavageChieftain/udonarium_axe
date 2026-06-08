import { DisclosureService } from '@axe/application/permission/disclosure.service';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { PeerRole } from '@axe/domain/peer/peer-role';

function setMe(userId: string, role: PeerRole) {
  PeerCursor.myCursor = { userId, role, isGameMaster: role === PeerRole.GameMaster } as PeerCursor;
}

describe('DisclosureService', () => {
  const service = new DisclosureService();
  const original = PeerCursor.myCursor;

  afterEach(() => {
    PeerCursor.myCursor = original;
  });

  it('lets the GM view and edit anything', () => {
    setMe('gm', PeerRole.GameMaster);
    expect(service.canView({ disclosureMode: 'gm', disclosureUserIds: [] })).toBe(true);
    expect(service.canEdit({})).toBe(true);
  });

  it('hides gm-only objects from players but shows public ones', () => {
    setMe('p1', PeerRole.Player);
    expect(service.canView({ disclosureMode: 'gm', disclosureUserIds: [] })).toBe(false);
    expect(service.canView({ disclosureMode: '', disclosureUserIds: [] })).toBe(true);
    expect(service.canView({ disclosureMode: 'selected', disclosureUserIds: ['p1'] })).toBe(true);
    expect(service.canView({ disclosureMode: 'selected', disclosureUserIds: ['p2'] })).toBe(false);
  });

  it('lets the owner view and edit their own object', () => {
    setMe('p1', PeerRole.Player);
    expect(service.canView({ disclosureMode: 'gm', disclosureUserIds: [], owner: 'p1' })).toBe(true);
    expect(service.canEdit({ owner: 'p1' })).toBe(true);
    expect(service.canEdit({ owner: 'p2' })).toBe(false);
    expect(service.canEdit({})).toBe(false);
  });
});
