import fs from 'node:fs';
import path from 'node:path';

type LogLevel = 'INFO' | 'WARN' | 'ERROR';

const logDir = process.env.SOUNDVZN_USER_DATA
  ? path.join(process.env.SOUNDVZN_USER_DATA, 'logs')
  : path.join(process.cwd(), '.soundvzn_data', 'logs');

const logFilePath = path.join(logDir, 'backend.log');

function ensureLogDir() {
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
}

function formatLine(level: LogLevel, message: string) {
  return `[${new Date().toISOString()}] [${level}] ${message}\n`;
}

export function logInfo(message: string) {
  try {
    ensureLogDir();
    fs.appendFileSync(logFilePath, formatLine('INFO', message));
  } catch {
    // noop: logging must never crash backend
  }
}

export function logWarn(message: string) {
  try {
    ensureLogDir();
    fs.appendFileSync(logFilePath, formatLine('WARN', message));
  } catch {
    // noop
  }
}

export function logError(message: string) {
  try {
    ensureLogDir();
    fs.appendFileSync(logFilePath, formatLine('ERROR', message));
  } catch {
    // noop
  }
}
