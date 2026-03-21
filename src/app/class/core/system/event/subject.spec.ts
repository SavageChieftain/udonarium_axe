import { describe, it, expect } from 'vitest';
import type { Subject } from './subject';

describe('Subject interface', () => {
  it('Subject型が存在する', () => {
    const subject: Subject = {} as Subject;
    expect(subject).toBeDefined();
  });
});
