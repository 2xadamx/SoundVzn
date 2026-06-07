import fs from 'node:fs';
import path from 'node:path';

/**
 * Enterprise Logger
 * Persists logs to disk for audit and debugging.
 */
export class Logger {
    private static logDir = path.join(process.cwd(), '.soundvzn_data', 'logs');
    
    private static init() {
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
    }

    private static write(level: string, message: string, meta?: any) {
        this.init();
        const date = new Date().toISOString().split('T')[0];
        const logFile = path.join(this.logDir, `${date}.log`);
        const entry = {
            timestamp: new Date().toISOString(),
            level,
            message,
            meta
        };
        fs.appendFileSync(logFile, JSON.stringify(entry) + '\n');
        
        if (process.env.NODE_ENV === 'development') {
            const color = level === 'ERROR' ? '\x1b[31m' : (level === 'WARN' ? '\x1b[33m' : '\x1b[36m');
            console.log(`${color}[${level}]\x1b[0m ${message}`);
        }
    }

    public static info(msg: string, meta?: any) { this.write('INFO', msg, meta); }
    public static warn(msg: string, meta?: any) { this.write('WARN', msg, meta); }
    public static error(msg: string, meta?: any) { this.write('ERROR', msg, meta); }
}
