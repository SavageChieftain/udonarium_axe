import { CommonModule } from '@angular/common';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { APP_INITIALIZER, enableProdMode, importProvidersFrom, provideZonelessChangeDetection } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { bootstrapApplication, BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { YouTubePlayerModule } from '@angular/youtube-player';
import { AppComponent } from '@axe/app.component';
import { ChatMessageService } from '@axe/application/chat/chat-message.service';
import { LanguageService } from '@axe/application/i18n/language.service';
import { transLocoConfig } from '@axe/application/i18n/transloco.config';
import { TranslocoHttpLoader } from '@axe/application/i18n/transloco-http-loader';
import { GameObjectInventoryService } from '@axe/application/inventory/game-object-inventory.service';
import { TabletopService } from '@axe/application/tabletop/tabletop.service';
import { ContextMenuService } from '@axe/application/ui/context-menu.service';
import { ModalService } from '@axe/application/ui/modal.service';
import { PanelService } from '@axe/application/ui/panel.service';
import { AppConfigService } from '@axe/composition/app-config.service';
import { AppInitializationService } from '@axe/composition/app-initialization.service';
import { CLASS_SINGLETON_PROVIDERS } from '@axe/composition/class-provider';
import { ServiceLocator } from '@axe/core/di/service-locator';
import { PointerDeviceService } from '@axe/core/input/pointer-device.service';
import { Logger } from '@axe/core/logging/logger';
import { LoggerService } from '@axe/core/logging/logger.service';
import { environment } from '@env/environment';
import { provideTransloco } from '@jsverse/transloco';
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
    provideHttpClient(withXhr()),
    provideTransloco({ config: transLocoConfig, loader: TranslocoHttpLoader }),
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
      useFactory: (service: LanguageService) => () => service.initialize(),
      deps: [LanguageService],
      multi: true,
    },
    {
      provide: APP_INITIALIZER,
      useFactory: (service: AppInitializationService) => () => service.initialize(),
      deps: [AppInitializationService],
      multi: true,
    },
  ],
})
  .then((appRef) => ServiceLocator.init(appRef.injector))
  .catch((err) => Logger.error('[Bootstrap] failed to bootstrap application', err));
