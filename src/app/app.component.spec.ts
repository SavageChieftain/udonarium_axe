import { AppComponent } from '@axe/app.component';
import { version } from '@pkg';

describe('AppComponent', () => {
  it('should be defined', () => {
    expect(AppComponent).toBeTruthy();
  });

  it('resolves the version string from package.json through the @pkg alias', () => {
    expect(version).toMatch(/^\d+\.\d+\.\d+(-.+)?$/);
  });
});
