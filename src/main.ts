import { CommonModule } from '@angular/common';
import { APP_INITIALIZER, enableProdMode, importProvidersFrom, provideZonelessChangeDetection } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { bootstrapApplication, BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { YouTubePlayerModule } from '@angular/youtube-player';
import { AppConfigService } from '@axe/core/app-config.service';
import { AppInitializationService } from '@axe/core/app-initialization.service';
import { CLASS_SINGLETON_PROVIDERS } from '@axe/core/class-provider';
import { Logger } from '@axe/core/logger';
import { LoggerService } from '@axe/core/logger.service';
import { PointerDeviceService } from '@axe/core/pointer-device.service';
import { ServiceLocator } from '@axe/core/service-locator';
import { ChatMessageService } from '@axe/features/chat/chat-message.service';
import { GameObjectInventoryService } from '@axe/features/inventory/game-object-inventory.service';
import { TabletopService } from '@axe/features/tabletop/tabletop.service';
import { ContextMenuService } from '@axe/shared/context-menu.service';
import { ModalService } from '@axe/shared/modal.service';
import { PanelService } from '@axe/shared/panel.service';
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
    {
      provide: APP_INITIALIZER,
      useFactory: (service: AppInitializationService) => () => service.initialize(),
      deps: [AppInitializationService],
      multi: true,
    },
  ],
})
  .then((appRef) => ServiceLocator.init(appRef.injector))
  .catch((err) => Logger.error('[Bootstrap] アプリケーション起動失敗', err));
