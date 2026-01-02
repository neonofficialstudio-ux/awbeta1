
import { BehaviorScore } from "./behaviorScore";
import { MachineRules } from "./machineRules";
import { DiagnosticCore } from "../../services/diagnostic.core";

// Adaptive Shield Engine
export function runAdaptiveShield(user: any, activity: any) {
  // ADMIN WHITELIST PATCH V1.0
  if (user?.role === "admin" || user?.role === "superadmin") {
      return {
          score: 0,
          rules: [],
          shield: "normal" // Always allow admin actions
      };
  }

  const score = BehaviorScore.compute(user, activity);
  const rules = MachineRules.evaluate(user, activity);

  // Determina o nível do escudo
  let shield = "normal";

  if (score > 80 || rules.length >= 2) shield = "critical";
  else if (score > 50 || rules.length === 1) shield = "high";
  else if (score > 30) shield = "medium";

  if (shield !== "normal") {
    DiagnosticCore.record('security', {
        action: "adaptive_shield_risk",
        userId: user.id,
        score,
        shield,
        rules,
        activity
    }, user.id);
  }

  return {
    score,
    rules,
    shield
  };
}
