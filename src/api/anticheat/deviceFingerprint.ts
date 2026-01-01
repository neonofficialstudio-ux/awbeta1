// Anti-Cheat Master Pack — Device Fingerprinting
export function getDeviceFingerprint() {
  if (typeof window === 'undefined') return Promise.resolve("server-side");

  const nav = window.navigator;
  const screen = window.screen;

  const raw = [
    nav.userAgent,
    nav.language,
    screen.width,
    screen.height,
    screen.colorDepth,
    nav.hardwareConcurrency,
    nav.platform,
    nav.maxTouchPoints,
  ].join("|");

  return crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw))
    .then(hash => {
      return Array.from(new Uint8Array(hash))
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");
    });
}
