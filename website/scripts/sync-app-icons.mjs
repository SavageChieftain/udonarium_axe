import { copyFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const appDir = resolve(here, '../../src');
const publicDir = resolve(here, '../public');

const assets = [
  ['favicon.svg', 'favicon.svg'],
  ['assets/icons/icon-180.png', 'icon-180.png'],
];

await mkdir(publicDir, { recursive: true });
await Promise.all(assets.map(([from, to]) => copyFile(resolve(appDir, from), resolve(publicDir, to))));
