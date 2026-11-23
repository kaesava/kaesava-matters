export const mobileLogger = {
  debug: (...args: unknown[]) => {
    if (typeof __DEV__ !== "undefined" && __DEV__) console.debug(...args);
  },
  info: (...args: unknown[]) => {
    if (typeof __DEV__ !== "undefined" && __DEV__) console.info(...args);
  },
  warn: (...args: unknown[]) => {
    console.warn(...args);
  },
  error: (...args: unknown[]) => {
    console.error(...args);
  },
};

declare const __DEV__: boolean | undefined;
