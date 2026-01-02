// Anti Replay
const usedNonces = new Set();

export function validateNonce(nonce: string) {
  if (!nonce) return false;
  if (usedNonces.has(nonce)) return false;

  usedNonces.add(nonce);
  setTimeout(() => usedNonces.delete(nonce), 300000);

  return true;
}
