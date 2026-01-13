/**
 * Development-only logger utility
 * Automatically disabled in production builds to improve performance
 * and prevent exposing internal logic in browser console
 */

const isDev = import.meta.env.DEV;

export const logger = {
  /**
   * Log general information (disabled in production)
   */
  log: (...args: unknown[]) => {
    if (isDev) {
      console.log(...args);
    }
  },

  /**
   * Log warnings (disabled in production)
   */
  warn: (...args: unknown[]) => {
    if (isDev) {
      console.warn(...args);
    }
  },

  /**
   * Log errors (enabled in production for monitoring)
   */
  error: (...args: unknown[]) => {
    console.error(...args);
  },

  /**
   * Log debug information (disabled in production)
   */
  debug: (...args: unknown[]) => {
    if (isDev) {
      console.debug(...args);
    }
  },

  /**
   * Log info (disabled in production)
   */
  info: (...args: unknown[]) => {
    if (isDev) {
      console.info(...args);
    }
  },

  /**
   * Log with group (disabled in production)
   */
  group: (label: string, ...args: unknown[]) => {
    if (isDev) {
      console.group(label);
      console.log(...args);
      console.groupEnd();
    }
  },

  /**
   * Log table data (disabled in production)
   */
  table: (data: unknown) => {
    if (isDev) {
      console.table(data);
    }
  },

  /**
   * Prefixed logging for specific modules
   */
  module: (name: string) => ({
    log: (...args: unknown[]) => isDev && console.log(`[${name}]`, ...args),
    warn: (...args: unknown[]) => isDev && console.warn(`[${name}]`, ...args),
    error: (...args: unknown[]) => console.error(`[${name}]`, ...args),
    debug: (...args: unknown[]) => isDev && console.debug(`[${name}]`, ...args),
    info: (...args: unknown[]) => isDev && console.info(`[${name}]`, ...args),
  }),
};
