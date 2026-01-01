
import { PLANS } from './constants';
import type { PlanTier } from './types';
import type { User } from '../../types';

export const VALID_PLANS = [
  "Free Flow",
  "Artista em Ascensão",
  "Artista Profissional",
  "Hitmaker",
];

export function normalizePlan(input: string | null | undefined): User['plan'] {
  if (!input) return "Free Flow";

  const cleaned = String(input).trim().toLowerCase();

  const map: Record<string, User['plan']> = {
    // OFFICIAL (Exact Matches & Lowercase)
    "free flow": "Free Flow",
    "artista em ascensão": "Artista em Ascensão",
    "artista profissional": "Artista Profissional",
    "hitmaker": "Hitmaker",

    // LEGACY: Free
    "free": "Free Flow",
    "gratuito": "Free Flow",
    "freeflow": "Free Flow",
    "free-flow": "Free Flow",
    " ": "Free Flow",
    "": "Free Flow",
    "null": "Free Flow",
    "undefined": "Free Flow",

    // LEGACY: Ascensão
    "starter": "Artista em Ascensão",
    "start": "Artista em Ascensão",
    "ascensão": "Artista em Ascensão",
    "ascensao": "Artista em Ascensão",
    "starter artist": "Artista em Ascensão",
    "artista em ascensao": "Artista em Ascensão",

    // LEGACY: Profissional
    "pro": "Artista Profissional",
    "profissional": "Artista Profissional",
    "pro artist": "Artista Profissional",
    "artista pro": "Artista Profissional",

    // LEGACY: Hitmaker
    "hit maker": "Hitmaker",
    "legendary": "Hitmaker",
    "legendary artist": "Hitmaker",
    "vip": "Hitmaker", 
    "hit": "Hitmaker"
  };

  // Return mapped value or default to Free Flow if unknown string
  return map[cleaned] ?? "Free Flow";
}

/**
 * Converte qualquer string de plano (UI label, legacy ID, typo) para o ID interno oficial (PlanTier).
 * Fallback seguro para 'free'.
 */
export function normalizePlanId(input: string | undefined | null): PlanTier {
    if (!input) return 'free';
    
    // First normalize to the official Display Name
    const displayName = normalizePlan(input);
    
    // Then map Display Name to ID
    const mapToId: Record<string, PlanTier> = {
        "Free Flow": "free",
        "Artista em Ascensão": "ascensao",
        "Artista Profissional": "profissional",
        "Hitmaker": "hitmaker"
    };

    return mapToId[displayName] || 'free';
}

/**
 * Retorna o nome de exibição oficial para a UI dado um ID ou string suja.
 */
export function getDisplayPlanName(input: string): string {
    const id = normalizePlanId(input);
    return PLANS[id].displayName;
}
