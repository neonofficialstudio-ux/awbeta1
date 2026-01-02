
export const config = {
  env: (import.meta as any).env?.MODE || "development",
  isProduction: (import.meta as any).env?.PROD || (import.meta as any).env?.MODE === 'production',
  backendProvider: ((import.meta as any).env?.VITE_BACKEND_PROVIDER as string | undefined)?.toLowerCase() === 'mock'
    ? 'mock'
    : 'supabase',
  // Deprecated flag kept for compatibility with existing imports
  get useSupabase() {
    return this.backendProvider === 'supabase';
  },
  apiVersion: "v5.0-release",
  
  // Feature Flags
  features: {
    telemetry: true,
    realtimeEvents: true,
    antiCheat: true,
  }
};
