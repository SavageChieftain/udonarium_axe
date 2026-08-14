import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

type Tree = Record<string, unknown>;

function flatten(value: unknown, prefix = ''): Record<string, string> {
  if (typeof value !== 'object' || value === null) return { [prefix]: String(value) };
  return Object.entries(value as Tree).reduce<Record<string, string>>((all, [key, child]) => {
    return { ...all, ...flatten(child, prefix.length > 0 ? `${prefix}.${key}` : key) };
  }, {});
}

function templatesIn(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) return templatesIn(path);
    return path.endsWith('.html') ? [path] : [];
  });
}

const KEY_IN_TEMPLATE = /'([a-zA-Z][a-zA-Z0-9_.]*)'\s*\|\s*transloco/g;

describe('translation keys', () => {
  const dictionaries = {
    ja: flatten(JSON.parse(readFileSync('src/assets/i18n/ja.json', 'utf-8'))),
    en: flatten(JSON.parse(readFileSync('src/assets/i18n/en.json', 'utf-8'))),
  };

  it('hold the same keys in Japanese and English', () => {
    expect(Object.keys(dictionaries.ja).sort()).toEqual(Object.keys(dictionaries.en).sort());
  });

  it('cover every key the screens ask for', () => {
    const missing: string[] = [];
    for (const template of templatesIn('src/app')) {
      const source = readFileSync(template, 'utf-8');
      for (const [, key] of source.matchAll(KEY_IN_TEMPLATE)) {
        if (!key.includes('.')) continue;
        for (const [language, dictionary] of Object.entries(dictionaries)) {
          if (!(key in dictionary)) missing.push(`${language}: ${key} (${template})`);
        }
      }
    }
    expect(missing).toEqual([]);
  });
});
