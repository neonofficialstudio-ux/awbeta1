// api/errors/error-handler.ts
import * as logger from './logger';

export const handleApiError = (error: Error, context: any) => {
    logger.logError(error.message, { context, stack: error.stack });
};

export const handleCriticalFailure = (error: Error, context: any) => {
    logger.logCritical(error.message, { context, stack: error.stack });
    // In a real app, this might trigger a system alert (e.g., PagerDuty)
};

export const handleUnexpectedBehavior = (description: string, context: any) => {
    logger.logWarning(description, { context });
};
