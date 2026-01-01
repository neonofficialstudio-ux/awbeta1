
// api/validation/missionValidationEngine.ts

import {
  validatePostLink,
  validateStoryProof,
  validateImageProof,
  validateFormatCompatibility,
  type ValidationResult,
} from './validators';
import { SanitizeString } from '../../core/sanitizer.core';

interface MissionValidationInput {
  missionId: string;
  userId: string;
  format: 'video' | 'story' | 'foto' | 'ambos' | string;
  proofType: 'link' | 'story' | 'photo' | string;
  proofValue: string;
}

export interface MissionValidationResult {
  ok: boolean;
  errors: string[];
  autoScore: number;
}

export function validateMissionProof(input: MissionValidationInput): MissionValidationResult {
  const errors: string[] = [];
  
  // PATCH V7.1: Sanitize input proofValue
  const proofValue = SanitizeString(input.proofValue);

  // 1. Validate format compatibility
  const formatCheck = validateFormatCompatibility(input.format, input.proofType);
  if (!formatCheck.ok) {
    errors.push(formatCheck.reason!);
  }

  // 2. Validate proof based on type
  let proofCheck: ValidationResult = { ok: true };
  
  if (!proofValue) {
      return { ok: false, errors: ['Valor da prova vazio ou inválido'], autoScore: 0 };
  }

  switch (input.proofType) {
    case 'link':
      proofCheck = validatePostLink(proofValue);
      break;
    case 'story':
      proofCheck = validateStoryProof(proofValue);
      break;
    case 'photo':
      proofCheck = validateImageProof(proofValue);
      break;
    default:
      break;
  }

  if (!proofCheck.ok) {
    errors.push(proofCheck.reason!);
  }

  if (errors.length > 0) {
    return {
      ok: false,
      errors: errors,
      autoScore: 0,
    };
  }

  let autoScore = 0;
  switch (input.proofType) {
    case 'link': autoScore = 100; break;
    case 'story': autoScore = 80; break;
    case 'photo': autoScore = 70; break;
    default: autoScore = 50; break;
  }

  return {
    ok: true,
    errors: [],
    autoScore,
  };
}
