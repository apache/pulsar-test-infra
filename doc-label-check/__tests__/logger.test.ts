import { LoggingLevel, Logger } from '../src/logger';

describe(Logger.name, (): void => {
  let logger: Logger;
  let consoleLogSpy: jest.SpyInstance<void, [any?, ...any[]]>;

  beforeAll((): void => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach((): void => {
    consoleLogSpy.mockReset();
  });

  afterAll((): void => {
    consoleLogSpy.mockRestore();
  });

  test('LoggingLevel: DEBUG', (): void => {
    logger = new Logger(LoggingLevel.DEBUG);
    logger.debug('a');

    expect(consoleLogSpy).toHaveBeenCalledTimes(1);
    expect(consoleLogSpy).toHaveBeenCalledWith('a');
  });

  test('LoggingLevel: SILENT', (): void => {
    logger = new Logger(LoggingLevel.SILENT);
    logger.debug('a');

    expect(consoleLogSpy).not.toHaveBeenCalled();
  });

  it('setLevel', (): void => {
    logger = new Logger(LoggingLevel.SILENT);
    logger.debug('a');
    logger.setLevel(LoggingLevel.DEBUG);
    logger.debug('b');

    expect(consoleLogSpy).toHaveBeenCalledTimes(1);
    expect(consoleLogSpy).toHaveBeenCalledWith('b');
  });
});
