import { findByReference } from '@axe/domain/hotbar/hotbar-reference';

describe('what a slot points at', () => {
  const things = [
    { identifier: 'a', name: '閃光' },
    { identifier: 'b', name: '幕間' },
    { identifier: 'c', name: '幕間' },
  ];

  it('takes the one the identifier names', () => {
    expect(findByReference(things, 'a', '別の名前')).toEqual({ thing: things[0], renamed: false });
  });

  it('falls back to the name where the identifier means nothing here', () => {
    expect(findByReference(things, 'from-another-room', '閃光')).toEqual({ thing: things[0], renamed: true });
  });

  it('takes none where the name is shared', () => {
    expect(findByReference(things, 'gone', '幕間')).toBeNull();
  });

  it('takes none where the slot points at nothing', () => {
    expect(findByReference(things, '', '')).toBeNull();
    expect(findByReference(things, '  ', '  ')).toBeNull();
  });
});
