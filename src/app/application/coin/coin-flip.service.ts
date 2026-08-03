import { inject, Injectable } from '@angular/core';
import { ChatMessageService } from '@axe/application/chat/chat-message.service';
import { TRANSLATE_FN } from '@axe/application/i18n/translate.token';
import { callFlipCoin } from '@axe/core/event/domain-events';
import { Coin, CoinFace } from '@axe/domain/coin/coin';
import { PresetSound, SoundEffect } from '@axe/domain/media/sound-effect';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';

@Injectable({ providedIn: 'root' })
export class CoinFlipService {
  private readonly chatMessageService = inject(ChatMessageService);
  private readonly t = inject(TRANSLATE_FN);

  flip(coin: Coin): CoinFace {
    callFlipCoin(coin.identifier);
    SoundEffect.play(PresetSound.diceRoll1);

    const face = coin.flip();
    coin.toTopmost();
    this.chatMessageService.sendSystemMessage(
      this.t('feature.coin.message.flipped', {
        who: PeerCursor.myCursor?.name ?? '',
        name: coin.name,
        face: this.faceLabel(face),
      })
    );
    return face;
  }

  faceLabel(face: CoinFace): string {
    return this.t(face === 'front' ? 'feature.coin.face.front' : 'feature.coin.face.back');
  }
}
