// src/api/events/liveArenaEngine.ts
// Supabase-only stub. Events were removed from production.
// Keep exports/signatures to avoid breaking existing imports.

import type { ArenaStatus } from "../../types/event";

export const LiveArenaEngine = {
  getStatus: (eventId: string): ArenaStatus => {
    void eventId;

    return {
      capacity: 0,
      current: 0,
      percentage: 0,
      isFull: true,
      label: "EVENTOS DESATIVADOS",
      onlineCount: 0,
    };
  },

  checkAvailability: (eventId: string): boolean => {
    void eventId;
    return false;
  },

  getLiveViewers: (eventId: string): number => {
    void eventId;
    return 0;
  },
};
