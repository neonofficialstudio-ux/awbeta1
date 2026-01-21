
const envMode = (import.meta as any).env?.MODE || "development";
const isProduction = (import.meta as any).env?.PROD || envMode === "production";
const backendProviderFromEnv = ((import.meta as any).env?.VITE_BACKEND_PROVIDER as string | undefined)?.toLowerCase();

/**
 * ✅ FIX: Nunca permitir MOCK em produção (Vercel)
 * Isso evita:
 * - preços antigos (R$89/R$149)
 * - fluxos mock quebrando páginas reais
 *
 * Em DEV você ainda pode usar VITE_BACKEND_PROVIDER=mock.
 */
const backendProvider = isProduction
  ? "supabase"
  : (backendProviderFromEnv === "mock" ? "mock" : "supabase");

export const config = {
  env: envMode,
  isProduction,
  backendProvider,
  // Deprecated flag kept for compatibility with existing imports
  get useSupabase() {
    return this.backendProvider === "supabase";
  },
  apiVersion: "v5.0-release",

  // Feature Flags
  features: {
    telemetry: true,
    realtimeEvents: true,
    antiCheat: true,
  },
};
