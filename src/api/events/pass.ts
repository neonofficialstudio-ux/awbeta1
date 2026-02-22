// src/api/events/pass.ts
// Supabase-only stub. Events were removed from production.
// Keep exports/signatures to avoid breaking existing imports.

import type { EventPassType } from "../../types";
import { EventSessionEngine } from "./session";

type DisabledResponse = { success: false; disabled: true; error: string };

const disabled = (msg = "Eventos desativados"): DisabledResponse => ({
  success: false,
  disabled: true,
  error: msg,
});

export const EventPassEngine = {
  purchaseEventPass: (userId: string, eventId: string, passType: EventPassType) => {
    void userId;
    void eventId;
    void passType;
    return disabled("Eventos foram descontinuados (Supabase-only).");
  },

  verifyPass: (userId: string, eventId: string): EventPassType | null => {
    // keep behavior consistent with old contract: relies on EventSessionEngine
    const session = EventSessionEngine.loadEventSession(userId);
    if (session && session.eventId === eventId) return session.passType;
    return null;
  },

  getPassBenefits: (passType: EventPassType) => {
    // Keep old shape (used by UI in legacy flows if any).
    if (passType === "vip") {
      return {
        xpMultiplier: 1.5,
        exclusiveMissions: true,
        dailyBoosters: true,
        vipRanking: true,
      };
    }
    return {
      xpMultiplier: 1.0,
      exclusiveMissions: false,
      dailyBoosters: false,
      vipRanking: false,
    };
  },
};
