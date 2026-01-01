
// api/events/countdownEngine.ts

export const CountdownEngine = {
    /**
     * Calculates the remaining time for an event.
     * Returns formatted strings for UI (DD, HH, MM, SS).
     */
    getTimeRemaining: (targetDateStr: string) => {
        const total = Date.parse(targetDateStr) - Date.now();
        
        if (total <= 0) {
             return {
                total: 0,
                days: '00',
                hours: '00',
                minutes: '00',
                seconds: '00',
                isExpired: true
            };
        }

        const seconds = Math.floor((total / 1000) % 60);
        const minutes = Math.floor((total / 1000 / 60) % 60);
        const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
        const days = Math.floor(total / (1000 * 60 * 60 * 24));

        return {
            total,
            days: days.toString().padStart(2, '0'),
            hours: hours.toString().padStart(2, '0'),
            minutes: minutes.toString().padStart(2, '0'),
            seconds: seconds.toString().padStart(2, '0'),
            isExpired: false
        };
    },

    /**
     * Determines the current status of an event based on start/end dates.
     * Used to synchronize UI badges and buttons.
     */
    getEventStatus: (startDate?: string, endDate?: string): 'future' | 'current' | 'past' => {
        const now = Date.now();
        
        // Check End Date first (Has it ended?)
        if (endDate) {
            const end = Date.parse(endDate);
            if (now > end) return 'past';
        }

        // Check Start Date (Has it started?)
        if (startDate) {
            const start = Date.parse(startDate);
            if (now < start) return 'future';
        }

        // If no end date is provided, it defaults to current if start date passed or no start date.
        // This keeps events "open" by default if configured loosely.
        return 'current';
    },

    /**
     * Formats a date string for display consistency across the app.
     */
    formatDateDisplay: (dateStr: string): string => {
        try {
            return new Date(dateStr).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (e) {
            return dateStr; // Fallback
        }
    }
};
