import { TestBed } from '@angular/core/testing';
import { ThemeService } from '@axe/application/ui/theme.service';

describe('ThemeService', () => {
  let service: ThemeService;

  beforeEach(() => {
    localStorage.removeItem('ui-theme');
    TestBed.configureTestingModule({});
    service = TestBed.inject(ThemeService);
  });

  it('settles a chosen theme on itself', () => {
    service.theme.set('dark');
    expect(service.resolved()).toBe('dark');

    service.theme.set('light');
    expect(service.resolved()).toBe('light');
  });

  it('settles auto against what the system asks for', () => {
    service.theme.set('auto');

    expect(['light', 'dark']).toContain(service.resolved());
  });

  it('comes back round through the three it offers', () => {
    service.theme.set('auto');

    service.cycle();
    expect(service.theme()).toBe('dark');

    service.cycle();
    expect(service.theme()).toBe('light');

    service.cycle();
    expect(service.theme()).toBe('auto');
  });
});
