
import { addPerformanceLog } from '../logs/performance';

let failureMode = false;

/**
 * Enables the network failure simulation mode.
 */
export function enableFailureMode() {
    if (!failureMode) {
        failureMode = true;
        addPerformanceLog({ type: 'system', source: 'network_failure', details: { action: 'mode_change', mode: 'ENABLED', timestamp: Date.now() } });
        console.warn('%c[NETWORK] Failure Mode Enabled', 'color: red; font-weight: bold;');
    }
}

/**
 * Disables the network failure simulation mode.
 */
export function disableFailureMode() {
    if (failureMode) {
        failureMode = false;
        addPerformanceLog({ type: 'system', source: 'network_failure', details: { action: 'mode_change', mode: 'DISABLED', timestamp: Date.now() } });
        console.info('%c[NETWORK] Failure Mode Disabled', 'color: green; font-weight: bold;');
    }
}

/**
 * Checks if failure mode is currently active.
 */
export function isFailureModeEnabled() {
    return failureMode;
}

/**
 * Randomly throws an error or causes a timeout if failure mode is enabled.
 * Failure rate is between 10% and 20%.
 */
export async function maybeFailRequest(): Promise<void> {
    if (!failureMode) return;

    // 15% chance of failure
    if (Math.random() > 0.15) return;

    const failureType = Math.floor(Math.random() * 3);

    // 0: Timeout (delay 4-8s then throw)
    // 1: Simple Generic Error
    // 2: 500 Internal Server Error

    if (failureType === 0) {
        const delay = 4000 + Math.random() * 4000; // 4s to 8s
        await new Promise(resolve => setTimeout(resolve, delay));
        throw new Error("Simulated Timeout");
    } else if (failureType === 1) {
        throw new Error("Simulated Network Failure");
    } else {
        throw new Error("Simulated 500 Internal Server Error");
    }
}
