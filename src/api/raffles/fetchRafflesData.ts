import type { Raffle, User } from "../../types";
import { config } from "../../core/config";
import { withLatency } from "../helpers";
import * as db from "../mockData";
import { getRepository } from "../database/repository.factory";
import { getSupabase } from "../supabase/client";
import { SanityGuard } from "../../services/sanity.guard";
import { mapProfileToUser } from "../supabase/mappings";

// ✅ Cache simples em memória (TTL) para profiles usados em Raffles
type CachedProfile = { user: User; expiresAt: number };
const PROFILES_CACHE_TTL_MS = 5 * 60_000; // 5 minutos
const profilesCache = new Map<string, CachedProfile>();

function getCachedProfile(id: string): User | null {
  const entry = profilesCache.get(id);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    profilesCache.delete(id);
    return null;
  }
  return entry.user;
}

function setCachedProfile(id: string, user: User) {
  profilesCache.set(id, { user, expiresAt: Date.now() + PROFILES_CACHE_TTL_MS });
}

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

type RafflesOverviewRow = {
  id: string;
  item_id: string | null;
  item_name: string;
  item_image_url: string | null;
  ticket_price: number;
  ticket_limit_per_user: number;
  starts_at: string | null;
  ends_at: string;
  status: string;
  winner_user_id: string | null;
  winner_defined_at: string | null;
  prize_type: string | null;
  coin_reward: number | null;
  custom_reward_text: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  meta: any;
  total_tickets: number;
  my_tickets: number;
};

export const fetchRafflesData = async (userId: string) => {
  // ✅ Supabase mode
  if (config.backendProvider === "supabase") {
    const supabase = requireSupabaseClient();

    // 1) Raffles + counts (1 RPC)
    const { data, error } = await supabase.rpc("get_raffles_overview", { p_limit: 100 });
    if (error) throw error;

    const rows: RafflesOverviewRow[] = Array.isArray(data) ? (data as any) : [];
    const rafflesRaw = rows;
    const raffles: Raffle[] = rafflesRaw.map(mapRaffleRowToApp);

    // 2) Build counts maps
    const totalTicketsByRaffle: Record<string, number> = {};
    const myTicketsByRaffle: Record<string, number> = {};

    for (const r of rafflesRaw) {
      if (!r?.id) continue;
      totalTicketsByRaffle[r.id] = Number(r.total_tickets ?? 0);
      myTicketsByRaffle[r.id] = Number(r.my_tickets ?? 0);
    }

    // 3) Users (winners only) — ✅ com cache TTL
    const winnerIds = Array.from(
      new Set(raffles.map((r) => r.winnerId).filter(Boolean) as string[])
    );

    // Primeiro tenta resolver tudo via cache
    const cachedUsers: User[] = [];
    const missingIds: string[] = [];

    for (const id of winnerIds) {
      const cached = getCachedProfile(id);
      if (cached) cachedUsers.push(cached);
      else missingIds.push(id);
    }

    let fetchedUsers: User[] = [];

    if (missingIds.length) {
      const profilesRes = await supabase
        .from("profiles")
        .select("*")
        .in("id", missingIds)
        .limit(500);

      if (profilesRes.error) throw profilesRes.error;

      fetchedUsers = (profilesRes.data || []).map((p: any) =>
        SanityGuard.user(mapProfileToUser(p))
      );

      // grava no cache
      for (const u of fetchedUsers) {
        if (u?.id) setCachedProfile(u.id, u);
      }
    }

    const allUsers: User[] = [...cachedUsers, ...fetchedUsers];

    // 4) Highlight (opcional)
    // Se existir meta.is_highlighted ou coluna is_highlighted em alguns projetos, tenta detectar:
    const highlighted =
      rafflesRaw.find((r: any) => r?.is_highlighted)?.id ||
      rafflesRaw.find((r: any) => r?.meta?.is_highlighted)?.id ||
      null;

    return {
      raffles,
      allUsers,
      highlightedRaffleId: highlighted,
      myTicketsByRaffle,
      totalTicketsByRaffle,
    };
  }

  // ✅ Fallback (mock/dev) — mantém compatibilidade
  return withLatency(() => {
    const allTickets = db.raffleTicketsData;
    const myTickets = db.raffleTicketsData.filter((t: any) => t.userId === userId);

    const myTicketsByRaffle: Record<string, number> = {};
    const totalTicketsByRaffle: Record<string, number> = {};

    for (const t of allTickets as any[]) {
      totalTicketsByRaffle[t.raffleId] = (totalTicketsByRaffle[t.raffleId] || 0) + 1;
    }
    for (const t of myTickets as any[]) {
      myTicketsByRaffle[t.raffleId] = (myTicketsByRaffle[t.raffleId] || 0) + 1;
    }

    return {
      raffles: db.rafflesData,
      allUsers: repo.select("users"),
      highlightedRaffleId: db.highlightedRaffleIdData,
      myTicketsByRaffle,
      totalTicketsByRaffle,
    };
  });
};
