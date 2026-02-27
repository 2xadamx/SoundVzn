type LogLevel = 'INFO' | 'WARN' | 'ERROR';

function write(level: LogLevel, message: string, meta?: any) {
  try {
    if (window.electron?.log) {
      window.electron.log(level, message, meta);
    }
  } catch {
    // noop
  }
}

export const logInfo = (message: string, meta?: any) => write('INFO', message, meta);
export const logWarn = (message: string, meta?: any) => write('WARN', message, meta);
export const logError = (message: string, meta?: any) => write('ERROR', message, meta);
