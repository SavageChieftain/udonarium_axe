export interface EmbeddedRollSite {
  command: string;
  start: number;
  end: number;
}

/**
 * `[...]` marks a run of a resource edit that only stands on its own — a system command such as
 * Sword World's `k10`, which bcdice answers alone but cannot take as a term of the arithmetic
 * around it. Nested brackets belong to the command, so only the outermost pair opens a site.
 */
export function findEmbeddedRolls(expression: string): EmbeddedRollSite[] {
  const sites: EmbeddedRollSite[] = [];
  let depth = 0;
  let start = -1;

  for (let index = 0; index < expression.length; index++) {
    const char = expression[index];
    if (char === '[') {
      if (depth === 0) start = index;
      depth++;
      continue;
    }
    if (char !== ']' || depth === 0) continue;
    depth--;
    if (depth > 0) continue;
    const command = expression.slice(start + 1, index);
    if (command.length > 0) sites.push({ command, start, end: index + 1 });
  }

  return sites;
}

/** Puts each answer back where its command stood, in parentheses when it is negative. */
export function replaceEmbeddedRolls(expression: string, answers: readonly number[]): string {
  const sites = findEmbeddedRolls(expression);
  let replaced = '';
  let cursor = 0;

  sites.forEach((site, index) => {
    const answer = answers[index];
    if (answer == null) return;
    replaced += expression.slice(cursor, site.start) + (answer < 0 ? `(${answer})` : `${answer}`);
    cursor = site.end;
  });

  return replaced + expression.slice(cursor);
}
