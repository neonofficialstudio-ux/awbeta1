// Anti-Cheat Rate Limit Adaptativo
const actionTimestamps: Record<string, number[]> = {};

export function rateLimit(action: string, maxPerMin: number) {
  const now = Date.now();
  const list = actionTimestamps[action] || [];

  const filtered = list.filter(t => now - t < 60000);
  filtered.push(now);
  actionTimestamps[action] = filtered;

  if (filtered.length > maxPerMin) {
    return false;
  }
  return true;
}
