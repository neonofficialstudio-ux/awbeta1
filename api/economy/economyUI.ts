
/**
 * Helper to manage the state of animated counters.
 * Prevents the counter from resetting to 0 on re-renders by tracking previous known values.
 */
export const EconomyUI = {
    calculateCounterState: (currentTotal: number, previousTotal: number | null) => {
        // If no previous state, start from 0 animation (first load)
        if (previousTotal === null) {
            return { start: 0, end: currentTotal };
        }

        // If value hasn't changed, maintain static
        if (currentTotal === previousTotal) {
            return { start: currentTotal, end: currentTotal };
        }

        // If changed, animate from previous to current
        return { start: previousTotal, end: currentTotal };
    }
};
