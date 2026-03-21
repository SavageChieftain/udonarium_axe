import { Injectable } from '@angular/core';

import { EventSystem } from '@axe/core/system';

export interface AppConfig {
  backend: {
    url: string;
  };
}

@Injectable()
export class AppConfigService {
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
        console.info('config.json が見つかりません。config.json.example を参考に作成してください。');
      }
    } catch (e) {
      console.warn('config.json の読み込みに失敗しました', e);
    }
    EventSystem.trigger('LOAD_CONFIG', AppConfigService.appConfig);
  }
}
