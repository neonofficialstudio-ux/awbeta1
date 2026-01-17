
import { resetUserLoadState } from './userLoadSimulator';

/**
 * Resets all internal states of the economy simulation engines.
 * This affects:
 * - User Load Simulator (user counts, timelines)
 * 
 * Does NOT affect:
 * - Mock Data persistence (real mock users, missions, etc.)
 * - Admin logs (unless specifically targeted)
 */
export const resetEconomyState = () => {
    resetUserLoadState();
    console.log("%c[AW][RESET] Economy simulation reset complete.", "color: #eab308; font-weight: bold;");
    return "Simulation state reset.";
};
