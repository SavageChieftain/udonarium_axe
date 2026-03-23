import { CommonModule } from '@angular/common';
import { enableProdMode, importProvidersFrom, provideZonelessChangeDetection } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { bootstrapApplication, BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { YouTubePlayerModule } from '@angular/youtube-player';
import { Logger } from '@axe/class/core/logger';
import { AppConfigService } from '@axe/service/app-config.service';
import { ChatMessageService } from '@axe/service/chat-message.service';
import { CLASS_SINGLETON_PROVIDERS } from '@axe/service/class-provider';
import { ContextMenuService } from '@axe/service/context-menu.service';
import { GameObjectInventoryService } from '@axe/service/game-object-inventory.service';
import { LoggerService } from '@axe/service/logger.service';
import { ModalService } from '@axe/service/modal.service';
import { PanelService } from '@axe/service/panel.service';
import { PointerDeviceService } from '@axe/service/pointer-device.service';
import { ServiceLocator } from '@axe/service/service-locator';
import { TabletopService } from '@axe/service/tabletop.service';
import { NgSelectModule } from '@ng-select/ng-select';

import { AppComponent } from './app/app.component';
import { environment } from './environments/environment';

if (environment.production) {
  enableProdMode();
}

bootstrapApplication(AppComponent, {
  providers: [
    importProvidersFrom(
      BrowserModule,
      BrowserAnimationsModule,
      CommonModule,
      FormsModule,
      YouTubePlayerModule,
      NgSelectModule
    ),
    provideZonelessChangeDetection(),
    ...CLASS_SINGLETON_PROVIDERS,
    AppConfigService,
    ChatMessageService,
    ContextMenuService,
    LoggerService,
    ModalService,
    GameObjectInventoryService,
    PanelService,
    PointerDeviceService,
    TabletopService,
  ],
})
  .then((appRef) => ServiceLocator.init(appRef.injector))
  .catch((err) => Logger.error('[Bootstrap] アプリケーション起動失敗', err));
