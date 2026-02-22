import { isSupabaseProvider } from "../../api/core/backendGuard";
import { getRepository } from "../../api/database/repository.factory";
import type { Event, EventPassType, EventSession } from "../../types";

// Em Supabase mode: NO-OP seguro (fonte da verdade é o backend)
const isSupabase = () => isSupabaseProvider();

// Mantemos o comportamento antigo apenas para mock/dev (não produção)
const repo = getRepository();
const SESSION_STORAGE_KEY = "aw_event_session_v5";

export const EventSessionEngine = {
  getActiveEvent: (): Event | undefined => {
    if (isSupabase()) return undefined;
    const events = repo.select("events") as Event[];
    return events.find((e) => e.status === "current");
  },

  startEventSession: (userId: string, eventId: string, passType: EventPassType): EventSession => {
    if (isSupabase()) {
      // Retorna um session “volátil” sem persistir (evita quebrar chamadas)
      const now = new Date().toISOString();
      return {
        eventId,
        passType,
        startedAt: now,
        progress: {},
        rewardsClaimed: [],
        boostersActive: [],
        score: 0,
      };
    }

    const now = new Date().toISOString();
    const session: EventSession = {
      eventId,
      passType,
      startedAt: now,
      progress: {},
      rewardsClaimed: [],
      boostersActive: [],
      score: 0,
    };

    // Persistência no mock repo
    repo.update("users", (u: any) => u.id === userId, (u: any) => ({ ...u, eventSession: session }));

    // Persistência local (best-effort)
    try {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    } catch {
      // silêncio proposital (não quebra UX)
    }

    return session;
  },

  loadEventSession: (userId: string): EventSession | null => {
    if (isSupabase()) return null;

    const user = repo.select("users").find((u: any) => u.id === userId);
    if (user && user.eventSession) return user.eventSession;
    return null;
  },

  clearEventSession: (userId: string) => {
    if (isSupabase()) return;

    repo.update("users", (u: any) => u.id === userId, (u: any) => ({ ...u, eventSession: null }));
    try {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    } catch {
      // silêncio proposital
    }
  },

  updateProgress: (userId: string, missionId: string) => {
    if (isSupabase()) return null;

    const user = repo.select("users").find((u: any) => u.id === userId);
    if (user && user.eventSession) {
      const updatedSession = {
        ...user.eventSession,
        progress: { ...user.eventSession.progress, [missionId]: true },
      };
      repo.update("users", (u: any) => u.id === userId, (u: any) => ({ ...u, eventSession: updatedSession }));
      return updatedSession;
    }
    return null;
  },
};
