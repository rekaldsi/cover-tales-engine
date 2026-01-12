const isDev = import.meta.env.DEV;

export const logger = {
  log: (...args: unknown[]) => isDev && console.log(...args),
  warn: (...args: unknown[]) => isDev && console.warn(...args),
  error: (...args: unknown[]) => console.error(...args), // Always log errors
  debug: (...args: unknown[]) => isDev && console.debug(...args),
  info: (...args: unknown[]) => isDev && console.info(...args),
  
  // Prefixed logging for specific modules
  module: (name: string) => ({
    log: (...args: unknown[]) => isDev && console.log(`[${name}]`, ...args),
    warn: (...args: unknown[]) => isDev && console.warn(`[${name}]`, ...args),
    error: (...args: unknown[]) => console.error(`[${name}]`, ...args),
    debug: (...args: unknown[]) => isDev && console.debug(`[${name}]`, ...args),
    info: (...args: unknown[]) => isDev && console.info(`[${name}]`, ...args),
  }),
};
