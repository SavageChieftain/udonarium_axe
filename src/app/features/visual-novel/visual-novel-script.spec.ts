import { isPlayerAside, VnScriptLine } from '@axe/features/visual-novel/visual-novel-script';

function line(overrides: Partial<VnScriptLine> = {}): VnScriptLine {
  return {
    isSystemMessage: false,
    isDicebot: false,
    isDiceCommand: false,
    speaker: 'character',
    ...overrides,
  };
}

describe('isPlayerAside()', () => {
  it('passes over what somebody says as themselves', () => {
    expect(isPlayerAside(line({ speaker: 'player' }))).toBe(true);
  });

  it('reads what is said as a character', () => {
    expect(isPlayerAside(line({ speaker: 'character' }))).toBe(false);
  });

  it('reads what the game master says as themselves', () => {
    expect(isPlayerAside(line({ speaker: 'gameMaster' }))).toBe(false);
  });

  it('reads a line whose speaker cannot be made out', () => {
    // An old room, or a log brought in from elsewhere, records nobody on its lines.
    expect(isPlayerAside(line({ speaker: 'unknown' }))).toBe(false);
  });

  it('reads what the room says of itself', () => {
    expect(isPlayerAside(line({ speaker: 'player', isSystemMessage: true }))).toBe(false);
  });

  it('keeps a roll and the line it was asked for on together', () => {
    expect(isPlayerAside(line({ speaker: 'player', isDiceCommand: true }))).toBe(false);
    expect(isPlayerAside(line({ speaker: 'player', isDicebot: true }))).toBe(false);
  });
});
