/**
 * 既定 SE の表示名。
 *
 * 音の identifier はファイルのパスなので、そのまま出すと何の音か分からない。
 * ここではファイル名だけを持ち、表示名は i18n 側（`feature.effect.sounds.*`）に置く。
 */
const PRESET_SOUND_FILES: ReadonlySet<string> = new Set([
  'alarm',
  'barrier',
  'bash-finish',
  'bash-large',
  'bash-medium',
  'bash-small',
  'beam-small',
  'book-stack1',
  'bow-pierce',
  'bow-release',
  'breath-fire',
  'breath-ice',
  'breath-poison',
  'breath-wind',
  'buff',
  'card-open1',
  'card-turn-over1',
  'charge',
  'cleanse',
  'cointoss',
  'cure-large',
  'cure-medium',
  'cure-small',
  'damage-large',
  'damage-medium',
  'damage-small',
  'dark',
  'drain',
  'earth-upheaval',
  'explosion-huge',
  'explosion-large',
  'explosion-small',
  'fire-large',
  'fire-medium',
  'fire-small',
  'gravity',
  'gravity-large',
  'gun-handgun',
  'gun-machinegun',
  'gun-rifle',
  'gun-smg',
  'heal-large',
  'heal-medium',
  'heal-small',
  'holy',
  'ice-large',
  'ice-medium',
  'ice-small',
  'poison',
  'qigong',
  'reflect',
  'rock-break',
  'shoulder-touch1',
  'slash-charged',
  'slash-combo',
  'slash-iai',
  'slash-large',
  'slash-small',
  'spo_ge_saikoro_teburu01',
  'spo_ge_saikoro_teburu02',
  'status-bind',
  'status-cure',
  'status-curse',
  'status-petrify',
  'status-sleep',
  'stone-hit',
  'summon',
  'super-arts',
  'thunder-bolt',
  'thunder-large',
  'thunder-small',
  'tm2_pon002',
  'tm2_swing003',
  'tm2_switch001',
  'warp',
  'wind-large',
  'wind-small',
]);

/** 拡張子とディレクトリを落としたファイル名。 */
export function soundFileName(identifier: string): string {
  const file = identifier.split('/').pop() ?? identifier;
  return file.replace(/\.(mp3|wav|ogg|m4a)$/i, '');
}

/** 表示名の i18n キー。持ち込んだ音なら空を返す。 */
export function presetSoundLabelKey(identifier: string): string {
  const name = soundFileName(identifier);
  return PRESET_SOUND_FILES.has(name) ? `feature.effect.sounds.${name}` : '';
}
