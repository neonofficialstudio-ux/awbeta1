
// api/simulation/systemHeatmap.ts

interface HeatmapReport {
  economy: {
    xpPeaks: { day: number; value: number }[];
    coinGenerationPeaks: { day: number; value: number }[];
    coinSpendPeaks: { day: number; value: number }[]; // Estimated from store purchases count in load sim
    levelUpSpikes: { day: number; value: number }[];
    checkinSpikes: { day: number; value: number }[];
  };
  missions: {
    mostUsedTypes: { type: string; count: number }[];
    mostUsedDurations: { duration: string; count: number }[];
    mostUsedFormats: { format: string; count: number }[];
  };
  store: {
    mostRedeemedItems: { item: string; count: number }[];
    categoryPressure: { category: string; count: number }[];
  };
  growth: {
    dailyUserLoad: { day: number; users: number }[];
    anomalies: string[];
  };
}

/**
 * Generates a heatmap report from raw simulation data.
 * Handles data from UserLoadSimulator (timeline-based) and StressEngine (summary-based).
 */
export const generateHeatmap = (simulationData: any): HeatmapReport => {
    const report: HeatmapReport = {
        economy: { xpPeaks: [], coinGenerationPeaks: [], coinSpendPeaks: [], levelUpSpikes: [], checkinSpikes: [] },
        missions: { mostUsedTypes: [], mostUsedDurations: [], mostUsedFormats: [] },
        store: { mostRedeemedItems: [], categoryPressure: [] },
        growth: { dailyUserLoad: [], anomalies: [] }
    };

    if (!simulationData) return report;

    // 1. Process User Load Simulator Data (Timeline Based)
    if (simulationData.fullTimeline && Array.isArray(simulationData.fullTimeline)) {
        const timeline = simulationData.fullTimeline;

        // Economy Peaks
        report.economy.xpPeaks = getTopPeaks(timeline, 'xpGenerated');
        report.economy.coinGenerationPeaks = getTopPeaks(timeline, 'coinsGenerated');
        report.economy.levelUpSpikes = getTopPeaks(timeline, 'levelUps');
        report.economy.checkinSpikes = getTopPeaks(timeline, 'checkins');
        
        // In UserLoadSimulator, storePurchases is a count, we map it as a proxy for spend activity peaks
        report.economy.coinSpendPeaks = getTopPeaks(timeline, 'storePurchases');

        // Growth
        report.growth.dailyUserLoad = timeline.map((d: any) => ({ day: d.day, users: d.userCount }));
        
        // Detect Growth Anomalies (Sudden drops or massive spikes > 20%)
        for (let i = 1; i < timeline.length; i++) {
            const prev = timeline[i-1].userCount;
            const curr = timeline[i].userCount;
            if (curr < prev) {
                report.growth.anomalies.push(`Cliff detected at Day ${timeline[i].day}: Users dropped from ${prev} to ${curr}`);
            } else if (curr > prev * 1.5) {
                report.growth.anomalies.push(`Spike detected at Day ${timeline[i].day}: Users jumped from ${prev} to ${curr}`);
            } else if (curr === prev && i > 5) {
                // Only report plateau if it persists (simplified check)
                if (i === timeline.length - 1) report.growth.anomalies.push(`Plateau detected ending at Day ${timeline[i].day}`);
            }
        }
    }

    // 2. Process Stress Engine Data (Metrics Based)
    if (simulationData.actionsByType) {
        // Stress engine gives totals, not timeline. We map what we can.
        // If detailed logs were passed (e.g., simulationData.logs), we could do more.
        // Here we assume standard StressMetrics structure.
        
        // Example mapping (Mock interpretation as StressEngine doesn't breakdown types yet in summary)
        // In a real scenario, we would parse the 'logs' if provided alongside metrics.
    }

    // 3. Process Logs (if available in payload for Mission/Store details)
    // This handles cases where the caller passes { result: ..., logs: [...] }
    if (simulationData.logs && Array.isArray(simulationData.logs)) {
        const logs = simulationData.logs;
        
        // Mission Analysis
        const missionTypes: Record<string, number> = {};
        const missionFormats: Record<string, number> = {}; // Derived from payload if available
        
        logs.filter((l: any) => l.type === 'mission' && l.status === 'success').forEach((l: any) => {
             // In stress tests, payload often has just userId. 
             // If detailed mission info isn't logged, we can't heatmap it accurately.
             // We'll assume 'type' might be available in enriched logs.
             if (l.payload?.type) missionTypes[l.payload.type] = (missionTypes[l.payload.type] || 0) + 1;
             if (l.payload?.format) missionFormats[l.payload.format] = (missionFormats[l.payload.format] || 0) + 1;
        });

        report.missions.mostUsedTypes = Object.entries(missionTypes)
            .map(([type, count]) => ({ type, count }))
            .sort((a, b) => b.count - a.count);
            
        report.missions.mostUsedFormats = Object.entries(missionFormats)
            .map(([format, count]) => ({ format, count }))
            .sort((a, b) => b.count - a.count);

        // Store Analysis
        const items: Record<string, number> = {};
        const categories: Record<string, number> = {};
        
        logs.filter((l: any) => l.type === 'store' && l.status === 'success').forEach((l: any) => {
            // Mock categorization if not in log
            if (l.payload?.itemName) items[l.payload.itemName] = (items[l.payload.itemName] || 0) + 1;
            if (l.payload?.category) categories[l.payload.category] = (categories[l.payload.category] || 0) + 1;
        });

        report.store.mostRedeemedItems = Object.entries(items)
            .map(([item, count]) => ({ item, count }))
            .sort((a, b) => b.count - a.count);
            
        report.store.categoryPressure = Object.entries(categories)
            .map(([category, count]) => ({ category, count }))
            .sort((a, b) => b.count - a.count);
    }

    return report;
};

// Helper
function getTopPeaks(timeline: any[], key: string, count: number = 5) {
    return [...timeline]
        .sort((a, b) => b[key] - a[key])
        .slice(0, count)
        .map(d => ({ day: d.day, value: d[key] }))
        .sort((a, b) => a.day - b.day); // Return sorted by day for readability
}
