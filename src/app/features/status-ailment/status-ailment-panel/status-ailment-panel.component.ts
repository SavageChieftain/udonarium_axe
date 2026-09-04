import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { StatusAilmentService } from '@axe/application/character/status-ailment.service';
import { RolePermissionService } from '@axe/application/permission/role-permission.service';
import { ObjectChangeService } from '@axe/application/sync/object-change.service';
import { ModalService } from '@axe/application/ui/modal.service';
import { BUFF_COLORS, resolveBuffColor } from '@axe/domain/character/buff-appearance';
import { buffIconUrlOf } from '@axe/domain/character/buff-badge';
import { BUFF_TIMINGS, BuffTiming } from '@axe/domain/character/buff-timing';
import { StatusAilment, withRounds } from '@axe/domain/character/status-ailment';
import { FileSelecterComponent } from '@axe/ui/components/file-selecter/file-selecter.component';
import { SafePipe } from '@axe/ui/pipes/safe.pipe';
import { TranslocoModule } from '@jsverse/transloco';

/** Only one list, so a second press of whatever opened it puts it away. */

/**
 * The states this room keeps on hand.
 *
 * Registering one here does not put it on anybody. It is the list the inventory offers as
 * columns to tick, and what to write down when one is ticked.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'status-ailment-panel',
  templateUrl: './status-ailment-panel.component.html',
  host: { class: 'block h-full' },
  imports: [FormsModule, SafePipe, TranslocoModule],
})
export class StatusAilmentPanelComponent {
  private readonly ailmentService = inject(StatusAilmentService);
  private readonly rolePermission = inject(RolePermissionService);
  private readonly objectChange = inject(ObjectChangeService);
  private readonly modalService = inject(ModalService);

  readonly ailments = this.ailmentService.ailments;
  readonly timings = BUFF_TIMINGS;
  readonly colors = BUFF_COLORS;

  readonly newName = signal('');

  readonly canEdit = computed<boolean>(() => {
    this.objectChange.trackMyCursor();
    return this.rolePermission.canEditTabletop;
  });

  swatchOf(color: string): string {
    return resolveBuffColor(color) || 'transparent';
  }

  /** Where the picture is, for a state whose mark is one that was brought in. */
  iconUrlOf(ailment: StatusAilment): string {
    this.objectChange.fileVersion();
    return buffIconUrlOf(ailment.icon);
  }

  /** Puts a picture from the room's images in place of the mark. */
  chooseIconImage(ailment: StatusAilment): void {
    if (!this.canEdit()) return;
    this.modalService.open<string>(FileSelecterComponent, { isAllowedEmpty: true }).then((identifier) => {
      if (identifier == null) return;
      this.replace(ailment, { ...ailment, icon: identifier });
    });
  }

  add(): void {
    if (!this.canEdit()) return;
    if (this.ailmentService.add(this.newName())) this.newName.set('');
  }

  remove(name: string): void {
    if (!this.canEdit()) return;
    this.ailmentService.remove(name);
  }

  move(name: string, delta: number): void {
    if (!this.canEdit()) return;
    this.ailmentService.move(name, delta);
  }

  setColor(ailment: StatusAilment, color: string): void {
    this.replace(ailment, { ...ailment, color });
  }

  setIcon(ailment: StatusAilment, icon: string): void {
    this.replace(ailment, { ...ailment, icon: icon.trim() });
  }

  setRounds(ailment: StatusAilment, rounds: string): void {
    this.replace(ailment, withRounds(ailment, Number(rounds)));
  }

  setTiming(ailment: StatusAilment, timing: string): void {
    if (!(BUFF_TIMINGS as readonly string[]).includes(timing)) return;
    this.replace(ailment, { ...ailment, timing: timing as BuffTiming });
  }

  setEffect(ailment: StatusAilment, effect: string): void {
    this.replace(ailment, { ...ailment, effect });
  }

  private replace(ailment: StatusAilment, next: StatusAilment): void {
    if (!this.canEdit()) return;
    this.ailmentService.save(this.ailments().map((entry) => (entry.name === ailment.name ? next : entry)));
  }
}
