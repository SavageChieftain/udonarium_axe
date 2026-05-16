import { Network } from '@axe/core/index';
import { GameCharacter } from '@axe/domain/character/game-character';

export function allowsChat(gameCharacter: GameCharacter, myPeerId: string, ignoreNonTalk = false): boolean {
  switch (gameCharacter.location.name) {
    case 'table':
      return ignoreNonTalk || !gameCharacter.nonTalkFlag;
    case myPeerId:
      if (!ignoreNonTalk && gameCharacter.nonTalkFlag) return false;
      return true;
    case 'graveyard':
      return false;
    default:
      if (!ignoreNonTalk && gameCharacter.nonTalkFlag) return false;
      for (const conn of Network.peerContexts) {
        if (conn.isOpen && gameCharacter.location.name === conn.peerId) {
          return false;
        }
      }
      return true;
  }
}
