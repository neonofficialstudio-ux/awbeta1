
// Multi-account behavior detector (simple heuristic)
export function detectMultiAccount(fp: string | undefined, users: any[]) {
  if (!fp) return 0;
  const sameDevice = users.filter(u => u.deviceFingerprint === fp);
  return sameDevice.length;
}
