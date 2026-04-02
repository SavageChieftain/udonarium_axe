import { SyncObject, SyncVar } from '@axe/core/sync/decorator';
import { ObjectNode } from '@axe/core/sync/object-node';
import { InnerXml } from '@axe/core/sync/object-serializer';
import { ObjectStore } from '@axe/core/sync/object-store';
import { ChatLogExporter } from '@axe/domain/chat/chat-log-exporter';
import { ChatTab } from '@axe/domain/chat/chat-tab';
import { ReloadCheck } from '@axe/domain/shared/reload-check';

@SyncObject('chat-tab-list')
export class ChatTabList extends ObjectNode implements InnerXml {
  @SyncVar() _systemMessageTabIndex: number = 0;
  set systemMessageTabIndex(index: number) {
    this._systemMessageTabIndex = index;
  }

  get systemMessageTabIndex(): number {
    return this._systemMessageTabIndex;
  }

  get systemMessageTab(): ChatTab | null {
    return this.chatTabs.length > this.systemMessageTabIndex ? this.chatTabs[this.systemMessageTabIndex] : null;
  }

  get reloadCheck(): ReloadCheck {
    return ObjectStore.instance.get<ReloadCheck>('ReloadCheck')!;
  }

  public tachieHeightValue = 200;
  public minTachieSize = 100;
  public maxTachieSize = 500;
  public isTachieInWindow = false;
  public isKeepTachieOutWindow = false;

  private static _instance: ChatTabList;
  static get instance(): ChatTabList {
    if (!ChatTabList._instance) {
      ChatTabList._instance = new ChatTabList('ChatTabList');
      ChatTabList._instance.initialize();
    }
    return ChatTabList._instance;
  }

  get chatTabs(): ChatTab[] {
    return this.children as ChatTab[];
  }

  //チャット簡易表示フラグ、拡張余地のため整数型
  private simpleDispFlagTime_: number = 0;
  set simpleDispFlagTime(flag: number) {
    this.simpleDispFlagTime_ = flag;
  }

  get simpleDispFlagTime(): number {
    return this.simpleDispFlagTime_;
  }

  private simpleDispFlagUserId_: number = 0;
  set simpleDispFlagUserId(flag: number) {
    this.simpleDispFlagUserId_ = flag;
  }
  get simpleDispFlagUserId(): number {
    return this.simpleDispFlagUserId_;
  }

  addChatTab(arg: ChatTab | string, identifier?: string): ChatTab {
    let chatTab: ChatTab;
    if (arg instanceof ChatTab) {
      chatTab = arg;
    } else {
      chatTab = new ChatTab(identifier);
      chatTab.name = arg;
      chatTab.initialize();
    }
    return this.appendChild(chatTab)!;
  }

  parseInnerXml(element: Element) {
    const reLoadOk = this.reloadCheck.answerCheck();

    if (reLoadOk) {
      // XMLからの新規作成を許可せず、既存のオブジェクトを更新する
      for (const child of ChatTabList.instance.children) {
        child.destroy();
      }

      const context = ChatTabList.instance.toContext();
      context.syncData = this.toContext().syncData;
      ChatTabList.instance.apply(context);
      ChatTabList.instance.update();

      super.parseInnerXml.apply(ChatTabList.instance, [element]);
      this.destroy();
    }
  }

  logHtml(): string {
    return ChatLogExporter.exportAllTabsHtml(this.chatTabs, this.simpleDispFlagTime);
  }

  logHtmlCoc(): string {
    return ChatLogExporter.exportAllTabsHtmlCoc(this.chatTabs);
  }
}
