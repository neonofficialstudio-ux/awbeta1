import { getSupabase } from "../supabase/client";

export type MyPlanBenefits = {
  plan: string;
  coins_multiplier: number;
  daily_mission_limit: number | null;
  store_discount_percent: number;
};

export async function getMyPlanBenefits(): Promise<MyPlanBenefits> {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase não disponível.");

  const { data, error } = await supabase.rpc("get_my_plan_benefits");
  if (error) {
    console.error("[getMyPlanBenefits] rpc error:", error);
    throw new Error(error.message || "Falha ao carregar benefícios do plano.");
  }

  return data as MyPlanBenefits;
}
