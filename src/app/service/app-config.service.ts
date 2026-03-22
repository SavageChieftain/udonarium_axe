import { Injectable, inject } from '@angular/core';

import { EventSystem } from '@axe/core/system';
import { LoggerService } from 'service/logger.service';

export interface AppConfig {
  backend: {
    url: string;
  };
}

@Injectable()
export class AppConfigService {
  private logger = inject(LoggerService);

  constructor() {}

  peerHistory: string[] = [];
  isOpen: boolean = false;

  static appConfig: AppConfig = {
    backend: {
      url: '',
    },
  };

  initialize() {
    this.initAppConfig();
  }

  private async initAppConfig() {
    try {
      const response = await fetch('./assets/config.json');
      if (response.ok) {
        const config = await response.json();
        if (config?.backend?.url) {
          AppConfigService.appConfig.backend.url = config.backend.url;
        }
      } else {
        this.logger.info('config.json が見つかりません。config.json.example を参考に作成してください。');
      }
    } catch (e) {
      this.logger.warn('config.json の読み込みに失敗しました', e);
    }
    EventSystem.trigger('LOAD_CONFIG', AppConfigService.appConfig);
  }
}
