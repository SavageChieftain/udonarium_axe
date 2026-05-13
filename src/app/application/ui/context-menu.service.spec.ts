import { inject, TestBed } from '@angular/core/testing';
import { ContextMenuService } from '@axe/application/ui/context-menu.service';

describe('ContextMenuService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ContextMenuService],
    });
  });

  it('should ...', inject([ContextMenuService], (service: ContextMenuService) => {
    expect(service).toBeTruthy();
  }));
});
