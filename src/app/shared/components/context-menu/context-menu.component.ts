import { NgClass, NgTemplateOutlet } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  input,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PointerDeviceService } from '@axe/core/input/pointer-device.service';
import { TabletopObject } from '@axe/domain/tabletop/tabletop-object';
import { ContextMenuAction, ContextMenuService } from '@axe/shared/ui/context-menu.service';
import { UiSignalService } from '@axe/shared/ui/ui-signal.service';
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'context-menu',
  templateUrl: './context-menu.component.html',
  styles: [
    `
      .component {
        box-sizing: border-box;
        overflow: visible;
        position: absolute;

        background: linear-gradient(-30deg, rgba(240, 218, 189, 0.9), rgba(255, 244, 232, 0.9));
        border: solid 1px #999;
        padding: 0px;

        white-space: nowrap;

        -moz-user-select: none;
        -webkit-user-select: none;
        user-select: none;

        -moz-user-drag: none;
        -webkit-user-drag: none;
        z-index: 9900;
      }
      .submenu-panel {
        position: absolute;
        left: calc(100% - 4px);
        top: -16px;
      }
      .pointer-events-none {
        pointer-events: none;
      }
      .is-max-limit {
        max-height: 100%;
        max-width: 100%;
      }
      .title {
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
        max-width: 18em;
        font-size: 12px;
        text-align: center;
        padding: 4px 16px;
        margin: 0 2px;
        color: #444;
        border-bottom: 1px solid #aaa;
      }
      .menu-title {
        display: inline-block;
      }

      td.altitude {
        vertical-align: middle;
        height: 100%;
      }

      input.altitude {
        writing-mode: vertical-lr;
        direction: rtl;
        width: 8px;
        height: 200px;

        padding: 3px;
      }

      .disabled .menu-title,
      .disabled .material-icons {
        color: gray;
      }

      .altitude-view {
        color: black;
        vertical-align: top;
        width: 3em;
        text-align: right;
      }

      .ruler {
        color: #444;
        font-size: small;
        padding-left: 4px;
        padding-right: 2px;
      }

      hr.separator {
        margin: 0.1em -12px;
        height: 1px;
        border: 0;
        background-color: #aaa;
      }
      .sub-menu-arrow {
        display: inline-block;
        position: absolute;
        top: 2px;
        bottom: 0;
        right: 1px;
      }
      ul {
        list-style: none;
        padding: 2px 0;
        margin: 0;
      }
      ul > li {
        position: relative;
        cursor: -moz-default;
        cursor: -webkit-default;
        cursor: default;

        padding: 2px 20px;
        font-size: 12px;
        color: #444;
      }
      ul > li.hasHighlight:hover {
        color: #ccc;
        background-color: rgba(30, 30, 30, 0.8);
      }
    `,
  ],
  imports: [NgClass, FormsModule, NgTemplateOutlet],
  host: { class: 'block', '(contextmenu)': 'onContextMenu($event)' },
})
export class ContextMenuComponent {
  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  contextMenuService = inject(ContextMenuService);
  private readonly pointerDeviceService = inject(PointerDeviceService);
  private readonly uiSignalService = inject(UiSignalService);
  private readonly destroyRef = inject(DestroyRef);

  readonly rootElementRef = viewChild.required<ElementRef<HTMLElement>>('root');

  readonly isSubmenu = input(false);
  protected readonly titleInput = input('', { alias: 'title' });
  readonly titleColor = input('');
  readonly titleBold = input(false);
  protected readonly actionsInput = input<ContextMenuAction[]>([], { alias: 'actions' });

  get title(): string {
    return this.isSubmenu() ? this.titleInput() : this.contextMenuService.title;
  }
  get actions(): ContextMenuAction[] {
    return this.isSubmenu() ? this.actionsInput() : this.contextMenuService.actions;
  }

  parentMenu: ContextMenuAction | undefined;
  subMenu: ContextMenuAction[] | undefined;

  private showSubMenuTimer: ReturnType<typeof setTimeout> | undefined;
  private hideSubMenuTimer: ReturnType<typeof setTimeout> | undefined;

  private callbackOnOutsideClick = (e: Event) => this.onOutsideClick(e);

  constructor() {
    afterNextRender(() => {
      if (!this.isSubmenu()) {
        this.adjustPositionRoot();
        document.addEventListener('touchstart', this.callbackOnOutsideClick, true);
        document.addEventListener('mousedown', this.callbackOnOutsideClick, true);
      } else {
        this.adjustPositionSub();
      }
      this.indexMenuPosion();
    });
    this.destroyRef.onDestroy(() => {
      document.removeEventListener('touchstart', this.callbackOnOutsideClick, true);
      document.removeEventListener('mousedown', this.callbackOnOutsideClick, true);
    });
  }

  get isPointerDragging(): boolean {
    return this.pointerDeviceService.isDragging;
  }

  get altitudeHande(): TabletopObject | null {
    for (const action of this.actions) {
      if (action && action.altitudeHande) return action.altitudeHande;
    }
    return null;
  }

  onOutsideClick(event: Event) {
    if (!this.rootElementRef().nativeElement.contains(event.target as Node)) {
      this.close();
    }
  }

  onContextMenu(e: Event) {
    e.stopPropagation();
    e.preventDefault();
  }

  indexMenuPosion() {
    if (this.title != 'インデックス') return;

    const panel: HTMLElement = this.rootElementRef().nativeElement;
    const panelBox = panel.getBoundingClientRect();

    const w = panelBox.right - panelBox.left;
    const newLeft = panelBox.left - w;

    panel.style.left = newLeft + 'px';
    //    panel.style.right = newRight + 'px';
  }

  private adjustPositionRoot() {
    const panel: HTMLElement = this.rootElementRef().nativeElement;

    panel.style.left = this.contextMenuService.position.x + 'px';
    panel.style.top = this.contextMenuService.position.y + 'px';

    const panelBox = panel.getBoundingClientRect();

    let diffLeft = 0;
    let diffTop = 0;

    if (window.innerWidth < panelBox.right + diffLeft) {
      diffLeft += window.innerWidth - (panelBox.right + diffLeft);
    }
    if (panelBox.left + diffLeft < 0) {
      diffLeft += 0 - (panelBox.left + diffLeft);
    }

    if (window.innerHeight < panelBox.bottom + diffTop) {
      diffTop += window.innerHeight - (panelBox.bottom + diffTop);
    }
    if (panelBox.top + diffTop < 0) {
      diffTop += 0 - (panelBox.top + diffTop);
    }

    panel.style.left = panel.offsetLeft + diffLeft + 'px';
    panel.style.top = panel.offsetTop + diffTop + 'px';
  }

  private adjustPositionSub() {
    const parent: HTMLElement = this.elementRef.nativeElement.parentElement!;
    const submenu: HTMLElement = this.rootElementRef().nativeElement;

    const parentBox = parent.getBoundingClientRect();
    const submenuBox = submenu.getBoundingClientRect();

    let diffLeft = 0;
    let diffTop = 0;

    if (window.innerWidth < submenuBox.right + diffLeft) {
      diffLeft -= parentBox.width + submenuBox.width;
      diffLeft += 8;
    }
    if (submenuBox.left + diffLeft < 0) {
      diffLeft += 0 - (submenuBox.left + diffLeft);
    }

    if (window.innerHeight < submenuBox.bottom + diffTop) {
      diffTop += window.innerHeight - (submenuBox.bottom + diffTop);
    }
    if (submenuBox.top + diffTop < 0) {
      diffTop += 0 - (submenuBox.top + diffTop);
    }

    submenu.style.left = submenu.offsetLeft + diffLeft + 'px';
    submenu.style.top = submenu.offsetTop + diffTop + 'px';
  }

  indexAction(indexline: number, id: string) {
    this.uiSignalService.requestJumpIndex(id, indexline);
  }

  doAction(action: ContextMenuAction) {
    this.showSubMenu(action);
    if (action.action != null) {
      action.action();
      this.close();
    }
  }

  showSubMenu(action: ContextMenuAction) {
    this.hideSubMenu();
    clearTimeout(this.showSubMenuTimer);
    if (action.subActions == null || action.subActions.length === 0) return;
    this.showSubMenuTimer = setTimeout(() => {
      this.parentMenu = action;
      this.subMenu = action.subActions ?? [];
      clearTimeout(this.hideSubMenuTimer);
    }, 250);
  }

  hideSubMenu() {
    clearTimeout(this.hideSubMenuTimer);
    this.hideSubMenuTimer = setTimeout(() => {
      this.subMenu = undefined;
    }, 1200);
  }

  close() {
    if (this.contextMenuService) this.contextMenuService.close();
  }
}
