import { presetSoundLabelKey, soundFileName } from '@axe/domain/media/preset-sound-labels';

describe('presetSoundLabelKey()', () => {
  it('returns a name key for a sound that comes with the tool', () => {
    expect(presetSoundLabelKey('./assets/sounds/soundeffect-lab/breath-wind.mp3')).toBe(
      'feature.effect.sounds.breath-wind'
    );
    expect(presetSoundLabelKey('./assets/sounds/on-jin/tm2_switch001.wav')).toBe('feature.effect.sounds.tm2_switch001');
  });

  it('returns none for one that was brought in', () => {
    expect(presetSoundLabelKey('abcdef-0123')).toBe('');
    expect(presetSoundLabelKey('./assets/sounds/自作の音.mp3')).toBe('');
  });
});

describe('soundFileName()', () => {
  it('drops the path and the extension', () => {
    // The identifier is the path itself, which says nothing about the sound.
    expect(soundFileName('./assets/sounds/soundeffect-lab/explosion-huge.mp3')).toBe('explosion-huge');
    expect(soundFileName('my-sound.wav')).toBe('my-sound');
    expect(soundFileName('名前だけ')).toBe('名前だけ');
  });
});
