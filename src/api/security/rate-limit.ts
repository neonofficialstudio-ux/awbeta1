
const calls: Record<string, number[]> = {};

export function rateLimit(key: string, limit = 60): boolean {
  const now = Date.now();
  if (!calls[key]) calls[key] = [];
  
  // Filter calls older than 1 minute
  calls[key] = calls[key].filter(t => now - t < 60000);
  
  if (calls[key].length >= limit) return false;
  
  calls[key].push(now);
  return true;
}
