export enum LoggingLevel {
  DEBUG,
  SILENT,
}

export class Logger {
  constructor(private level: LoggingLevel = 0) {}

  /* eslint-disable @typescript-eslint/no-explicit-any */
  private log(message?: any, ...optionalParams: any[]): void {
    console.log(message, ...optionalParams);
  }

  private shouldLog(level: LoggingLevel): boolean {
    return this.level <= level;
  }

  /* eslint-disable @typescript-eslint/no-explicit-any */
  /* eslint-disable @typescript-eslint/explicit-module-boundary-types */
  debug(message?: any, ...optionalParams: any[]): void {
    if (this.shouldLog(LoggingLevel.DEBUG)) {
      this.log(message, ...optionalParams);
    }
  }

  setLevel(newLevel: LoggingLevel): void {
    this.level = newLevel;
  }
}
