type StressLog = {
  timestamp: number;
  message: string;
  payload?: Record<string, unknown>;
};

const logs: StressLog[] = [];

export const logStressEvent = (message: string, payload?: Record<string, unknown>): void => {
  logs.push({ timestamp: Date.now(), message, payload });
};

export const getStressLogs = (): StressLog[] => {
  return [...logs];
};

export const clearStressLogs = (): void => {
  logs.length = 0;
};
