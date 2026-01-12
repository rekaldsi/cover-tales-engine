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
  log: (...args: any[]) => {
    if (isDev) {
      console.log(...args);
    }
  },

  /**
   * Log warnings (disabled in production)
   */
  warn: (...args: any[]) => {
    if (isDev) {
      console.warn(...args);
    }
  },

  /**
   * Log errors (enabled in production for monitoring)
   */
  error: (...args: any[]) => {
    console.error(...args);
  },

  /**
   * Log debug information (disabled in production)
   */
  debug: (...args: any[]) => {
    if (isDev) {
      console.debug(...args);
    }
  },

  /**
   * Log with group (disabled in production)
   */
  group: (label: string, ...args: any[]) => {
    if (isDev) {
      console.group(label);
      console.log(...args);
      console.groupEnd();
    }
  },

  /**
   * Log table data (disabled in production)
   */
  table: (data: any) => {
    if (isDev) {
      console.table(data);
    }
  },
};
