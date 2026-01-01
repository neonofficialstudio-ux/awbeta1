
import { AppState } from './state.types';

export const selectUser = (state: AppState) => state.activeUser;
export const selectIsAuthenticated = (state: AppState) => !!state.activeUser;

export const selectEconomy = (state: AppState) => ({
    coins: state.activeUser?.coins || 0,
    xp: state.activeUser?.xp || 0,
    prevCoins: state.prevCoins,
    prevXp: state.prevXp
});
export const selectCoins = (state: AppState) => state.activeUser?.coins || 0;
export const selectPrevCoins = (state: AppState) => state.prevCoins;

export const selectMissions = (state: AppState) => ({
    weekly: state.missionsWeekly,
    event: state.missionsEvent
});
export const selectRanking = (state: AppState) => state.rankingGlobal;

export const selectActiveEvent = (state: AppState) => state.events.activeEvent;
export const selectEventSession = (state: AppState) => state.events.session;

export const selectQueue = (state: AppState) => state.queue;

export const selectUI = (state: AppState) => ({
    toasts: state.toasts
});
export const selectToasts = (state: AppState) => state.toasts;
