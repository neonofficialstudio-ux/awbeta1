
import type { SubscriptionRequest } from '../../types';
import { normalizePlan } from './normalizePlan';

export function normalizeUpgradeRequest(req: any): SubscriptionRequest {
  // Normalize Plans
  const currentPlan = normalizePlan(req.currentPlan || req.from);
  const requestedPlan = normalizePlan(req.requestedPlan || req.targetPlan || req.to);

  return {
    id: req.id || req.requestId,
    userId: req.userId,
    userName: req.userName || 'Usuário',
    currentPlan: currentPlan,
    requestedPlan: requestedPlan,
    proofUrl: req.proofUrl || req.proof,
    status: req.status || "pending_approval",
    requestedAt: req.requestedAt || req.timestamp || req.date || new Date().toISOString(),
    paymentLink: req.paymentLink
  };
}
