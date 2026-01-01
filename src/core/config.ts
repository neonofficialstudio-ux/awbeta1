
export const config = {
  env: (import.meta as any).env?.MODE || "development",
  isProduction: (import.meta as any).env?.PROD || (import.meta as any).env?.MODE === 'production',
  useSupabase: true, 
  apiVersion: "v5.0-release",
  
  // Feature Flags
  features: {
    telemetry: true,
    realtimeEvents: true,
    antiCheat: true,
  }
};
