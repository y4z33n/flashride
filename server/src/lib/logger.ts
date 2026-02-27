import { config } from '../config';

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  [key: string]: unknown;
}

/**
 * Minimal structured logger.
 * Dev:  human-readable with colours.
 * Prod: single-line JSON (ready for log aggregators like Datadog/Logtail).
 */
function log(level: LogLevel, message: string, meta: Record<string, unknown> = {}): void {
  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...meta,
  };

  if (config.server.isProd) {
    // JSON output — one line per log entry, easy to parse
    process.stdout.write(JSON.stringify(entry) + '\n');
    return;
  }

  // Dev: coloured, readable
  const colours: Record<LogLevel, string> = {
    info: '\x1b[36m',   // cyan
    warn: '\x1b[33m',   // yellow
    error: '\x1b[31m',  // red
    debug: '\x1b[90m',  // grey
  };
  const reset = '\x1b[0m';
  const colour = colours[level];
  const metaStr = Object.keys(meta).length ? ' ' + JSON.stringify(meta) : '';
  console.log(`${colour}[${level.toUpperCase()}]${reset} ${entry.timestamp} — ${message}${metaStr}`);
}

export const logger = {
  info:  (msg: string, meta?: Record<string, unknown>) => log('info',  msg, meta),
  warn:  (msg: string, meta?: Record<string, unknown>) => log('warn',  msg, meta),
  error: (msg: string, meta?: Record<string, unknown>) => log('error', msg, meta),
  debug: (msg: string, meta?: Record<string, unknown>) => log('debug', msg, meta),
};
