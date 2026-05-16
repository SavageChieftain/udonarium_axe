import { Injector, ViewContainerRef } from '@angular/core';
import { inject, TestBed } from '@angular/core/testing';
import { ModalService } from '@axe/application/ui/modal.service';

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
    it('初期値が空文字列であること', inject([ModalService], (service: ModalService) => {
      expect(service.title).toBe('');
    }));

    it('setterで値を更新できること', inject([ModalService], (service: ModalService) => {
      service.title = 'テストモーダル';
      expect(service.title).toBe('テストモーダル');
    }));
  });

  describe('open lifecycle', () => {
    it('resolve後でも次のopenでisShow=trueになること（countが二重減算されない）', async () => {
      const service = TestBed.inject(ModalService);
      const rootInjector = TestBed.inject(Injector);

      let destroyCallback: (() => void) | undefined;
      let childInjector: Injector | undefined;

      const panelComponentRef = {
        instance: {
          content: () => ({
            createComponent: () => ({ instance: {} }),
          }),
        },
        destroy: () => {
          destroyCallback?.();
        },
        onDestroy: (cb: () => void) => {
          destroyCallback = cb;
        },
      };

      const parentViewContainerRef = {
        injector: rootInjector,
        length: 0,
        createComponent: (_component: unknown, options: { injector: Injector }) => {
          childInjector = options.injector;
          return panelComponentRef;
        },
      } as unknown as ViewContainerRef;

      const firstPromise = service.open<{ ok: boolean }>(class {}, { title: 'first' }, parentViewContainerRef);
      expect(service.isShow).toBe(true);

      const firstChildService = childInjector!.get(ModalService);
      firstChildService.resolve({ ok: true });
      await expect(firstPromise).resolves.toEqual({ ok: true });
      expect(service.isShow).toBe(false);

      const secondPromise = service.open<{ ok: boolean }>(class {}, { title: 'second' }, parentViewContainerRef);
      expect(service.isShow).toBe(true);

      const secondChildService = childInjector!.get(ModalService);
      secondChildService.resolve({ ok: true });
      await expect(secondPromise).resolves.toEqual({ ok: true });
      expect(service.isShow).toBe(false);
    });

    it('reject後でも次のopenでisShow=trueになること（countが二重減算されない）', async () => {
      const service = TestBed.inject(ModalService);
      const rootInjector = TestBed.inject(Injector);

      let destroyCallback: (() => void) | undefined;
      let childInjector: Injector | undefined;

      const panelComponentRef = {
        instance: {
          content: () => ({
            createComponent: () => ({ instance: {} }),
          }),
        },
        destroy: () => {
          destroyCallback?.();
        },
        onDestroy: (cb: () => void) => {
          destroyCallback = cb;
        },
      };

      const parentViewContainerRef = {
        injector: rootInjector,
        length: 0,
        createComponent: (_component: unknown, options: { injector: Injector }) => {
          childInjector = options.injector;
          return panelComponentRef;
        },
      } as unknown as ViewContainerRef;

      const firstPromise = service.open(class {}, { title: 'first' }, parentViewContainerRef);
      expect(service.isShow).toBe(true);

      const firstChildService = childInjector!.get(ModalService);
      firstChildService.reject('ng');
      await expect(firstPromise).rejects.toBe('ng');
      expect(service.isShow).toBe(false);

      const secondPromise = service.open(class {}, { title: 'second' }, parentViewContainerRef);
      expect(service.isShow).toBe(true);

      const secondChildService = childInjector!.get(ModalService);
      secondChildService.reject('ng2');
      await expect(secondPromise).rejects.toBe('ng2');
      expect(service.isShow).toBe(false);
    });
  });
});
