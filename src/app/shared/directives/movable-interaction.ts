import { CoordinateService } from '@axe/core/input/coordinate.service';
import { PointerDeviceService } from '@axe/core/input/pointer-device.service';

export interface MovableInteractionContext {
  isGridSnap: boolean;
  isDisable(): boolean;
  isScratcOwner(): boolean;
  input: {
    isGrabbing: boolean;
    isDragging: boolean;
    pointer: { x: number; y: number; z: number };
    cancel(): void;
  };
  pointerDeviceService: PointerDeviceService;
  coordinateService: CoordinateService;
  nativeElement: HTMLElement;
  posX: number;
  posY: number;
  posZ: number;
  width: number;
  height: number;
  ratio: number;
  pointerOffset2d: { x: number; y: number; z: number };
  pointerStart3d: { x: number; y: number; z: number };
  targetStartRect: DOMRect;
  onstart: { emit(e: PointerEvent): void };
  ondragstart: { emit(e: PointerEvent): void };
  ondrag: { emit(e: PointerEvent): void };
  ondragend: { emit(e: PointerEvent): void };
  onend: { emit(e: PointerEvent): void };
  setPointerEvents(isEnable: boolean): void;
  setAnimatedTransition(isEnable: boolean): void;
  setCollidableLayer(isCollidable: boolean): void;
  cancel(): void;
  cancelTableGesture(): void;
  snapToGrid(gridSize?: number): void;
  scratchObjectPosition(start: boolean): void;
}

export function handleInputStart(context: MovableInteractionContext, e: MouseEvent | TouchEvent): void {
  const isLocked = context.isDisable() && !context.isScratcOwner();
  const isContextMenuButton = (e as MouseEvent).button === 1 || (e as MouseEvent).button === 2;
  if (isLocked || isContextMenuButton) {
    // 中/右クリックは誤回転を避けるため table gesture もキャンセルする。
    // ロック時は table gesture を残してカメラ操作（回転/移動）を通す。
    if (isContextMenuButton) context.cancelTableGesture();
    return context.cancel();
  }

  context.onstart.emit(e as PointerEvent);

  context.setPointerEvents(false);
  context.setAnimatedTransition(false);
  context.setCollidableLayer(true);

  context.width = context.nativeElement.clientWidth;
  context.height = context.nativeElement.clientHeight;

  const target3d = {
    x: context.posX + context.width / 2,
    y: context.posY + context.height / 2,
    z: context.posZ,
  };
  const target2d = context.coordinateService.convertToGlobal(target3d, context.coordinateService.tabletopOriginElement);

  context.setPointerEvents(true);

  context.pointerOffset2d.x = target2d.x - context.input.pointer.x;
  context.pointerOffset2d.y = target2d.y - context.input.pointer.y;
  context.pointerOffset2d.z = target2d.z - context.input.pointer.z;

  context.pointerStart3d.x = target3d.x;
  context.pointerStart3d.y = target3d.y;
  context.pointerStart3d.z = target3d.z;

  context.targetStartRect = context.nativeElement.getBoundingClientRect();

  if (context.isScratcOwner()) {
    context.scratchObjectPosition(true);
  }

  context.ratio = 1.0;
}

export function handleInputMove(context: MovableInteractionContext, e: MouseEvent | TouchEvent): void {
  if (context.input.isGrabbing && !context.pointerDeviceService.isDragging) {
    return context.cancel();
  }

  if ((context.isDisable() && !context.isScratcOwner()) || !context.input.isGrabbing) return context.cancel();

  if (e.cancelable) e.preventDefault();

  if (!context.input.isDragging) context.setPointerEvents(false);

  const pointer2d = {
    x: context.input.pointer.x + context.pointerOffset2d.x * context.ratio,
    y: context.input.pointer.y + context.pointerOffset2d.y * context.ratio,
    z: 0,
  };

  pointer2d.x = Math.min(window.innerWidth - 0.1, Math.max(pointer2d.x, 0.1));
  pointer2d.y = Math.min(window.innerHeight - 0.1, Math.max(pointer2d.y, 0.1));

  const element = document.elementFromPoint(pointer2d.x, pointer2d.y) as HTMLElement;
  if (element == null) return;

  const pointer3d = context.coordinateService.calcTabletopLocalCoordinate(pointer2d, element);
  pointer3d.x -= context.width / 2;
  pointer3d.y -= context.height / 2;

  if (context.posX === pointer3d.x && context.posY === pointer3d.y && context.posZ === pointer3d.z) return;

  if (!context.input.isDragging) context.ondragstart.emit(e as PointerEvent);
  context.ondrag.emit(e as PointerEvent);

  const targetRect = context.nativeElement.getBoundingClientRect();
  const ratio = targetRect.width / context.targetStartRect.width;
  if (ratio < context.ratio) {
    context.ratio += (ratio - context.ratio) * 0.1;
  }

  if (!context.isScratcOwner()) {
    context.posX = pointer3d.x;
    context.posY = pointer3d.y;
    context.posZ = pointer3d.z;
  } else {
    context.scratchObjectPosition(false);
  }
}

export function handleInputEnd(context: MovableInteractionContext, e: MouseEvent | TouchEvent): void {
  if (context.isDisable()) return context.cancel();
  if (context.input.isDragging) context.ondragend.emit(e as PointerEvent);
  if (context.isGridSnap && context.input.isDragging && !context.isScratcOwner()) context.snapToGrid();
  context.cancel();
  context.onend.emit(e as PointerEvent);
}

export function handleContextMenu(context: MovableInteractionContext, e: MouseEvent | TouchEvent): void {
  if (context.isDisable()) return context.cancel();
  if (e.cancelable) e.preventDefault();

  if (context.isGridSnap && context.input.isDragging) context.snapToGrid();

  const needsDispatch = context.input.isGrabbing && e.isTrusted;
  context.cancel();

  if (needsDispatch) {
    e.stopPropagation();
    const ev = new MouseEvent(e.type, e);
    context.nativeElement.dispatchEvent(ev);
  }
}
