
import { getSessionEvents } from './sessionRecorder';

export function getEventCountByType(): Record<string, number> {
  const events = getSessionEvents();
  const counts: Record<string, number> = {};
  
  events.forEach(event => {
    counts[event.type] = (counts[event.type] || 0) + 1;
  });
  
  return counts;
}

export function getHourlyActivity(): Record<string, number> {
  const events = getSessionEvents();
  const activity: Record<string, number> = {};
  
  for (let i = 0; i < 24; i++) {
    const hour = i.toString().padStart(2, '0');
    activity[hour] = 0;
  }

  events.forEach(event => {
    const date = new Date(event.timestamp);
    const hour = date.getHours().toString().padStart(2, '0');
    activity[hour] = (activity[hour] || 0) + 1;
  });

  return activity;
}

export function getTimeline(): { time: number; type: string }[] {
  const events = getSessionEvents();
  return events.map(e => ({
    time: e.timestamp,
    type: e.type
  }));
}

export function getMostUsedMissionTitles(): { title: string; count: number }[] {
  const events = getSessionEvents();
  const titleCounts: Record<string, number> = {};

  events.forEach(event => {
    if (event.type === 'mission_generated' || event.type === 'mission_created') {
      const title = event.payload?.title;
      if (title) {
        titleCounts[title] = (titleCounts[title] || 0) + 1;
      }
    }
  });

  return Object.entries(titleCounts)
    .map(([title, count]) => ({ title, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

export function getUserModerationStats(): Record<string, { approvals: number; rejections: number; punishments: number }> {
  const events = getSessionEvents();
  const stats: Record<string, { approvals: number; rejections: number; punishments: number }> = {};

  const initUser = (userId: string) => {
    if (!stats[userId]) {
      stats[userId] = { approvals: 0, rejections: 0, punishments: 0 };
    }
  };

  events.forEach(event => {
    const userId = event.payload?.userId;
    if (!userId) return;

    if (event.type === 'mission_approved') {
      initUser(userId);
      stats[userId].approvals++;
    } else if (event.type === 'mission_rejected') {
      initUser(userId);
      stats[userId].rejections++;
    } else if (event.type === 'punishment_applied') {
      initUser(userId);
      stats[userId].punishments++;
    }
  });

  return stats;
}

export function getQueueItemStats(): Record<string, number> {
  const events = getSessionEvents();
  const stats: Record<string, number> = {};

  events.forEach(event => {
    if (event.type === 'queue_item_approved') {
      // Check for specific type in payload (e.g., 'spotlight') or fallback to itemId/generic
      let typeKey = 'Item Padrão';
      
      if (event.payload?.type === 'spotlight') {
        typeKey = 'Artista do Dia';
      } else if (event.payload?.itemId) {
          // Generic fallback if we can't resolve name without DB
          typeKey = `Item (${event.payload.itemId})`;
      }
      
      stats[typeKey] = (stats[typeKey] || 0) + 1;
    }
  });

  return stats;
}
