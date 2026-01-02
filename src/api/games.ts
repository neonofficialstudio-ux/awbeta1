// src/api/games.ts (wrapper seguro)
import { isSupabaseProvider } from "./core/backendGuard";

// API padrão para o front conseguir checar
export const isJackpotEnabled = () => !isSupabaseProvider();

type DisabledResponse = { success: false; disabled: true; message: string };

const disabled = (): DisabledResponse => ({
  success: false,
  disabled: true,
  message: "Jackpot em breve",
});

// Delegadores: em mock mode, carrega o módulo real sob demanda.
// Em supabase, retorna disabled sem importar mockData.
export const fetchJackpotState = async (...args: any[]) => {
  if (isSupabaseProvider()) return disabled();
  const mod = await import("./games.mock");
  return mod.fetchJackpotState(...args);
};

export const buyJackpotTicket = async (...args: any[]) => {
  if (isSupabaseProvider()) return disabled();
  const mod = await import("./games.mock");
  return mod.buyJackpotTicket(...args);
};

export const buyJackpotTicketsBulk = async (...args: any[]) => {
  if (isSupabaseProvider()) return disabled();
  const mod = await import("./games.mock");
  return mod.buyJackpotTicketsBulk(...args);
};

export const getUserJackpotStats = async (...args: any[]) => {
  if (isSupabaseProvider()) return disabled();
  const mod = await import("./games.mock");
  return mod.getUserJackpotStats(...args);
};

export const openCyberCrate = async (...args: any[]) => {
  if (isSupabaseProvider()) return disabled();
  const mod = await import("./games.mock");
  return mod.openCyberCrate(...args);
};
