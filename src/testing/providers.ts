import { AppConfigService } from 'service/app-config.service';
import { ChatMessageService } from 'service/chat-message.service';
import { ContextMenuService } from 'service/context-menu.service';
import { ModalService } from 'service/modal.service';
import { PanelService } from 'service/panel.service';
import { TabletopService } from 'service/tabletop.service';

// 非 providedIn:'root' なサービスを全コンポーネントテストで利用可能にする
export default [AppConfigService, ChatMessageService, ContextMenuService, ModalService, PanelService, TabletopService];
