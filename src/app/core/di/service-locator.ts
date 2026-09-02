import { Injector } from '@angular/core';

/**
 * A temporary bridge letting the game object classes, which Angular does not manage, reach an injected service.
 * For the cases where a domain model has to call a service.
 * Anything Angular manages should inject instead.
 */
export class ServiceLocator {
  private static injector: Injector;

  static init(injector: Injector): void {
    ServiceLocator.injector = injector;
  }

  static get<T>(token: abstract new (...args: never[]) => T): T {
    if (!ServiceLocator.injector) {
      throw new Error('[ServiceLocator] The injector is not set; call init() after bootstrapApplication.');
    }
    return ServiceLocator.injector.get(token);
  }
}
