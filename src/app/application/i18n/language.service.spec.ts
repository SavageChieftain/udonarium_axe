import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { LanguageService } from '@axe/application/i18n/language.service';
import { TRANSLOCO_LANG_STORAGE_KEY } from '@axe/application/i18n/transloco.config';
import { beforeEach, describe, expect, it } from 'vitest';

describe('LanguageService', () => {
  let service: LanguageService;
  let html: HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    localStorage.removeItem(TRANSLOCO_LANG_STORAGE_KEY);
    html = TestBed.inject(DOCUMENT).documentElement;
    html.removeAttribute('lang');
    service = TestBed.inject(LanguageService);
  });

  it('marks the document with the language it starts in', async () => {
    localStorage.setItem(TRANSLOCO_LANG_STORAGE_KEY, 'en');

    await service.initialize();

    expect(html.lang).toBe('en');
    expect(service.currentLang()).toBe('en');
  });

  it('follows the language the user switches to', async () => {
    localStorage.setItem(TRANSLOCO_LANG_STORAGE_KEY, 'ja');
    await service.initialize();

    await service.setLang('en');
    expect(html.lang).toBe('en');

    await service.setLang('ja');
    expect(html.lang).toBe('ja');
  });

  it('follows a toggle', async () => {
    localStorage.setItem(TRANSLOCO_LANG_STORAGE_KEY, 'ja');
    await service.initialize();

    await service.toggle();

    expect(html.lang).toBe('en');
    expect(service.currentLang()).toBe('en');
  });
});
