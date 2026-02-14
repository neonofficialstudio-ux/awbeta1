import { ProfileSupabase } from '../api/supabase/profile';
import { fetchMyNotifications, fetchMyLedger } from '../api/supabase/economy';
import { config } from './config';

type Dispatch = (action: any) => void;

export async function refreshAfterEconomyAction(userId: string, dispatch: Dispatch, reason?: string) {
  if (!config.isProduction) {
    console.groupCollapsed(`[refreshAfterEconomyAction] reason=${reason ?? 'unknown'}`);
    console.trace();
    console.groupEnd();
  }

  if (!userId) return { user: null, notifications: [], ledger: [] };

  // Throttle global para evitar spam em focus/visibility
  // (ex: quando algum listener dispara múltiplas vezes ao voltar para a aba)
  const now = Date.now();
  (globalThis as any).__aw_lastEconomyRefreshAt = (globalThis as any).__aw_lastEconomyRefreshAt || 0;

  const last = (globalThis as any).__aw_lastEconomyRefreshAt as number;
  const THROTTLE_MS = 5000;

  if (now - last < THROTTLE_MS) {
    if (!config.isProduction) {
      console.log('[refreshAfterEconomyAction] throttled', { reason, sinceMs: now - last });
    }
    return { user: null, notifications: [], ledger: [] };
  }

  (globalThis as any).__aw_lastEconomyRefreshAt = now;

  // 1) Profile (coins/xp/level) — determinístico
  let updatedUser: any = null;
  try {
    const profileRes = await ProfileSupabase.fetchMyProfile(userId, { bypassCache: true });
    if (profileRes?.success && profileRes.user) {
      updatedUser = profileRes.user;
      dispatch({ type: 'UPDATE_USER', payload: profileRes.user });
    }
  } catch {}

  // 2) Notifications — não pode quebrar
  let notifications: any[] = [];
  try {
    const nRes: any = await fetchMyNotifications(20, { userId, bypassCache: true });
    notifications = nRes?.success && Array.isArray(nRes.notifications) ? nRes.notifications : [];
    if (notifications.length) {
      dispatch({ type: 'ADD_NOTIFICATIONS', payload: notifications });
    }
  } catch {}

  // 3) Ledger — retorno para páginas que precisem atualizar UI local
  let ledger: any[] = [];
  try {
    const lRes: any = await fetchMyLedger(20, 0, { userId, bypassCache: true });
    ledger = lRes?.success && Array.isArray(lRes.ledger) ? lRes.ledger : [];
    dispatch({ type: 'SET_LEDGER', payload: ledger });
  } catch {}

  return { user: updatedUser, notifications, ledger };
}
