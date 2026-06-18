const CHARASHEET_DICEBOT: Record<string, string> = {
  coc: 'Cthulhu',
  coc7: 'Cthulhu7th',
};

const APPSPOT_DICEBOT: Record<string, string> = {
  dx3: 'DoubleCross',
  shinobigami: 'ShinobiGami',
  insane: 'Insane',
  mglg: 'MagicaLogia',
  kancolle: 'KanColle',
  stellar: 'StellarKnights',
};

export function resolveCharasheetDicebot(game: string): string {
  return CHARASHEET_DICEBOT[game.trim().toLowerCase()] ?? '';
}

export function resolveAppspotDicebot(system: string): string {
  return APPSPOT_DICEBOT[system.trim().toLowerCase()] ?? '';
}
