export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4,
}

const LOG_LEVEL_LABELS: Record<LogLevel, string> = {
  [LogLevel.DEBUG]: 'DEBUG',
  [LogLevel.INFO]: 'INFO',
  [LogLevel.WARN]: 'WARN',
  [LogLevel.ERROR]: 'ERROR',
  [LogLevel.NONE]: '',
};

export class Logger {
  private static level: LogLevel = LogLevel.DEBUG;

  static setLevel(level: LogLevel): void {
    Logger.level = level;
  }

  static getLevel(): LogLevel {
    return Logger.level;
  }

  static debug(message: string, ...args: unknown[]): void {
    if (Logger.level <= LogLevel.DEBUG) {
      console.debug(`[${LOG_LEVEL_LABELS[LogLevel.DEBUG]}] ${message}`, ...args);
    }
  }

  static info(message: string, ...args: unknown[]): void {
    if (Logger.level <= LogLevel.INFO) {
      console.info(`[${LOG_LEVEL_LABELS[LogLevel.INFO]}] ${message}`, ...args);
    }
  }

  static warn(message: string, ...args: unknown[]): void {
    if (Logger.level <= LogLevel.WARN) {
      console.warn(`[${LOG_LEVEL_LABELS[LogLevel.WARN]}] ${message}`, ...args);
    }
  }

  static error(message: string, ...args: unknown[]): void {
    if (Logger.level <= LogLevel.ERROR) {
      console.error(`[${LOG_LEVEL_LABELS[LogLevel.ERROR]}] ${message}`, ...args);
    }
  }
}
