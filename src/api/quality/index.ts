// api/quality/index.ts

import {
    validateMissionSubmission,
    validateLink,
    validateImageUpload,
    validateTextEntry,
    validateQueueInput,
} from './validateInputs';
import {
    sanitizeText,
    sanitizeLink,
} from './sanitize';
import {
    checkLinkSafety,
} from './linkSafety';
import {
    applyContentRules,
    checkOffensiveContent,
    checkRepetition,
} from './contentRules';

/**
 * QUALITY SHIELD LAYER (V1.0)
 * 
 * This module provides a suite of functions to validate, sanitize, and protect
 * all user inputs before they are processed by the API.
 */
export {
  validateMissionSubmission,
  validateLink,
  validateImageUpload,
  validateTextEntry,
  validateQueueInput,
  sanitizeText,
  sanitizeLink,
  checkLinkSafety,
  applyContentRules,
  checkOffensiveContent,
  checkRepetition,
};
