import { getRepository } from "../database/repository.factory";
import { getSupabase } from "../supabase/client";
import { assertSupabaseProvider } from "../core/backendGuard";

const repo = getRepository();

const requireSupabaseClient = () => {
    const client = getSupabase();
    if (!client) throw new Error("[Supabase] Client not initialized");
    return client;
};

export async function adminListTelemetry(limit = 50, offset = 0) {
    assertSupabaseProvider('telemetry.adminListTelemetry');

    const supabase = requireSupabaseClient();
    const { data, error } = await supabase.rpc(
        "admin_list_telemetry_events",
        {
            p_limit: limit,
            p_offset: offset,
            p_event: null,
        }
    );

    if (error) throw error;
    return data?.items ?? [];
}

interface TelemetryMetric {
    name: string;
    value: number;
    timestamp: number;
}

export const TelemetryEngineV5 = {
    captureMetric: (name: string, value: number) => {
        const metric: TelemetryMetric = {
            name,
            value,
            timestamp: Date.now()
        };
        // In a real app, this would go to a timeseries DB. 
        // Here we store in a lightweight in-memory buffer or repurpose a table.
        repo.insert("telemetry", { type: 'metric', category: 'system', details: metric, timestamp: metric.timestamp });
    },

    getSystemHealth: () => {
        // Mock calculation of system health based on error rate
        const logs = repo.select("telemetry");
        const errors = logs.filter((l: any) => l.category === 'error' && l.timestamp > Date.now() - 3600000); // Last hour
        
        return {
            status: errors.length > 10 ? 'degraded' : 'healthy',
            errorCountLastHour: errors.length,
            uptime: typeof process !== 'undefined' && (process as any).uptime ? (process as any).uptime() : 0, // Mock if browser
            lastUpdate: new Date().toISOString()
        };
    },

    getStats: () => {
        const logs = repo.select("telemetry");
        return {
            totalEvents: logs.length,
            errors: logs.filter((l: any) => l.category === 'error').length,
            warnings: logs.filter((l: any) => l.category === 'warning').length,
            actions: logs.filter((l: any) => l.category === 'action').length
        };
    }
};
