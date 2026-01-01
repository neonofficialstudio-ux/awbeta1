
export const config = {
  env: (import.meta as any).env?.MODE || "development",
  isProduction: (import.meta as any).env?.PROD || (import.meta as any).env?.MODE === 'production',
  // FORCED MOCK MODE: Alterado para false conforme solicitado para ajustes.
  // Mude para true quando quiser conectar ao Supabase real.
  useSupabase: false, 
  apiVersion: "v5.0-release",
  
  // Feature Flags
  features: {
    telemetry: true,
    realtimeEvents: true,
    antiCheat: true,
  }
};
