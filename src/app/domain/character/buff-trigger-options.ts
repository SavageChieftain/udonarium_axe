export interface BuffTriggerCandidate {
  identifier: string;
  name: string;
}

export interface BuffTriggerOption {
  value: string;
  label: string;
}

/**
 * Who a buff can be pinned to. The value is the identifier, which survives a rename; a
 * trigger set from a chat command holds a name instead, so one that matches nobody on the
 * table is kept as an option of its own rather than dropped on the next edit.
 */
export function buffTriggerOptions(
  candidates: readonly BuffTriggerCandidate[],
  current: string,
  unknownLabel: (name: string) => string
): BuffTriggerOption[] {
  const options: BuffTriggerOption[] = [];
  const seen = new Set<string>();
  for (const candidate of candidates) {
    if (candidate.identifier.length < 1 || seen.has(candidate.identifier)) continue;
    seen.add(candidate.identifier);
    options.push({ value: candidate.identifier, label: candidate.name });
  }

  const trigger = (current ?? '').trim();
  if (trigger.length > 0 && !candidates.some((c) => c.identifier === trigger || c.name === trigger)) {
    options.unshift({ value: trigger, label: unknownLabel(trigger) });
  }
  return options;
}

/** The identifier a stored trigger picks out, so a name written by a command still selects. */
export function selectedTriggerValue(candidates: readonly BuffTriggerCandidate[], current: string): string {
  const trigger = (current ?? '').trim();
  if (trigger.length < 1) return '';
  const byName = candidates.find((candidate) => candidate.name === trigger);
  return byName ? byName.identifier : trigger;
}
