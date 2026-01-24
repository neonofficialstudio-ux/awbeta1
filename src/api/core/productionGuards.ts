import { config } from "../../core/config";

export function assertSupabaseInProd(context: string) {
  if (config.isProduction && config.backendProvider !== "supabase") {
    throw new Error(`[AW] Mock/engine blocked in production: ${context}`);
  }
}

export function isSupabaseProd() {
  return config.backendProvider === "supabase";
}
