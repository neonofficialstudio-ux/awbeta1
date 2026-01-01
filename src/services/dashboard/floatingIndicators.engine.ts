
import type { User } from "../../types";

export const FloatingIndicatorsEngine = {
    /**
     * Calculates the stable state for counters to prevent visual resets to 0.
     * Ensures prevValue is valid relative to currentValue.
     */
    calculateCounterState: (currentValue: number, previousValue: number | null | undefined) => {
        // If no previous state (first load), start from 0 or current depending on desired effect.
        // To avoid "jump from 0", we can start from current if it's a reload.
        if (previousValue === null || previousValue === undefined) {
            return { start: currentValue, end: currentValue };
        }

        // If value hasn't changed, maintain static
        if (currentValue === previousValue) {
            return { start: currentValue, end: currentValue };
        }

        // If changed, animate from previous to current
        return { start: previousValue, end: currentValue };
    },

    /**
     * logic to determine if floating indicators should be visible based on scroll or context.
     * (Logic helper for UI components)
     */
    shouldShowIndicators: (scrollY: number, isMobile: boolean) => {
        // Logic: Always show on mobile, show on desktop if scrolled past header
        if (isMobile) return true;
        return scrollY > 100;
    },

    /**
     * Validates if a delta update is safe to display (e.g. not negative for cumulative stats like XP)
     */
    validateDelta: (current: number, next: number, type: 'xp' | 'coins') => {
        if (type === 'xp' && next < current) {
            // XP should generally not decrease. Log warning?
            return current; // Prevent visual regression
        }
        return next;
    }
};
