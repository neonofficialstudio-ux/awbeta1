// src/api/events/session.ts
// Supabase-only stub. Events were removed from production.
// Keep exports/signatures to avoid breaking existing imports.

import type { EventSession, EventPassType, Event } from "../../types";

const disabledSession = (eventId: string, passType: EventPassType): EventSession => ({
  eventId,
  passType,
  startedAt: new Date().toISOString(),
  progress: {},
  rewardsClaimed: [],
  boostersActive: [],
  score: 0,
});

export const EventSessionEngine = {
  // No active events in Supabase-only mode
  getActiveEvent: (): Event | undefined => {
    return undefined;
  },

  // Keep signature, but do not persist anything (no repo/localStorage).
  startEventSession: (userId: string, eventId: string, passType: EventPassType): EventSession => {
    void userId; // explicit unused
    return disabledSession(eventId, passType);
  },

  // No session persistence in Supabase-only mode
  loadEventSession: (userId: string): EventSession | null => {
    void userId;
    return null;
  },

  clearEventSession: (userId: string) => {
    void userId;
    // no-op
  },

  updateProgress: (userId: string, missionId: string) => {
    void userId;
    void missionId;
    return null;
  },
};
