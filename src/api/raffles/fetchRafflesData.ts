import type { Raffle, RaffleTicket, User } from "../../types";
import { config } from "../../core/config";
import { withLatency } from "../helpers";
import * as db from "../mockData";
import { getRepository } from "../database/repository.factory";
import { getSupabase } from "../supabase/client";
import { SanityGuard } from "../../services/sanity.guard";
import { mapProfileToUser } from "../supabase/mappings";

const repo = getRepository();

const requireSupabaseClient = () => {
  const client = getSupabase();
  if (!client) throw new Error("[Supabase] Client not initialized");
  return client;
};

const mapRaffleRowToApp = (r: any): Raffle => ({
  id: r.id,
  itemId: r.item_id ?? "",
  itemName: r.item_name ?? "Sorteio",
  itemImageUrl: r.item_image_url ?? "",
  ticketPrice: Number(r.ticket_price ?? 0),
  ticketLimitPerUser: Number(r.ticket_limit_per_user ?? 0),
  startsAt: r.starts_at ?? undefined,
  endsAt: r.ends_at,
  status: r.status,
  winnerId: r.winner_user_id ?? undefined,
  winnerDefinedAt: r.winner_defined_at ?? undefined,
  prizeType: r.prize_type ?? undefined,
  coinReward: r.coin_reward ?? undefined,
  customRewardText: r.custom_reward_text ?? undefined,
  meta: r.meta ?? undefined,
} as any);

const mapTicketRowToApp = (t: any): RaffleTicket => ({
  id: t.id,
  raffleId: t.raffle_id,
  userId: t.user_id,
  purchasedAt: t.purchased_at || t.created_at,
});

export const fetchRafflesData = async (userId: string) => {
  // ✅ Supabase mode
  if (config.backendProvider === "supabase") {
    const supabase = requireSupabaseClient();

    // 1) Raffles
    const rafflesRes = await supabase
      .from("raffles")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    // Se algum projeto tiver coluna is_highlighted e o select(*) não trouxer, não tem problema.
    if (rafflesRes.error) throw rafflesRes.error;

    const rafflesRaw = rafflesRes.data || [];
    const raffles: Raffle[] = rafflesRaw.map(mapRaffleRowToApp);

    const raffleIds = raffles.map((r) => r.id).filter(Boolean);

    // 2) Tickets (limitado aos raffles carregados)
    const ticketsRes = await supabase
      .from("raffle_tickets")
      .select("*")
      .in(
        "raffle_id",
        raffleIds.length ? raffleIds : ["00000000-0000-0000-0000-000000000000"]
      )
      .order("created_at", { ascending: false })
      .limit(2000);

    if (ticketsRes.error) throw ticketsRes.error;

    const allTickets: RaffleTicket[] = (ticketsRes.data || []).map(mapTicketRowToApp);
    const myTickets: RaffleTicket[] = allTickets.filter((t) => t.userId === userId);

    // 3) Users (winners + ticket holders)
    const userIds = new Set<string>();
    allTickets.forEach((t) => userIds.add(t.userId));
    raffles.forEach((r) => r.winnerId && userIds.add(r.winnerId));

    const userIdsArr = Array.from(userIds);
    let allUsers: User[] = [];

    if (userIdsArr.length) {
      const profilesRes = await supabase
        .from("profiles")
        .select("*")
        .in("id", userIdsArr)
        .limit(500);

      if (profilesRes.error) throw profilesRes.error;

      allUsers = (profilesRes.data || []).map((p: any) =>
        SanityGuard.user(mapProfileToUser(p))
      );
    }

    // 4) Highlight (opcional)
    // Se existir meta.is_highlighted ou coluna is_highlighted em alguns projetos, tenta detectar:
    const highlighted =
      rafflesRaw.find((r: any) => r?.is_highlighted)?.id ||
      rafflesRaw.find((r: any) => r?.meta?.is_highlighted)?.id ||
      null;

    return {
      raffles,
      myTickets,
      allTickets,
      allUsers,
      highlightedRaffleId: highlighted,
    };
  }

  // ✅ Fallback (mock/dev) — mantém compatibilidade
  return withLatency(() => ({
    raffles: db.rafflesData,
    myTickets: db.raffleTicketsData.filter((t: any) => t.userId === userId),
    allTickets: db.raffleTicketsData,
    allUsers: repo.select("users"),
    highlightedRaffleId: db.highlightedRaffleIdData,
  }));
};
