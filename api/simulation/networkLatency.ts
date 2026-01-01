
import { addPerformanceLog } from '../logs/performance';

let highLatencyMode = false;

// Normal Mode: ~150ms avg
const NORMAL_BASE = 150;
const NORMAL_JITTER = 120;

// High Latency Mode: ~600ms avg (400-800ms range implied by jitter)
const HIGH_BASE = 600; 
const HIGH_JITTER = 400; 

/**
 * Simulates network delay with jitter.
 * @param base Average delay in ms
 * @param jitter Random variation range in ms
 */
export async function simulateNetworkLatency(base?: number, jitter?: number): Promise<void> {
    const currentBase = base ?? (highLatencyMode ? HIGH_BASE : NORMAL_BASE);
    const currentJitter = jitter ?? (highLatencyMode ? HIGH_JITTER : NORMAL_JITTER);

    // Calculate random delay: Base + (Random * Jitter) - (Jitter / 2)
    // This centers the jitter around the base value.
    const randomVariation = Math.floor(Math.random() * currentJitter) - (currentJitter / 2);
    const finalDelay = Math.max(10, currentBase + randomVariation); // Ensure at least 10ms

    return new Promise(resolve => setTimeout(resolve, finalDelay));
}

export function enableHighLatencyMode() {
    if (!highLatencyMode) {
        highLatencyMode = true;
        addPerformanceLog({ type: 'system', source: 'network_latency', details: { action: 'mode_change', mode: 'HIGH', timestamp: Date.now() } });
        console.info('%c[NETWORK] High Latency Mode Enabled', 'color: orange; font-weight: bold;');
    }
}

export function disableHighLatencyMode() {
    if (highLatencyMode) {
        highLatencyMode = false;
        addPerformanceLog({ type: 'system', source: 'network_latency', details: { action: 'mode_change', mode: 'NORMAL', timestamp: Date.now() } });
        console.info('%c[NETWORK] High Latency Mode Disabled', 'color: green; font-weight: bold;');
    }
}

export function isHighLatencyEnabled() {
    return highLatencyMode;
}
