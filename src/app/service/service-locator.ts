import { Injector } from '@angular/core';

/**
 * GameObjectクラス群（Angular管理外）からDI済みサービスにアクセスするための過渡的ブリッジ。
 * Phase 3以降でドメインモデルがサービスを呼ぶ必要がある場面で使用する。
 * Angular管理下のコンポーネント/サービスでは inject() を使うこと。
 */
export class ServiceLocator {
  private static injector: Injector;

  static init(injector: Injector): void {
    ServiceLocator.injector = injector;
  }

  static get<T>(token: abstract new (...args: never[]) => T): T {
    if (!ServiceLocator.injector) {
      throw new Error('[ServiceLocator] Injector が未初期化です。bootstrapApplication 後に init() してください。');
    }
    return ServiceLocator.injector.get(token);
  }
}
