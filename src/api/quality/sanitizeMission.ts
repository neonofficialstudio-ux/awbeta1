
import type { Mission, MissionFormat } from '../../types';
import { safeDate } from '../utils/dateSafe';

export function sanitizeMission(mission: any): Mission | null {
  if (!mission || typeof mission !== "object") return null;

  // Generate ID if missing
  const id = typeof mission.id === 'string' && mission.id.length > 0 
    ? mission.id 
    : `m-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Safe Date Handling
  const createdDate = safeDate(mission.createdAt) || new Date();
  
  // Handle deadline/expiresAt ambiguity (Migration logic)
  let deadlineDate = safeDate(mission.deadline);
  if (!deadlineDate) deadlineDate = safeDate(mission.expiresAt);
  if (!deadlineDate) deadlineDate = safeDate(mission.availableUntil);
  if (!deadlineDate) {
      deadlineDate = new Date();
      deadlineDate.setDate(deadlineDate.getDate() + 1);
  }

  // Handle Scheduled Date
  const scheduledDate = safeDate(mission.scheduledFor);

  // Handle Rewards (Migration logic)
  const xp = Number(mission.xp ?? mission.rewardXp ?? 0);
  const coins = Number(mission.coins ?? mission.rewardCoins ?? 0);

  // --- MIGRATION LOGIC FOR FORMATS ---
  let safeFormat: MissionFormat = 'link'; // Default fallback
  const rawFormat = String(mission.format || '').toLowerCase();

  if (rawFormat === 'photo' || rawFormat === 'foto' || rawFormat === 'story') {
      safeFormat = 'photo';
  } else if (rawFormat === 'confirmation' || rawFormat === 'check') {
      safeFormat = 'confirmation';
  } else {
      // 'link', 'video', 'text', 'ambos', 'legacy' -> map all to 'link' for safety
      safeFormat = 'link';
  }

  return {
    id: String(id),
    title: String(mission.title || "Missão sem título"),
    description: String(mission.description || ""),
    // Validate Type
    type: ['instagram', 'tiktok', 'creative', 'special', 'youtube'].includes(mission.type) ? mission.type : 'creative',
    xp: Math.max(0, xp),
    coins: Math.max(0, coins),
    actionUrl: String(mission.actionUrl || ""),
    createdAt: createdDate.toISOString(),
    deadline: deadlineDate.toISOString(),
    status: (mission.status === 'active' || mission.status === 'expired') ? mission.status : 'active',
    scheduledFor: scheduledDate ? scheduledDate.toISOString() : undefined,
    format: safeFormat, 
    platform: mission.platform
  };
}
