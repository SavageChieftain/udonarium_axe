import { clearIdentity, loadIdentity, PersistedIdentity, saveIdentity } from '@axe/core/storage/identity-storage';

const sample: PersistedIdentity = {
  userId: '550e8400-e29b-41d4-a716-446655440000',
  roomId: 'ab1',
  roomName: 'Room',
  role: 'gm',
  reConnectPass: 'secret',
};

describe('identity-storage', () => {
  afterEach(() => clearIdentity());

  it('round-trips a persisted identity', () => {
    saveIdentity(sample);
    expect(loadIdentity()).toEqual(sample);
  });

  it('returns null when nothing is stored', () => {
    clearIdentity();
    expect(loadIdentity()).toBeNull();
  });

  it('returns null for an entry without a userId', () => {
    sessionStorage.setItem('udonarium-axe.identity', JSON.stringify({ roomId: 'ab1' }));
    expect(loadIdentity()).toBeNull();
  });

  it('fills missing optional fields with empty strings', () => {
    sessionStorage.setItem('udonarium-axe.identity', JSON.stringify({ userId: 'u1' }));
    expect(loadIdentity()).toEqual({ userId: 'u1', roomId: '', roomName: '', role: '', reConnectPass: '' });
  });

  it('returns null for corrupt JSON', () => {
    sessionStorage.setItem('udonarium-axe.identity', '{not json');
    expect(loadIdentity()).toBeNull();
  });
});
