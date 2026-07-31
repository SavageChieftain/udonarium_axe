import { BCDICE_I18N_TRANSLATIONS } from '@axe/domain/dice/bcdice/bcdice-i18n.generated';
import { I18n } from 'bcdice/lib/internal';
import Loader from 'bcdice/lib/loader/loader';

let gameSystemsPromise: Promise<unknown> | null = null;

export function loadBCDiceGameSystems(): Promise<unknown> {
  if (!gameSystemsPromise) {
    for (const translation of BCDICE_I18N_TRANSLATIONS) {
      I18n.$load_translation(JSON.stringify(translation));
    }
    gameSystemsPromise = import('bcdice/lib/bcdice/game_system');
  }
  return gameSystemsPromise;
}

export default class BCDiceLoader extends Loader {}
