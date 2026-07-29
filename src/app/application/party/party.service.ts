import { computed, inject, Injectable } from '@angular/core';
import { ObjectChangeService } from '@axe/application/sync/object-change.service';
import { ObjectStore } from '@axe/core/sync/object-store';
import { GameCharacter } from '@axe/domain/character/game-character';
import { nextPartyColor, Party } from '@axe/domain/party/party';
import { membersOfParty, membersWithoutParty } from '@axe/domain/party/party-membership';

@Injectable({ providedIn: 'root' })
export class PartyService {
  private readonly objectStore = inject(ObjectStore);
  private readonly objectChange = inject(ObjectChangeService);

  readonly parties = computed<Party[]>(() => {
    this.objectChange.collectionOf(Party.aliasName)();
    const parties = this.objectStore.getObjects<Party>(Party);
    for (const party of parties) this.objectChange.versionOf(party.identifier)();
    return parties;
  });

  readonly characters = computed<GameCharacter[]>(() => {
    this.objectChange.collectionOf(GameCharacter.aliasName)();
    const characters = this.objectStore.getObjects<GameCharacter>(GameCharacter);
    for (const character of characters) this.objectChange.versionOf(character.identifier)();
    return characters;
  });

  readonly unassigned = computed<GameCharacter[]>(() =>
    membersWithoutParty(
      this.characters(),
      this.parties().map((party) => party.identifier)
    )
  );

  membersOf(partyIdentifier: string): GameCharacter[] {
    return membersOfParty(this.characters(), partyIdentifier);
  }

  create(name: string): Party {
    const party = new Party();
    party.name = name;
    party.color = nextPartyColor(this.parties().map((existing) => existing.color));
    party.initialize();
    return party;
  }

  rename(party: Party, name: string): void {
    party.name = name;
    this.objectChange.notifyChanged(party.identifier);
  }

  recolor(party: Party, color: string): void {
    party.color = color;
    this.objectChange.notifyChanged(party.identifier);
  }

  remove(party: Party): void {
    for (const character of this.membersOf(party.identifier)) this.assign(character, '');
    party.destroy();
  }

  assign(character: GameCharacter, partyIdentifier: string): void {
    if (character.partyIdentifier === partyIdentifier) return;
    character.partyIdentifier = partyIdentifier;
    this.objectChange.notifyChanged(character.identifier);
  }
}
