/**
 * Lends a name on the global object to a test and takes it back afterwards.
 *
 * Specs share one global object and one set of prototypes for the whole worker, so a stand-in
 * left behind is inherited by every spec that runs after it in that worker. Which specs those
 * are depends on how the files were shared out, so the damage lands somewhere else entirely
 * and only sometimes — the shape a suite takes when it is called flaky.
 *
 * Deleting a name afterwards is not the same as giving it back: a name the environment
 * provided is gone for good, and the next spec sees a browser that never had it.
 */
export class BorrowedGlobals {
  private readonly held = new Map<object, Map<string, { was: unknown; owned: boolean }>>();

  /** Puts a stand-in on the global object, remembering whatever was there. */
  lend(name: string, standIn: unknown): void {
    this.lendOn(globalThis as unknown as Record<string, unknown>, name, standIn);
  }

  /** Puts a stand-in on any object — a prototype, most often — remembering what was there. */
  lendOn(target: object, name: string, standIn: unknown): void {
    const holder = target as Record<string, unknown>;
    let names = this.held.get(target);
    if (!names) {
      names = new Map();
      this.held.set(target, names);
    }
    if (!names.has(name)) names.set(name, { was: holder[name], owned: name in holder });
    holder[name] = standIn;
  }

  /** Gives everything back, in one call, however many were borrowed. */
  giveBack(): void {
    for (const [target, names] of this.held) {
      const holder = target as Record<string, unknown>;
      for (const [name, { was, owned }] of names) {
        if (owned) holder[name] = was;
        else delete holder[name];
      }
    }
    this.held.clear();
  }
}
