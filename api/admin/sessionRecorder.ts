
// api/admin/sessionRecorder.ts

type SessionEvent = {
  timestamp: number;
  type: string;
  payload: any;
};

let sessionEvents: SessionEvent[] = [];

export function recordEvent(type: string, payload: any): void {
  sessionEvents.push({
    timestamp: Date.now(),
    type,
    payload,
  });
}

export function getSessionEvents(): SessionEvent[] {
  return [...sessionEvents];
}

export function clearSession(): void {
  sessionEvents = [];
}

export function getSummary() {
  const summary: Record<string, number> = {};
  
  sessionEvents.forEach((e) => {
    summary[e.type] = (summary[e.type] || 0) + 1;
  });

  const firstEvent = sessionEvents.length > 0 ? sessionEvents[0].timestamp : undefined;
  const lastEvent = sessionEvents.length > 0 ? sessionEvents[sessionEvents.length - 1].timestamp : undefined;

  return {
    totalEvents: sessionEvents.length,
    byType: summary,
    firstEvent,
    lastEvent,
  };
}
