
import { TelemetryPRO } from "../../services/telemetry.pro";
import { getRepository } from "../database/repository.factory";
import type { User } from "../../types";

const repo = getRepository();

// --- REAL-TIME DATA ADAPTER ---

const getStats = () => {
    const users = repo.select("users") as User[];
    const anomalies = repo.select("anomalies") || [];
    const telemetry = repo.select("telemetry") || [];
    
    // 1. Get Real Active Threats from Anomalies Table + High Risk Users
    const activeThreats: any[] = [];

    // A. From Anomalies Table
    anomalies.forEach((anom: any) => {
        // Resolve user if possible
        const userId = anom.relatedUserIds?.[0] || anom.userId;
        const user = users.find(u => u.id === userId);
        
        activeThreats.push({
            id: userId || 'unknown',
            name: user ? user.artisticName : (userId || 'System'),
            riskScore: anom.severity === 'critical' ? 95 : anom.severity === 'high' ? 80 : 50,
            severity: anom.severity.toUpperCase(),
            reason: anom.message || anom.type,
            lastEvent: anom.type
        });
    });

    // B. From User Risk Scores (Adaptive Shield results)
    users.forEach(u => {
        // If user has high risk score but no open anomaly record, add them too
        if ((u.riskScore || 0) > 50 && !u.isBanned) {
            // Avoid duplicates if already in anomalies
            if (!activeThreats.find(t => t.id === u.id)) {
                activeThreats.push({
                    id: u.id,
                    name: u.artisticName,
                    riskScore: u.riskScore,
                    severity: (u.riskScore || 0) > 80 ? "CRITICAL" : "HIGH",
                    reason: "Comportamento Anômalo (Shield)",
                    lastEvent: "behavior_flag"
                });
            }
        }
    });

    // 2. Get Banned History
    const bannedHistory = users
        .filter(u => u.isBanned)
        .map(u => ({
            id: u.id,
            name: u.artisticName,
            bannedAt: u.banExpiresAt ? new Date(u.banExpiresAt).getTime() - (30*24*60*60*1000) : Date.now(), // Estimate if not logged separate
            reason: u.banReason || "Violação de Termos",
            admin: "Sistema/Admin"
        }));

    // 3. Activity Counts
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    const lastDayEvents = telemetry.filter((t: any) => t.timestamp > now - oneDay).length;
    const lastHourEvents = telemetry.filter((t: any) => t.timestamp > now - (oneDay / 24)).length;

    return {
      total: telemetry.length,
      lastDay: lastDayEvents,
      lastHour: lastHourEvents,
      eventsPerType: {
        // Mock distribution for sparklines based on real counts if needed, 
        // or just placeholders as UI expects arrays
        "mission_start": Array(100).fill(1), 
        "mission_complete": Array(100).fill(1),
        "store_purchase": Array(50).fill(1),
        "security_flag": Array(activeThreats.length).fill(1)
      },
      securityThreats: activeThreats,
      bannedHistory: bannedHistory,
      systemStatus: activeThreats.length > 5 ? "WARNING" : "NOMINAL",
      uptime: "99.99%"
    };
};

export const TelemetryPremium = {
  getStats,
  
  getSecuritySnapshot: getStats, // Alias for UI component usage

  track: (event: string, userId: string, data: any) => {
      // Log to core telemetry but mark as premium source
      TelemetryPRO.event(event, { ...data, userId, tier: 'premium' });
  },

  // Inject chaos now creates REAL anomaly records in the DB
  injectChaos: () => {
      const randomThreats = [
        { name: "Script_Kiddie_v1", reason: "DOM Manipulation", severity: "medium", event: "page_interaction" },
        { name: "DDoS_Initiator", reason: "High Velocity Requests", severity: "critical", event: "api_flood" },
        { name: "Auth_Bypass_Try", reason: "Invalid Token Signature", severity: "high", event: "auth_fail" },
        { name: "Farmer_X", reason: "Macro Detection", severity: "medium", event: "mission_start" }
      ];

      const newThreat = randomThreats[Math.floor(Math.random() * randomThreats.length)];
      
      // Find a random user to attribute (or create a fake ID)
      const users = repo.select("users");
      const targetUser = users.length > 0 ? users[Math.floor(Math.random() * users.length)] : { id: `bot_${Date.now()}` };

      // Insert into Real Anomalies Table
      repo.insert("anomalies", {
          id: `anm-${Date.now()}`,
          timestamp: Date.now(),
          type: newThreat.event,
          severity: newThreat.severity,
          message: newThreat.reason,
          relatedUserIds: [targetUser.id]
      });
      
      return getStats().securityThreats;
  },

  // Returns deep data for Investigation Modal
  getUserInvestigation: (userId: string) => {
      const user = repo.select("users").find((u: any) => u.id === userId);
      const telemetry = repo.select("telemetry").filter((t: any) => t.userId === userId || (t.details && t.details.userId === userId));
      
      // Calculate Stats based on real data
      const recentActions = telemetry.slice(0, 10).map((t: any) => ({
          action: t.type,
          timestamp: t.timestamp,
          flag: t.category === 'security' ? 'SUSPICIOUS' : 'OK'
      }));

      return {
          userId,
          // Real Data if available, fallback for Fingerprint
          ipChain: user?.deviceFingerprint ? [user.deviceFingerprint] : ["Unknown"], 
          deviceId: user?.deviceFingerprint || "No Fingerprint",
          hardwareConcurrency: "N/A", // Not stored in DB currently
          userAgent: "User Agent Recorded",
          accountAge: user?.joined || "N/A",
          walletBalance: user?.coins || 0,
          recentActions: recentActions.length > 0 ? recentActions : [
              { action: "No recent telemetry", timestamp: Date.now(), flag: "OK" }
          ]
      };
  },

  banUser: (userId: string, adminName: string = "Admin_Panel") => {
      const user = repo.select("users").find((u: any) => u.id === userId);
      if (user) {
          const updatedUser = { 
              ...user, 
              isBanned: true, 
              banReason: "SecOps Manual Ban", 
              banExpiresAt: undefined 
          };
          repo.update("users", (u: any) => u.id === userId, (u: any) => updatedUser);
          
          // Clear active anomalies for this user to remove from "Active Threats" list
          repo.delete("anomalies", (a: any) => a.relatedUserIds?.includes(userId));
          
          return true;
      }
      return false;
  },

  markAsSafe: (userId: string) => {
      // Remove from anomalies table (False positive)
      repo.delete("anomalies", (a: any) => a.relatedUserIds?.includes(userId));
      
      // Reset User Risk Score
      const user = repo.select("users").find((u: any) => u.id === userId);
      if (user) {
          repo.update("users", (u: any) => u.id === userId, (u: any) => ({ ...u, riskScore: 0 }));
      }
      return true;
  }
};
