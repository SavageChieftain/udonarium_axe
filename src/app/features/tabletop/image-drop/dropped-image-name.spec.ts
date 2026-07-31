import { characterNameFromFileName } from '@axe/features/tabletop/image-drop/dropped-image-name';

describe('characterNameFromFileName', () => {
  it('拡張子を落とした名前を返す', () => {
    expect(characterNameFromFileName('ゴブリン.png', 'コマ')).toBe('ゴブリン');
    expect(characterNameFromFileName('goblin_01.webp', 'コマ')).toBe('goblin_01');
  });

  it('複数のドットは最後のものだけを拡張子として扱う', () => {
    expect(characterNameFromFileName('cthulhu.v2.final.png', 'コマ')).toBe('cthulhu.v2.final');
  });

  it('拡張子が無ければそのまま使う', () => {
    expect(characterNameFromFileName('nameless', 'コマ')).toBe('nameless');
  });

  it('前後の空白を落とす', () => {
    expect(characterNameFromFileName('  ドラゴン .png', 'コマ')).toBe('ドラゴン');
  });

  it('名前が残らなければ既定名を使う', () => {
    expect(characterNameFromFileName('.png', 'コマ')).toBe('コマ');
    expect(characterNameFromFileName('   .png', 'コマ')).toBe('コマ');
    expect(characterNameFromFileName('', 'コマ')).toBe('コマ');
  });
});
