const CHARASHEET_DICEBOT: Record<string, string> = {
  coc: 'Cthulhu',
  coc7: 'Cthulhu7th',
  ara2: 'Arianrhod',
  dx3: 'DoubleCross',
  gracre: 'GranCrest',
  gorder: 'GardenOrder',
  swordworld2: 'SwordWorld2.0',
  swordworld: 'SwordWorld',
  nechro: 'Nechronica',
  ryutama: 'Ryutama',
};

const APPSPOT_DICEBOT: Record<string, string> = {
  dx3: 'DoubleCross',
  shinobigami: 'ShinobiGami',
  insane: 'Insane',
  helltv: 'KillDeathBusiness',
  hm: 'HuntersMoon',
  blcr: 'BloodCrusade',
  bloodmoon: 'BloodMoon',
  stratoshout: 'StratoShout',
  cardranker: 'CardRanker',
  ddd: 'DarkDaysDrive',
  yy: 'YankeeYogSothoth',
  mglg: 'MagicaLogia',
  kancolle: 'KanColle',
  stellar: 'StellarKnights',
  bbt: 'BeastBindTrinity',
  starrydolls: 'StarryDolls',
};

export function resolveCharasheetDicebot(game: string): string {
  return CHARASHEET_DICEBOT[game.trim().toLowerCase()] ?? '';
}

export function resolveAppspotDicebot(system: string): string {
  return APPSPOT_DICEBOT[system.trim().toLowerCase()] ?? '';
}
