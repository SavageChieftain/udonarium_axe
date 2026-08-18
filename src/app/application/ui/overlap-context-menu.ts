import { TranslateFn } from '@axe/application/i18n/translate.token';
import { ContextMenuAction } from '@axe/application/ui/context-menu.service';
import { TabletopOverlapService } from '@axe/application/ui/tabletop-overlap.service';
import { TabletopObject } from '@axe/domain/tabletop/tabletop-object';
import { moveToBottommost, moveToTopmost, Stackable } from '@axe/domain/tabletop/tabletop-object-util';

const ALIAS_LABEL_KEY: Record<string, string> = {
  terrain: 'feature.tabletop.contextMenu.aliasTerrain',
  character: 'feature.tabletop.contextMenu.aliasCharacter',
  'table-mask': 'feature.tabletop.contextMenu.aliasMask',
  'table-scratch-mask': 'feature.tabletop.contextMenu.aliasScratchMask',
  'text-note': 'feature.tabletop.contextMenu.aliasTextNote',
  range: 'feature.tabletop.contextMenu.aliasRange',
  'dice-symbol': 'feature.tabletop.contextMenu.aliasDiceSymbol',
  coin: 'feature.tabletop.contextMenu.aliasCoin',
  card: 'feature.tabletop.contextMenu.aliasCard',
  'card-stack': 'feature.tabletop.contextMenu.aliasCardStack',
};

function describeObject(obj: TabletopObject, t: TranslateFn): string {
  const aliasLabel = ALIAS_LABEL_KEY[obj.aliasName] ? t(ALIAS_LABEL_KEY[obj.aliasName]) : obj.aliasName;
  const name = obj.name?.trim();
  return name ? `${aliasLabel}: ${name}` : aliasLabel;
}

function asStackable(obj: TabletopObject): Stackable | null {
  return typeof (obj as TabletopObject & { zindex?: unknown }).zindex === 'number' ? (obj as Stackable) : null;
}

export function buildOverlapContextMenu(
  service: TabletopOverlapService,
  current: TabletopObject,
  pointerX: number,
  pointerY: number,
  t: TranslateFn
): ContextMenuAction[] {
  const overlapping = service.findAt(pointerX, pointerY).filter((o) => o.identifier !== current.identifier);
  if (overlapping.length === 0) return [];

  const subActions: ContextMenuAction[] = overlapping.map((obj) => ({
    name: describeObject(obj, t),
    action: () => service.reopenContextMenuFor(obj.identifier, pointerX, pointerY),
  }));

  const entries: ContextMenuAction[] = [
    {
      name: t('feature.tabletop.contextMenu.overlapBelow', { count: overlapping.length }),
      action: undefined,
      subActions,
    },
  ];

  const stackable = asStackable(current);
  if (stackable) {
    entries.push(
      {
        name: t('feature.tabletop.contextMenu.moveToTopmost'),
        action: () => moveToTopmost(stackable),
      },
      {
        name: t('feature.tabletop.contextMenu.moveToBottommost'),
        action: () => moveToBottommost(stackable),
      }
    );
  }

  return entries;
}
