import {
  membersOfParty,
  membersWithoutParty,
  partyIdsOwnedBy,
  PartyMemberLike,
} from '@axe/domain/party/party-membership';
import { describe, expect, it } from 'vitest';

function member(owner: string, partyIdentifier: string): PartyMemberLike {
  return { owner, partyIdentifier };
}

describe('partyIdsOwnedBy', () => {
  it('所有キャラの所属パーティを重複なく返す', () => {
    const members = [member('u1', 'p1'), member('u1', 'p1'), member('u1', 'p2'), member('u2', 'p3')];

    expect(partyIdsOwnedBy(members, 'u1')).toEqual(['p1', 'p2']);
  });

  it('未所属や他人のキャラは含めない', () => {
    const members = [member('u1', ''), member('u2', 'p1')];

    expect(partyIdsOwnedBy(members, 'u1')).toEqual([]);
  });

  it('ユーザ ID が空なら空を返す', () => {
    expect(partyIdsOwnedBy([member('', 'p1')], '')).toEqual([]);
  });
});

describe('membersOfParty', () => {
  it('指定パーティの所属だけ返す', () => {
    const members = [member('u1', 'p1'), member('u2', 'p2'), member('u3', 'p1')];

    expect(membersOfParty(members, 'p1')).toEqual([member('u1', 'p1'), member('u3', 'p1')]);
  });

  it('パーティ ID が空なら空を返す', () => {
    expect(membersOfParty([member('u1', '')], '')).toEqual([]);
  });
});

describe('membersWithoutParty', () => {
  it('未所属と、消えたパーティを指しているものを返す', () => {
    const orphan = member('u3', 'gone');
    const members = [member('u1', 'p1'), member('u2', ''), orphan];

    expect(membersWithoutParty(members, ['p1'])).toEqual([member('u2', ''), orphan]);
  });
});
