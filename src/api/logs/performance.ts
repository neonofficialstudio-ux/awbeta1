export type PerformanceLog = {
  type: string;
  source: string;
  details?: Record<string, unknown> | string | number | boolean | null;
};

export const addPerformanceLog = (log: PerformanceLog): void => {
  // Minimal noop logger to keep diagnostics non-blocking
  console.log('[Performance]', log.type, log.source, log.details ?? {});
};
