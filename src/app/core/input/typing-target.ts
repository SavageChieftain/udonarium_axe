/**
 * Whether a keystroke is going into text.
 *
 * The screen keys — stepping, switching, grabbing with space — stay out of the way while text is being typed.
 * Copying the test around means a new input field leaves some screens still stealing keys.
 */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tagName = target.tagName.toLowerCase();
  return tagName === 'input' || tagName === 'textarea' || tagName === 'select';
}
