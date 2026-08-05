import { presetSoundLabelKey, soundFileName } from '@axe/domain/media/preset-sound-labels';

describe('presetSoundLabelKey()', () => {
  it('既定 SE には表示名の鍵を返すこと', () => {
    expect(presetSoundLabelKey('./assets/sounds/soundeffect-lab/breath-wind.mp3')).toBe(
      'feature.effect.sounds.breath-wind'
    );
    expect(presetSoundLabelKey('./assets/sounds/on-jin/tm2_switch001.wav')).toBe('feature.effect.sounds.tm2_switch001');
  });

  it('持ち込んだ音には鍵を返さないこと', () => {
    expect(presetSoundLabelKey('abcdef-0123')).toBe('');
    expect(presetSoundLabelKey('./assets/sounds/自作の音.mp3')).toBe('');
  });
});

describe('soundFileName()', () => {
  it('パスと拡張子を落とすこと', () => {
    // identifier はパスそのもの。そのまま出しても何の音か分からない。
    expect(soundFileName('./assets/sounds/soundeffect-lab/explosion-huge.mp3')).toBe('explosion-huge');
    expect(soundFileName('my-sound.wav')).toBe('my-sound');
    expect(soundFileName('名前だけ')).toBe('名前だけ');
  });
});
