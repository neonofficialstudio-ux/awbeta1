
import { DashboardEngine } from "../../services/dashboard/dashboard.engine";
import { withLatency } from "../helpers";

export const fetchDashboard = (userId: string) => withLatency(() => {
    return DashboardEngine.getDashboardSnapshot(userId);
});

export const syncDashboard = (userId: string) => withLatency(() => {
    // Forced re-sync/calculation if needed
    return DashboardEngine.getDashboardSnapshot(userId);
});

export const performDashboardCheckIn = (userId: string) => withLatency(() => {
    return DashboardEngine.processCheckIn(userId);
});

export const getFloatingIndicators = (userId: string) => {
    // Synchronous direct access for high-frequency UI components if needed
    // or wrapped via withLatency if simulating network
    return DashboardEngine.getFloatingIndicatorsData(userId);
};
