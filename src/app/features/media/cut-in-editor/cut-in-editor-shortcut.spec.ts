import { cutInEditorKeyDown } from '@axe/features/media/cut-in-editor/cut-in-editor-shortcut';

const plain = { typing: false, chord: false, shift: false, hasSelection: true };

describe('cutInEditorKeyDown()', () => {
  it('does nothing while something is being typed', () => {
    expect(cutInEditorKeyDown('z', { ...plain, typing: true, chord: true })).toBeNull();
    expect(cutInEditorKeyDown('Delete', { ...plain, typing: true })).toBeNull();
  });

  it('takes the last change back', () => {
    expect(cutInEditorKeyDown('z', { ...plain, chord: true })).toEqual({ command: 'undo', preventDefault: true });
  });

  it('puts it again, whichever way it is asked', () => {
    expect(cutInEditorKeyDown('z', { ...plain, chord: true, shift: true })).toEqual({
      command: 'redo',
      preventDefault: true,
    });
    expect(cutInEditorKeyDown('y', { ...plain, chord: true })).toEqual({ command: 'redo', preventDefault: true });
  });

  it('reads the key whichever case it comes in', () => {
    expect(cutInEditorKeyDown('Z', { ...plain, chord: true })?.command).toBe('undo');
  });

  it('deletes what is selected', () => {
    expect(cutInEditorKeyDown('Delete', plain)?.command).toBe('deleteSelection');
    expect(cutInEditorKeyDown('Backspace', plain)?.command).toBe('deleteSelection');
  });

  it('deletes nothing with nothing selected', () => {
    expect(cutInEditorKeyDown('Delete', { ...plain, hasSelection: false })).toBeNull();
  });

  it('starts and stops on the space bar', () => {
    expect(cutInEditorKeyDown(' ', plain)).toEqual({ command: 'togglePlaying', preventDefault: true });
  });

  it('leaves the rest of the keyboard alone', () => {
    expect(cutInEditorKeyDown('a', plain)).toBeNull();
    expect(cutInEditorKeyDown('s', { ...plain, chord: true })).toBeNull();
  });
});
