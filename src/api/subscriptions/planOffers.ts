import { getSupabase } from "../supabase/client";

export type PlanOffer = {
  plan: string;
  coins_multiplier: number;
  daily_mission_limit: number | null;
  store_discount_percent: number;
  bullets: string[];
};

export async function getAllPlanOffers(): Promise<PlanOffer[]> {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase não disponível.");

  const { data, error } = await supabase.rpc("get_all_plan_offers");
  if (error) {
    console.error("[getAllPlanOffers] rpc error:", error);
    throw new Error(error.message || "Falha ao carregar ofertas dos planos.");
  }

  return (data as PlanOffer[]) ?? [];
}
