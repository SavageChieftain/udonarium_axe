import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { LanguageService } from '@axe/application/i18n/language.service';
import { TranslocoModule } from '@jsverse/transloco';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-language-selector',
  templateUrl: './language-selector.component.html',
  imports: [TranslocoModule],
})
export class LanguageSelectorComponent {
  readonly language = inject(LanguageService);

  toggle(): void {
    this.language.toggle();
  }
}
