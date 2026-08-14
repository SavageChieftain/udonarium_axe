import { ResizableDirective } from '@axe/ui/directives/resizable.directive';

describe('ResizableDirective', () => {
  it('should be defined', () => {
    expect(ResizableDirective).toBeDefined();
  });

  describe('safety around the dom', () => {
    it('measures a position even for an element with no parent', () => {
      const orphanElement = document.createElement('div');
      orphanElement.style.left = '10px';
      orphanElement.style.top = '20px';
      orphanElement.style.width = '100px';
      orphanElement.style.height = '100px';

      expect(orphanElement.parentElement).toBeNull();
    });
  });
});
