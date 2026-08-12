import {
  isTypingTarget,
  type VisualNovelKeyContext,
  visualNovelKeyDown,
  visualNovelKeyUp,
} from '@axe/features/visual-novel/visual-novel-shortcut';

const IDLE: VisualNovelKeyContext = { composing: false, typing: false, popoverOpen: false, chord: false };

describe('visualNovelKeyDown()', () => {
  it('送りのキーで先へ進めること', () => {
    for (const key of ['Enter', ' ', 'ArrowRight', 'ArrowDown']) {
      expect(visualNovelKeyDown(key, IDLE)).toEqual({ command: 'advance', preventDefault: true });
    }
  });

  it('戻りのキーで前へ戻れること', () => {
    for (const key of ['ArrowLeft', 'ArrowUp']) {
      expect(visualNovelKeyDown(key, IDLE)?.command).toBe('back');
    }
  });

  it('端まで飛べること', () => {
    expect(visualNovelKeyDown('Home', IDLE)?.command).toBe('toStart');
    expect(visualNovelKeyDown('End', IDLE)?.command).toBe('toLatest');
  });

  it('大文字でも同じ割り当てにすること', () => {
    expect(visualNovelKeyDown('l', IDLE)?.command).toBe('toggleBacklog');
    expect(visualNovelKeyDown('L', IDLE)?.command).toBe('toggleBacklog');
    expect(visualNovelKeyDown('A', IDLE)?.command).toBe('toggleAutoPlay');
    expect(visualNovelKeyDown('S', IDLE)?.command).toBe('toggleSlotGuide');
  });

  it('文字を打っている間は何も起こさないこと', () => {
    expect(visualNovelKeyDown('Enter', { ...IDLE, typing: true })).toBeNull();
    expect(visualNovelKeyDown('a', { ...IDLE, typing: true })).toBeNull();
  });

  it('変換中の確定を送りに使わないこと', () => {
    expect(visualNovelKeyDown('Enter', { ...IDLE, composing: true })).toBeNull();
  });

  it('Escape は開いているものを先に閉じること', () => {
    expect(visualNovelKeyDown('Escape', { ...IDLE, popoverOpen: true })?.command).toBe('closePopovers');
    expect(visualNovelKeyDown('Escape', IDLE)?.command).toBe('exit');
  });

  it('早送りは押している間だけで、既定の動きを止めないこと', () => {
    expect(visualNovelKeyDown('Control', IDLE)).toEqual({ command: 'startSkip', preventDefault: false });
    expect(visualNovelKeyUp('Control')?.command).toBe('stopSkip');
    expect(visualNovelKeyUp('Shift')).toBeNull();
  });

  it('修飾キーとの組み合わせを横取りしないこと', () => {
    // Ctrl+A は全選択、Ctrl+S は保存。奪うと画面の外の当たり前が壊れる。
    for (const key of ['a', 's', 'l', 'Enter', 'Escape']) {
      expect(visualNovelKeyDown(key, { ...IDLE, chord: true })).toBeNull();
    }
  });

  it('Ctrl 単独は早送りとして通すこと', () => {
    expect(visualNovelKeyDown('Control', { ...IDLE, chord: true })?.command).toBe('startSkip');
  });

  it('割り当ての無いキーには何も返さないこと', () => {
    expect(visualNovelKeyDown('z', IDLE)).toBeNull();
  });
});

describe('isTypingTarget()', () => {
  it('入力欄を打鍵の場と見なすこと', () => {
    for (const tag of ['input', 'textarea', 'select']) {
      expect(isTypingTarget(document.createElement(tag))).toBe(true);
    }
  });

  it('書き換えられる場所も打鍵の場と見なすこと', () => {
    const element = document.createElement('div');
    element.contentEditable = 'true';
    Object.defineProperty(element, 'isContentEditable', { value: true });

    expect(isTypingTarget(element)).toBe(true);
  });

  it('ふつうの場所は打鍵の場でないこと', () => {
    expect(isTypingTarget(document.createElement('div'))).toBe(false);
    expect(isTypingTarget(null)).toBe(false);
  });
});
