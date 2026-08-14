import { characterNameFromFileName } from '@axe/features/tabletop/image-drop/dropped-image-name';

describe('characterNameFromFileName', () => {
  it('drops the extension', () => {
    expect(characterNameFromFileName('ゴブリン.png', 'コマ')).toBe('ゴブリン');
    expect(characterNameFromFileName('goblin_01.webp', 'コマ')).toBe('goblin_01');
  });

  it('takes only the last dot as the extension', () => {
    expect(characterNameFromFileName('cthulhu.v2.final.png', 'コマ')).toBe('cthulhu.v2.final');
  });

  it('leaves a name without one alone', () => {
    expect(characterNameFromFileName('nameless', 'コマ')).toBe('nameless');
  });

  it('trims the ends', () => {
    expect(characterNameFromFileName('  ドラゴン .png', 'コマ')).toBe('ドラゴン');
  });

  it('falls back to the default when nothing is left', () => {
    expect(characterNameFromFileName('.png', 'コマ')).toBe('コマ');
    expect(characterNameFromFileName('   .png', 'コマ')).toBe('コマ');
    expect(characterNameFromFileName('', 'コマ')).toBe('コマ');
  });
});
