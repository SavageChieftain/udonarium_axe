export interface PartyMemberLike {
  owner: string;
  partyIdentifier: string;
}

export function partyIdsOwnedBy(members: readonly PartyMemberLike[], userId: string): string[] {
  if (!userId) return [];
  const ids = new Set<string>();
  for (const member of members) {
    if (member.owner !== userId) continue;
    if (member.partyIdentifier) ids.add(member.partyIdentifier);
  }
  return [...ids];
}

export function membersOfParty<T extends PartyMemberLike>(members: readonly T[], partyIdentifier: string): T[] {
  if (!partyIdentifier) return [];
  return members.filter((member) => member.partyIdentifier === partyIdentifier);
}

export function membersWithoutParty<T extends PartyMemberLike>(
  members: readonly T[],
  knownPartyIdentifiers: readonly string[]
): T[] {
  const known = new Set(knownPartyIdentifiers);
  return members.filter((member) => !member.partyIdentifier || !known.has(member.partyIdentifier));
}
