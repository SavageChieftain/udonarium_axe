import { EditHistory } from '@axe/core/util/edit-history';

interface Draft {
  title: string;
}

const copy = (draft: Draft): Draft => ({ ...draft });

describe('EditHistory', () => {
  it('has nothing to take back to begin with', () => {
    const history = new EditHistory({ title: 'one' }, copy);

    expect(history.canUndo()).toBe(false);
    expect(history.canRedo()).toBe(false);
    expect(history.undo()).toBeNull();
    expect(history.redo()).toBeNull();
  });

  it('hands back what stood before the change', () => {
    const draft: Draft = { title: 'one' };
    const history = new EditHistory(draft, copy);

    draft.title = 'two';
    history.commit(draft);

    expect(history.undo()).toEqual({ title: 'one' });
  });

  it('puts back what was taken', () => {
    const draft: Draft = { title: 'one' };
    const history = new EditHistory(draft, copy);
    draft.title = 'two';
    history.commit(draft);
    history.undo();

    expect(history.redo()).toEqual({ title: 'two' });
  });

  it('forgets what could be put back once something else is committed', () => {
    const draft: Draft = { title: 'one' };
    const history = new EditHistory(draft, copy);
    history.commit(draft);
    history.undo();

    history.commit(draft);

    expect(history.canRedo()).toBe(false);
  });

  it('copies on the way in and on the way out', () => {
    const draft: Draft = { title: 'one' };
    const history = new EditHistory(draft, copy);
    draft.title = 'two';
    history.commit(draft);

    const taken = history.undo()!;
    taken.title = 'meddled with';

    expect(history.redo()).toEqual({ title: 'two' });
  });

  it('keeps only as far back as it was told to', () => {
    const draft: Draft = { title: 'one' };
    const history = new EditHistory(draft, copy, 3);
    for (const title of ['two', 'three', 'four', 'five']) {
      draft.title = title;
      history.commit(draft);
    }

    let steps = 0;
    while (history.canUndo()) {
      history.undo();
      steps++;
    }

    expect(steps).toBe(3);
  });

  it('starts over from where it is told', () => {
    const draft: Draft = { title: 'one' };
    const history = new EditHistory(draft, copy);
    history.commit(draft);
    history.undo();

    history.reset(draft);

    expect(history.canUndo()).toBe(false);
    expect(history.canRedo()).toBe(false);
  });
});
