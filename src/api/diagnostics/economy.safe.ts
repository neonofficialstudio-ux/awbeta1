
import { SanitizeString, SanitizeArray } from "../../core/sanitizer.core";

export function validateEconomyRulesSafe(rules: any[]): string[] {
  const errors: string[] = [];

  for (const raw of SanitizeArray(rules)) {
    const rule = SanitizeString(raw);

    if (rule.startsWith("ECONOMY:FORBIDDEN")) {
      errors.push(`Regra proibida detectada: ${rule}`);
    }

    if (rule.startsWith("ECONOMY:NEGATIVE_BALANCE")) {
      errors.push(`Saldo negativo detectado: ${rule}`);
    }

    if (rule.startsWith("ECONOMY:DUPLICATE_TX")) {
      errors.push(`Transação duplicada detectada: ${rule}`);
    }
  }

  return errors;
}
