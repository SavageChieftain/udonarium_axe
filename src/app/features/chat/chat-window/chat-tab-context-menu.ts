import { TranslateFn } from '@axe/application/i18n/translate.token';
import { ContextMenuAction } from '@axe/application/ui/context-menu.service';
import { ChatTab } from '@axe/domain/chat/chat-tab';

export interface ChatTabMenuCallbacks {
  onToggleStream: () => void;
}

/** What can be done with a tab itself, as opposed to what is said in it. */
export function buildChatTabContextMenu(
  tab: ChatTab,
  isStreamOpen: boolean,
  callbacks: ChatTabMenuCallbacks,
  t: TranslateFn
): ContextMenuAction[] {
  return [
    {
      name: isStreamOpen ? t('feature.chat.stream.close') : t('feature.chat.stream.open', { name: tab.name }),
      action: () => callbacks.onToggleStream(),
    },
  ];
}
