import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CharacterImportService } from '@axe/application/character/character-import.service';
import { TRANSLATE_FN } from '@axe/application/i18n/translate.token';
import { RolePermissionService } from '@axe/application/permission/role-permission.service';
import { PanelService } from '@axe/application/ui/panel.service';
import {
  capabilityOf,
  IMPORT_DATA_TYPES,
  IMPORT_SOURCES,
  ImportDataTypeId,
  ImportSourceId,
  SUPPORT_LEVEL_LABEL_KEYS,
  SUPPORT_LEVEL_SYMBOLS,
} from '@axe/domain/character/import/import-capability';
import { TranslocoModule } from '@jsverse/transloco';

type ImportFeedback = { kind: 'success' | 'warning' | 'error'; text: string } | null;

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'import-character',
  templateUrl: './import-character.component.html',
  imports: [FormsModule, TranslocoModule],
})
export class ImportCharacterComponent {
  private readonly characterImport = inject(CharacterImportService);
  private readonly panelService = inject(PanelService);
  private readonly rolePermission = inject(RolePermissionService);
  private readonly t = inject(TRANSLATE_FN);

  text = '';
  readonly busy = signal(false);
  readonly feedback = signal<ImportFeedback>(null);

  readonly sources = IMPORT_SOURCES;
  readonly dataTypes = IMPORT_DATA_TYPES;

  levelSymbol(source: ImportSourceId, dataType: ImportDataTypeId): string {
    return SUPPORT_LEVEL_SYMBOLS[capabilityOf(source, dataType)];
  }

  levelLabelKey(source: ImportSourceId, dataType: ImportDataTypeId): string {
    return SUPPORT_LEVEL_LABEL_KEYS[capabilityOf(source, dataType)];
  }

  constructor() {
    queueMicrotask(() => (this.panelService.title = this.t('feature.character.import.panel')));
  }

  get canEdit(): boolean {
    return this.rolePermission.canEditTabletop;
  }

  async importCharacter(): Promise<void> {
    if (!this.canEdit || this.busy()) return;
    if (this.text.trim() === '') {
      this.feedback.set({ kind: 'warning', text: this.t('feature.character.import.empty') });
      return;
    }

    this.busy.set(true);
    this.feedback.set(null);
    try {
      const result = await this.characterImport.importFromText(this.text);
      if (result.error === 'unsupported') {
        const key =
          result.service === 'charaxiv'
            ? 'feature.character.import.unsupportedCharaxiv'
            : 'feature.character.import.unsupported';
        this.feedback.set({ kind: 'error', text: this.t(key) });
        return;
      }
      if (result.error === 'fetch-failed') {
        this.feedback.set({ kind: 'error', text: this.t('feature.character.import.fetchFailed') });
        return;
      }
      if (result.error === 'unrecognized') {
        this.feedback.set({ kind: 'error', text: this.t('feature.character.import.unrecognized') });
        return;
      }
      if (result.error || !result.character) {
        this.feedback.set({ kind: 'error', text: this.t('feature.character.import.failed') });
        return;
      }
      const key = result.imageResolved ? 'feature.character.import.success' : 'feature.character.import.successNoImage';
      this.feedback.set({ kind: result.imageResolved ? 'success' : 'warning', text: this.t(key) });
      this.text = '';
    } finally {
      this.busy.set(false);
    }
  }

  close(): void {
    this.panelService.close();
  }
}
