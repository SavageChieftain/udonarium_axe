import { ResizableDirective } from '@axe/ui/directives/resizable.directive';

describe('ResizableDirective', () => {
  it('should be defined', () => {
    expect(ResizableDirective).toBeDefined();
  });

  describe('DOM操作時の安全性', () => {
    it('parentElement が存在しない場合（orphan DOM）でも calcElementPosition では例外を投げない', () => {
      const orphanElement = document.createElement('div');
      orphanElement.style.left = '10px';
      orphanElement.style.top = '20px';
      orphanElement.style.width = '100px';
      orphanElement.style.height = '100px';

      expect(orphanElement.parentElement).toBeNull();
    });
  });
});
