
import type { User } from '../../types';

export const PlanAliases: Record<string, string> = {
  "Free Flow": "free",
  "Artista em Ascensão": "ascensao",
  "Artista Profissional": "profissional",
  "Hitmaker": "hitmaker",
  // Legacy / Typo safety
  "Free": "free",
  "Ascensão": "ascensao",
  "Profissional": "profissional",
  // "Hitmaker": "hitmaker" // Removed duplicate key
};

export function normalizePlan(plan: string): string {
    return PlanAliases[plan] || "free";
}