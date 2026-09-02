/** Who a line was spoken as, as far as novel mode can tell from the line itself. */
export type VnLineSpeaker = 'character' | 'player' | 'gameMaster' | 'unknown';

/**
 * What a line is, as far as novel mode's reading of a tab is concerned.
 *
 * Kept as plain facts rather than the message itself, so the rule below can be read and tested
 * without a room around it.
 */
export interface VnScriptLine {
  isSystemMessage: boolean;
  isDicebot: boolean;
  /** The line a roll was asked for on, which the result that follows belongs to. */
  isDiceCommand: boolean;
  speaker: VnLineSpeaker;
}

/**
 * Whether a line is somebody talking at the table rather than in the scene.
 *
 * Novel mode reads a tab as a script, and the same tab carries the ordinary conversation of
 * the people playing: "hang on", "back in five". Read out between the lines of a scene they
 * break it, and nobody chose them as part of it — novel mode will not even let a line be sent
 * under a player's own name.
 *
 * What the game master says as themselves stays: that is how a table is run, and it is
 * addressed to the scene. Rolls stay too, along with the line each was asked for on, so a roll
 * and its result are never parted.
 *
 * A line whose speaker cannot be made out stays as well. Old rooms and logs brought in from
 * elsewhere carry lines with nobody recorded as having said them, and a reader opening one
 * should find the story in it rather than an empty screen.
 */
export function isPlayerAside(line: VnScriptLine): boolean {
  if (line.isSystemMessage || line.isDicebot || line.isDiceCommand) return false;
  return line.speaker === 'player';
}
