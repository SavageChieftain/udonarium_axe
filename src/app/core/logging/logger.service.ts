import { Injectable } from '@angular/core';
import { Logger, LogLevel } from '@axe/core/logging/logger';
import { environment } from '@env/environment';

export { LogLevel } from '@axe/core/logging/logger';

@Injectable()
export class LoggerService {
  constructor() {
    const level = environment.production ? LogLevel.WARN : LogLevel.DEBUG;
    Logger.setLevel(level);
  }

  setLevel(level: LogLevel): void {
    Logger.setLevel(level);
  }

  getLevel(): LogLevel {
    return Logger.getLevel();
  }

  debug(message: string, ...args: unknown[]): void {
    Logger.debug(message, ...args);
  }

  info(message: string, ...args: unknown[]): void {
    Logger.info(message, ...args);
  }

  warn(message: string, ...args: unknown[]): void {
    Logger.warn(message, ...args);
  }

  error(message: string, ...args: unknown[]): void {
    Logger.error(message, ...args);
  }
}
