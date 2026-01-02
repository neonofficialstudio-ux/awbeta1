
import { getRepository } from "../../api/database/repository.factory";
import { TelemetryEngineV5 } from "../../api/admin/telemetryEngineV5";
import { LogEngineV4 } from "../../api/admin/logEngineV4";

const repo = getRepository();

export const HealthCheck = {
    runFullScan: () => {
        const issues: string[] = [];
        let status: "stable" | "warning" | "critical" = "stable";

        // 1. DB Access
        try {
            const users = repo.select("users");
            if (!Array.isArray(users)) throw new Error("Users repository invalid");
        } catch (e: any) {
            issues.push(`DB Access Failed: ${e.message}`);
            status = "critical";
        }

        // 2. Telemetry Health
        const sysHealth = TelemetryEngineV5.getSystemHealth();
        if (sysHealth.status !== 'healthy') {
            issues.push(`Telemetry reports degraded status: ${sysHealth.errorCountLastHour} errors last hour.`);
            if (status !== "critical") status = "warning";
        }

        // 3. Critical Logs
        const logs = LogEngineV4.getLogs({ limit: 50 });
        const recentCriticals = logs.filter(l => l.category === 'security' || (l.payload && l.payload.error)); // Loose check
        if (recentCriticals.length > 5) {
            issues.push(`High volume of recent critical logs (${recentCriticals.length}).`);
             if (status !== "critical") status = "warning";
        }

        return {
            health: status,
            timestamp: new Date().toISOString(),
            issues,
            metrics: {
                users: repo.select("users").length,
                activeMissions: repo.select("missions").length,
                queueSize: repo.select("queue").length
            }
        };
    }
};
