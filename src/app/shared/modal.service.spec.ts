import { inject, TestBed } from '@angular/core/testing';

import { ModalService } from './modal.service';

describe('ModalService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ModalService],
    });
  });

  it('should ...', inject([ModalService], (service: ModalService) => {
    expect(service).toBeTruthy();
  }));

  describe('title signal', () => {
    it('初期値が「無名のモーダル」であること', inject([ModalService], (service: ModalService) => {
      expect(service.title).toBe('無名のモーダル');
    }));

    it('setterで値を更新できること', inject([ModalService], (service: ModalService) => {
      service.title = 'テストモーダル';
      expect(service.title).toBe('テストモーダル');
    }));
  });
});
