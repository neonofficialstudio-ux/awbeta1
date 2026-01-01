
import { config } from "./config";

/**
 * Smart Logger V2.0
 * Silences non-critical logs in production environment.
 */
export const logger = {
  info: (...args: any[]) => {
    if (!config.isProduction) {
      console.log("[INFO]", ...args);
    }
  },
  
  warn: (...args: any[]) => {
    // Warnings are kept in prod but minimized, or sent to telemetry
    console.warn("[WARN]", ...args);
  },
  
  error: (...args: any[]) => {
    // Errors are always logged and should be captured by telemetry
    console.error("[ERROR]", ...args);
  },
  
  debug: (...args: any[]) => {
    if (!config.isProduction) {
      console.debug("[DEBUG]", ...args);
    }
  },
  
  // Trace performance in dev only
  trace: (label: string, time: number) => {
      if (!config.isProduction) {
          console.debug(`[PERF] ${label}: ${time.toFixed(2)}ms`);
      }
  }
};
