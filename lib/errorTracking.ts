/**
 * FlashRide Error Tracking
 *
 * Lightweight error logger that:
 * 1. Logs to console in dev
 * 2. Writes to Supabase `error_logs` table in production
 * 3. Captures global JS errors via ErrorUtils
 *
 * To integrate a real service (Sentry, Bugsnag) later,
 * just replace the `reportToRemote` function below.
 */

import Constants from 'expo-constants';
import { supabase } from './supabase';

const IS_DEV = __DEV__;
const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';

export type ErrorContext = Record<string, string | number | boolean | null | undefined>;

// ── Internal reporter ─────────────────────────────────────────────────────────

async function reportToRemote(
  level: 'error' | 'warn' | 'info',
  message: string,
  context: ErrorContext = {}
) {
  if (IS_DEV) return; // Only log remotely in production builds
  try {
    await supabase.from('error_logs').insert({
      level,
      message: message.slice(0, 500),
      context,
      app_version: APP_VERSION,
      created_at: new Date().toISOString(),
    });
  } catch (_) {
    // Never throw from the error logger itself
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export const logger = {
  error(message: string, error?: unknown, context: ErrorContext = {}) {
    const msg = error instanceof Error
      ? `${message}: ${error.message}`
      : message;
    console.error('[FlashRide]', msg, error ?? '');
    reportToRemote('error', msg, {
      ...context,
      stack: error instanceof Error ? (error.stack?.slice(0, 300) ?? '') : '',
    });
  },

  warn(message: string, context: ErrorContext = {}) {
    console.warn('[FlashRide]', message);
    reportToRemote('warn', message, context);
  },

  info(message: string, context: ErrorContext = {}) {
    if (IS_DEV) console.info('[FlashRide]', message);
    reportToRemote('info', message, context);
  },
};

// ── Global JS error handler ───────────────────────────────────────────────────

export function setupGlobalErrorHandler() {
  const previous = ErrorUtils.getGlobalHandler();
  ErrorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
    logger.error(
      isFatal ? '[FATAL]' : '[UNHANDLED]',
      error,
      { isFatal: isFatal ?? false }
    );
    previous(error, isFatal);
  });
}
