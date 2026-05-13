import { inject, Injectable } from '@angular/core';
import { emitLoadConfig } from '@axe/core/event/domain-events';
import { LoggerService } from '@axe/core/logging/logger.service';

export interface AppConfig {
  backend: {
    url: string;
  };
}

@Injectable()
export class AppConfigService {
  private readonly logger = inject(LoggerService);

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
    emitLoadConfig({ config: AppConfigService.appConfig });
  }
}
