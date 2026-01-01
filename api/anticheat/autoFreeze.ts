
// Auto Freeze System
import { DiagnosticCore } from "../../services/diagnostic.core";

export function autoFreeze(user: any, riskLevel: string) {
  // ADMIN WHITELIST PATCH V1.0
  if (user?.role === "admin" || user?.role === "superadmin") {
    if (riskLevel === "high") {
        console.warn(`[AntiCheat] Admin Bypass: ${user.name} triggered High Risk but was exempted.`);
        DiagnosticCore.record("security", { action: "admin_bypass_freeze", userId: user.id }, user.id);
    }
    return user;
  }

  if (riskLevel !== "high") return user;

  DiagnosticCore.record("security", { action: "auto_freeze_triggered", userId: user.id }, user.id);

  return {
    ...user,
    freezeEconomy: true,
    freezeMissions: true,
    freezeJackpot: true,
    isBanned: true, // Soft ban
    banReason: "Auto-Freeze: Suspicious Activity Detected"
  };
}
