#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const staged = process.argv.slice(2);
const sources = new Set();
for (const file of staged) {
  if (!file.startsWith('src/')) continue;
  if (file.endsWith('.ts')) {
    sources.add(file);
    continue;
  }
  if (file.endsWith('.html') || file.endsWith('.css')) {
    const sibling = file.replace(/\.(html|css)$/, '.ts');
    if (existsSync(sibling)) sources.add(sibling);
  }
}
if (sources.size === 0) {
  console.log('[vitest-related] no staged sources touch a spec; nothing to run');
  process.exit(0);
}

const result = spawnSync('npx', ['vitest', 'related', '--run', ...sources], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
});
process.exit(result.status ?? 1);
