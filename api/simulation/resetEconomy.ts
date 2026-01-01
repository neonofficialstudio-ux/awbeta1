
import { resetUserLoadState } from './userLoadSimulator';
import { resetStressState } from './stressEngine';

/**
 * Resets all internal states of the economy simulation engines.
 * This affects:
 * - User Load Simulator (user counts, timelines)
 * - Stress Engine (metrics, logs)
 * 
 * Does NOT affect:
 * - Mock Data persistence (real mock users, missions, etc.)
 * - Admin logs (unless specifically targeted)
 */
export const resetEconomyState = () => {
    resetUserLoadState();
    resetStressState();
    console.log("%c[AW][RESET] Economy simulation reset complete.", "color: #eab308; font-weight: bold;");
    return "Simulation state reset.";
};
