import { getRepository } from '../database/repository.factory';
import { createNotification, updateUserInDb } from '../helpers';
import { normalizeUpgradeRequest } from './normalizer';
import type { SubscriptionRequest, User } from '../../types';
import { syncAppState } from '../state/sync';
import { LogEngineV4 } from '../admin/logEngineV4';

const repo = getRepository();

export async function approveUpgradeRequest(requestId: string) {
  const requests = repo.select('subscriptionRequests');
  const reqIndex = requests.findIndex((r: any) => r.id === requestId);

  if (reqIndex === -1) return { ok: false, error: 'REQUEST_NOT_FOUND' };

  // Clone to avoid direct mutation issues before saving
  const rawReq = { ...requests[reqIndex] };
  const req = normalizeUpgradeRequest(rawReq);

  const user = repo.select('users').find((u: any) => u.id === req.userId);
  if (!user) return { ok: false, error: 'USER_NOT_FOUND' };

  // 1. Update User Plan
  // The updateUserInDb helper automatically logs the subscription change history
  // if the plan differs, ensuring consistency.
  const updatedUser: User = {
    ...user,
    plan: req.requestedPlan,
  };

  // Persist User
  updateUserInDb(updatedUser);

  // 2. Update Request Status to Approved
  const updatedRequest = {
    ...rawReq,
    status: 'approved',
    processedAt: new Date().toISOString(),
  };

  // Persist Request
  repo.update('subscriptionRequests', (r: any) => r.id === requestId, () => updatedRequest);

  // Log Action
  LogEngineV4.log({
    action: 'subscription_approved',
    category: 'admin',
    userId: user.id,
    payload: {
      requestId,
      oldPlan: req.currentPlan,
      newPlan: req.requestedPlan,
    },
  });

  // 3. Notify User
  const notification = createNotification(
    user.id,
    'Upgrade Aprovado!',
    `Seu plano foi atualizado para ${req.requestedPlan}. Aproveite os novos benefícios!`,
    { view: 'profile' },
  );
  repo.insert('notifications', notification);

  // 5. Sync UI State
  await syncAppState();

  return updatedRequest;
}

export async function rejectUpgradeRequest(requestId: string) {
  const requests = repo.select('subscriptionRequests');
  const reqIndex = requests.findIndex((r: any) => r.id === requestId);

  if (reqIndex === -1) return { ok: false, error: 'REQUEST_NOT_FOUND' };

  const req = normalizeUpgradeRequest(requests[reqIndex]);

  // 1. Update Request Status
  const updatedRequest = {
    ...requests[reqIndex],
    status: 'rejected',
    processedAt: new Date().toISOString(),
  };
  repo.update('subscriptionRequests', (r: any) => r.id === requestId, () => updatedRequest);

  // Log Action
  LogEngineV4.log({
    action: 'subscription_rejected',
    category: 'admin',
    userId: req.userId,
    payload: { requestId, plan: req.requestedPlan },
  });

  // 2. Notify
  const notification = createNotification(
    req.userId,
    'Upgrade Rejeitado',
    'Seu pedido de upgrade foi rejeitado pelo administrador. Verifique os requisitos e tente novamente.',
    { view: 'subscriptions' },
  );
  repo.insert('notifications', notification);

  // 4. Sync UI
  await syncAppState();

  return updatedRequest;
}

export function getNormalizedRequests(): SubscriptionRequest[] {
  const reqs = repo.select('subscriptionRequests');
  return reqs.map(normalizeUpgradeRequest);
}

// Alias exports
export const adminApproveSubscription = approveUpgradeRequest;
export const adminRejectSubscription = rejectUpgradeRequest;
