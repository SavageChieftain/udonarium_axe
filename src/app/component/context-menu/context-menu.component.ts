import { NgClass, NgTemplateOutlet } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  inject,
  Input,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TabletopObject } from '@axe/class/tabletop-object';
import { ContextMenuAction, ContextMenuService } from '@axe/service/context-menu.service';
import { PointerDeviceService } from '@axe/service/pointer-device.service';
import { UiSignalService } from '@axe/service/ui-signal.service';
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'context-menu',
  templateUrl: './context-menu.component.html',
  styleUrls: ['./context-menu.component.css'],
  imports: [NgClass, FormsModule, NgTemplateOutlet],
})
export class ContextMenuComponent implements OnInit, OnDestroy, AfterViewInit {
  private elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  contextMenuService = inject(ContextMenuService);
  private pointerDeviceService = inject(PointerDeviceService);
  private uiSignalService = inject(UiSignalService);

  @ViewChild('root', { static: true }) rootElementRef!: ElementRef<HTMLElement>;

  @Input() title: string = '';
  @Input() titleColor: string = '';
  @Input() titleBold: boolean = false;
  @Input() actions: ContextMenuAction[] = [];

  @Input() isSubmenu: boolean = false;

  parentMenu: ContextMenuAction | undefined;
  subMenu: ContextMenuAction[] | undefined;

  showSubMenuTimer: ReturnType<typeof setTimeout> | undefined;
  hideSubMenuTimer: ReturnType<typeof setTimeout> | undefined;

  private callbackOnOutsideClick = (e: Event) => this.onOutsideClick(e);

  get isPointerDragging(): boolean {
    return this.pointerDeviceService.isDragging;
  }
  get altitudeHande(): TabletopObject | null {
    for (const action of this.actions) {
      if (action && action.altitudeHande) return action.altitudeHande;
    }
    return null;
  }

  ngOnInit() {
    if (!this.isSubmenu) {
      this.title = this.contextMenuService.title;
      this.actions = this.contextMenuService.actions;
    }
  }

  ngAfterViewInit() {
    if (!this.isSubmenu) {
      this.adjustPositionRoot();
      document.addEventListener('touchstart', this.callbackOnOutsideClick, true);
      document.addEventListener('mousedown', this.callbackOnOutsideClick, true);
    } else {
      this.adjustPositionSub();
    }

    this.indexMenuPosion();
  }

  ngOnDestroy() {
    document.removeEventListener('touchstart', this.callbackOnOutsideClick, true);
    document.removeEventListener('mousedown', this.callbackOnOutsideClick, true);
  }

  onOutsideClick(event: Event) {
    if (this.rootElementRef.nativeElement.contains(event.target as Node) === false) {
      this.close();
    }
  }

  @HostListener('contextmenu', ['$event'])
  onContextMenu(e: Event) {
    e.stopPropagation();
    e.preventDefault();
  }

  indexMenuPosion() {
    if (this.title != 'インデックス') return;

    const panel: HTMLElement = this.rootElementRef.nativeElement;
    const panelBox = panel.getBoundingClientRect();

    const w = panelBox.right - panelBox.left;
    const newLeft = panelBox.left - w;

    panel.style.left = newLeft + 'px';
    //    panel.style.right = newRight + 'px';
  }

  private adjustPositionRoot() {
    const panel: HTMLElement = this.rootElementRef.nativeElement;

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
    const submenu: HTMLElement = this.rootElementRef.nativeElement;

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
    if (action.subActions == null || action.subActions.length < 1) return;
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
