/**
 * Wait until `condition` holds instead of sleeping for a fixed span.
 *
 * Change notifications are batched, so a spec has to let the queue drain before
 * it can assert. A fixed `setTimeout` both wastes the wait when the batch has
 * already flushed and gives the spec no margin when the machine is busy enough
 * to stretch it — the pre-commit hook runs the lint and the suite side by side.
 *
 * Throws with the caller's description so a genuine regression still reads as a
 * failed expectation rather than a bare timeout.
 */
export async function waitFor(
  condition: () => boolean,
  { timeout = 5000, description = 'condition' }: { timeout?: number; description?: string } = {}
): Promise<void> {
  const started = Date.now();
  while (!condition()) {
    if (Date.now() - started >= timeout) {
      throw new Error(`waitFor: ${description} was still false after ${timeout}ms`);
    }
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}
