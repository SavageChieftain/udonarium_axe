import { GameCharacter } from '@axe/domain/character/game-character';
import { ChatMessageTargetContext } from '@axe/domain/chat/chat-message';
import {
  evaluateCharacterReferences,
  PaletteEvaluationResult,
  textTargetsCharacter,
} from '@axe/domain/chat/chat-palette';
import { DiceBot } from '@axe/domain/dice/dice-bot';

export interface MacroMessage {
  text: string;
  targetContexts: ChatMessageTargetContext[];
  attachmentImageIdentifiers: string[];
}

/**
 * What one macro line becomes once the references in it are filled in.
 *
 * A line aimed at the pieces marked on the table is worked out once for each of them, and
 * from the second onwards the commands that would act on the speaker are taken out, or the
 * speaker would take the same damage once per target.
 */
export function buildMacroMessage(
  character: GameCharacter,
  line: string,
  targets: readonly GameCharacter[],
  noTargetText: string
): MacroMessage {
  const palette = character.chatPalette;
  const attachmentImageIdentifiers: string[] = [];
  const targetContexts: ChatMessageTargetContext[] = [];

  const collect = (identifiers: readonly string[]) => {
    for (const identifier of identifiers) {
      if (!attachmentImageIdentifiers.includes(identifier)) attachmentImageIdentifiers.push(identifier);
    }
  };
  const evaluate = (text: string, target?: GameCharacter): PaletteEvaluationResult =>
    palette
      ? palette.evaluateWithAttachments(text, character.rootDataElement ?? undefined, target)
      : evaluateCharacterReferences(text, character, target);

  if (!textTargetsCharacter(line)) {
    const evaluated = evaluate(line);
    collect(evaluated.attachmentImageIdentifiers);
    targetContexts.push({ text: evaluated.text, object: null });
    return { text: evaluated.text, targetContexts, attachmentImageIdentifiers };
  }

  if (targets.length < 1) return { text: noTargetText, targetContexts, attachmentImageIdentifiers };

  let text = '';
  let first = true;
  for (const target of targets) {
    const source = first ? line : DiceBot.deleteMyselfResourceBuff(line);
    const evaluated = evaluate(source, target);
    collect(evaluated.attachmentImageIdentifiers);
    text += first ? '' : '\n';
    text += evaluated.text + ' [' + target.name + ']';
    targetContexts.push({ text: evaluated.text, object: target });
    first = false;
  }
  return { text, targetContexts, attachmentImageIdentifiers };
}
