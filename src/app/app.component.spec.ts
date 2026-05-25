import { AppComponent } from '@axe/app.component';
import { version } from '@pkg';

describe('AppComponent', () => {
  it('should be defined', () => {
    expect(AppComponent).toBeTruthy();
  });

  it('@pkg alias で package.json の version 文字列を解決できる', () => {
    expect(version).toMatch(/^\d+\.\d+\.\d+(-.+)?$/);
  });
});
