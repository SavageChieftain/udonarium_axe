import { ChatTab } from '@axe/domain/chat/chat-tab';
import { buildChatTabContextMenu } from '@axe/features/chat/chat-window/chat-tab-context-menu';

const translate = (key: string, params?: Record<string, unknown>) =>
  key === 'feature.chat.stream.open' ? `open:${params?.['name']}` : key;

function tab(name: string): ChatTab {
  const chatTab = new ChatTab();
  chatTab.initialize();
  chatTab.name = name;
  return chatTab;
}

describe('buildChatTabContextMenu()', () => {
  it('offers to watch the tab in a window of its own', () => {
    const menu = buildChatTabContextMenu(tab('メインタブ'), false, { onToggleStream: () => undefined }, translate);

    expect(menu).toHaveLength(1);
    expect(menu[0].name).toBe('open:メインタブ');
  });

  it('offers to put that window away once it is up', () => {
    const menu = buildChatTabContextMenu(tab('メインタブ'), true, { onToggleStream: () => undefined }, translate);

    expect(menu[0].name).toBe('feature.chat.stream.close');
  });

  it('calls back rather than acting on the tab itself', () => {
    let toggled = 0;
    const menu = buildChatTabContextMenu(tab('メインタブ'), false, { onToggleStream: () => toggled++ }, translate);

    menu[0].action?.();

    expect(toggled).toBe(1);
  });
});
