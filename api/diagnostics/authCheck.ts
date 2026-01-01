
import { allUsersData } from '../mockData';
import { addPerformanceLog } from '../logs/performance';
import { logError } from '../errors/logger';
import type { User } from '../../types';
import { PLAN_HIERARCHY } from '../economy/economy';

interface AuthError {
  type: string;
  message: string;
}

export interface AuthReport {
  timestamp: number;
  summary: {
    sessionsChecked: number;
    errorsFound: number;
  };
  errors: AuthError[];
}

// 1. Check Token Validity
export const checkTokenValidity = (token: string | null): { valid: boolean; userId?: string; error?: string } => {
  if (!token) return { valid: false, error: 'Token is null or empty' };
  
  try {
    // Mock token is simply base64 encoded JSON
    const decoded = JSON.parse(atob(token));
    if (!decoded.id) {
        return { valid: false, error: 'Token missing userId' };
    }
    return { valid: true, userId: decoded.id };
  } catch (e) {
    return { valid: false, error: 'Malformed Base64 token' };
  }
};

// 2. Check User Session Integrity
export const checkUserSession = (user: User): AuthError[] => {
  const errors: AuthError[] = [];
  
  // Check against DB existence
  const dbUser = allUsersData.find(u => u.id === user.id);
  if (!dbUser) {
      errors.push({ type: 'GHOST_SESSION', message: `User ID ${user.id} in session does not exist in database` });
      return errors;
  }

  // Check impossible values
  if (user.coins < 0) {
      errors.push({ type: 'INVALID_STATE', message: `Session user has negative coins: ${user.coins}` });
  }
  if (user.xp < 0) {
      errors.push({ type: 'INVALID_STATE', message: `Session user has negative XP: ${user.xp}` });
  }
  if (!PLAN_HIERARCHY[user.plan] && PLAN_HIERARCHY[user.plan] !== 0) {
      errors.push({ type: 'INVALID_PLAN', message: `Session user has invalid plan: ${user.plan}` });
  }

  return errors;
};

// 3. Check Admin Access
export const checkAdminAccess = (user: User): AuthError[] => {
    const errors: AuthError[] = [];
    if (user.role !== 'admin') {
        // This is just a warning/log for the diagnostic tool, not an active blocker here
        // In a real app, this would assume the context invoking this check is an admin context
        errors.push({ type: 'UNAUTHORIZED_ACCESS_POTENTIAL', message: `User ${user.id} is not an admin but auth check was invoked.` });
    }
    return errors;
};

// 4. Check Session State (Generic)
export const checkSessionState = (activeUserId: string | undefined, tokenUserId: string | undefined): AuthError[] => {
    const errors: AuthError[] = [];
    if (activeUserId !== tokenUserId) {
        errors.push({ type: 'SESSION_MISMATCH', message: `Active User ID (${activeUserId}) matches Token ID (${tokenUserId}) mismatch` });
    }
    return errors;
};

// --- MAIN FUNCTION ---

export const runAuthSanityCheck = (): AuthReport => {
    const report: AuthReport = {
        timestamp: Date.now(),
        summary: { sessionsChecked: 0, errorsFound: 0 },
        errors: []
    };

    // 1. Get Token from LocalStorage
    const token = localStorage.getItem('authToken');
    report.summary.sessionsChecked = 1; // Checking current browser session

    // 2. Validate Token
    const tokenResult = checkTokenValidity(token);
    
    if (!tokenResult.valid) {
        report.errors.push({ type: 'TOKEN_INVALID', message: tokenResult.error || 'Unknown token error' });
    } else {
        // 3. Validate User if token is valid
        const userId = tokenResult.userId!;
        const user = allUsersData.find(u => u.id === userId);

        if (user) {
            const sessionErrors = checkUserSession(user);
            report.errors.push(...sessionErrors);
            
            // Optional: Check admin access if this tool is considered admin-only
            // report.errors.push(...checkAdminAccess(user));
        } else {
            report.errors.push({ type: 'USER_NOT_FOUND', message: `User ID ${userId} from token not found in DB` });
        }
    }

    report.summary.errorsFound = report.errors.length;

    // Log to system logs
    if (report.errors.length > 0) {
        report.errors.forEach(err => {
            addPerformanceLog({
                type: 'system',
                source: 'auth_check',
                details: { error: err.type, message: err.message }
            });
            logError(`Auth Check Failed: ${err.type}`, { message: err.message });
        });
    } else {
         addPerformanceLog({
            type: 'system',
            source: 'auth_check',
            details: { status: 'OK', checked: report.summary.sessionsChecked }
        });
    }

    return report;
};
