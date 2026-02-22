
const envMode = (import.meta as any).env?.MODE || "development";
const isProduction = (import.meta as any).env?.PROD || envMode === "production";
const backendProviderFromEnv = ((import.meta as any).env?.VITE_BACKEND_PROVIDER as string | undefined)?.toLowerCase();

/**
 * 🔥 Artist World — Enterprise Mode
 * Supabase é a fonte única da verdade em TODOS os ambientes.
 * Mock backend é proibido para evitar drift e rotas paralelas.
 */
if (backendProviderFromEnv === "mock") {
  throw new Error(
    "[AW Config] VITE_BACKEND_PROVIDER=mock é proibido. Remova essa env e use Supabase."
  );
}

const backendProvider = "supabase";

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
