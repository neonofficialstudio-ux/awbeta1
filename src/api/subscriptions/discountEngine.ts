
/**
 * ⚠️ DEPRECATED (AW Contract):
 * Desconto de loja é autoridade do Supabase (redeem_store_item + ledger).
 * O frontend só pode EXIBIR desconto (via RPC get_my_plan_benefits / offers).
 *
 * Este engine foi neutralizado para não interferir em produção.
 */
export const DiscountEngine = {
  calculatePrice: (_user: any, originalPrice: number): number => originalPrice,
  getDiscountPercentage: (_user: any): number => 0,
};
