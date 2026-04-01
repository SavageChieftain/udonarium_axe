import { CommonModule } from '@angular/common';
import { APP_INITIALIZER, enableProdMode, importProvidersFrom, provideZonelessChangeDetection } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { bootstrapApplication, BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { YouTubePlayerModule } from '@angular/youtube-player';
import { AppComponent } from '@axe/app.component';
import { AppConfigService } from '@axe/core/app/app-config.service';
import { AppInitializationService } from '@axe/core/app/app-initialization.service';
import { CLASS_SINGLETON_PROVIDERS } from '@axe/core/di/class-provider';
import { ServiceLocator } from '@axe/core/di/service-locator';
import { PointerDeviceService } from '@axe/core/input/pointer-device.service';
import { Logger } from '@axe/core/logging/logger';
import { LoggerService } from '@axe/core/logging/logger.service';
import { ChatMessageService } from '@axe/shared/chat/chat-message.service';
import { GameObjectInventoryService } from '@axe/shared/inventory/game-object-inventory.service';
import { TabletopService } from '@axe/shared/tabletop/tabletop.service';
import { ContextMenuService } from '@axe/shared/ui/context-menu.service';
import { ModalService } from '@axe/shared/ui/modal.service';
import { PanelService } from '@axe/shared/ui/panel.service';
import { environment } from '@env/environment';
import { NgSelectModule } from '@ng-select/ng-select';

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
