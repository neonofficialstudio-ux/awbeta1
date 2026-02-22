// src/api/games.ts (wrapper seguro)
// Supabase é a fonte única da verdade (mock proibido). Jackpot ainda não existe no backend.

// API padrão para o front conseguir checar
export const isJackpotEnabled = () => false;

type DisabledResponse = { success: false; disabled: true; message: string };

const disabled = (): DisabledResponse => ({
  success: false,
  disabled: true,
  message: "Jackpot em breve",
});

export const fetchJackpotState = async (...args: any[]) => {
  return disabled();
};

export const buyJackpotTicket = async (...args: any[]) => {
  return disabled();
};

export const buyJackpotTicketsBulk = async (...args: any[]) => {
  return disabled();
};

export const getUserJackpotStats = async (...args: any[]) => {
  return disabled();
};

export const openCyberCrate = async (...args: any[]) => {
  return disabled();
};
