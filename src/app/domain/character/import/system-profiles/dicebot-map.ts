const CHARASHEET_DICEBOT: Record<string, string> = {
  coc: 'Cthulhu',
  coc7: 'Cthulhu7th',
};

export function resolveCharasheetDicebot(game: string): string {
  return CHARASHEET_DICEBOT[game.trim().toLowerCase()] ?? '';
}
