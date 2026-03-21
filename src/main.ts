import 'hammerjs';

import { enableProdMode, importProvidersFrom } from '@angular/core';
import { environment } from './environments/environment';
import { AppConfigService } from 'service/app-config.service';
import { ChatMessageService } from 'service/chat-message.service';
import { ContextMenuService } from 'service/context-menu.service';
import { ModalService } from 'service/modal.service';
import { GameObjectInventoryService } from 'service/game-object-inventory.service';
import { PanelService } from 'service/panel.service';
import { PointerDeviceService } from 'service/pointer-device.service';
import { TabletopService } from 'service/tabletop.service';
import { BrowserModule, bootstrapApplication } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LinkyModule } from 'ngx-linky';
import { YouTubePlayerModule } from '@angular/youtube-player';
import { NgSelectModule } from '@ng-select/ng-select';
import { AppComponent } from './app/app.component';

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
      LinkyModule,
      YouTubePlayerModule,
      NgSelectModule
    ),
    AppConfigService,
    ChatMessageService,
    ContextMenuService,
    ModalService,
    GameObjectInventoryService,
    PanelService,
    PointerDeviceService,
    TabletopService,
  ],
}).catch((err) => console.error(err));
