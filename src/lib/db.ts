import "server-only";
import { supabaseService } from "@/lib/supabase.server";
import type { MatchMode, MatchResult, PlayerKey } from "@/types";

export type CreateMatchInput = {
  playedAt: string; // ISO
  mode: MatchMode;
  result: MatchResult;
  map: string;
  notes?: string;
  screenshotUrl?: string;
  players: Array<{
    playerKey: PlayerKey;
    hero: string;
    kills: number;
    deaths: number;
    assists: number;
    damage?: number | null;
    healing?: number | null;
    mitigation?: number | null;
  }>;
};

export async function createMatch(input: CreateMatchInput) {
  const sb = supabaseService();

  const { data: match, error: matchErr } = await sb
    .from("matches")
    .insert({
      played_at: input.playedAt,
      mode: input.mode,
      result: input.result,
      map: input.map,
      notes: input.notes ?? null,
      screenshot_url: input.screenshotUrl ?? null,
    })
    .select("*")
    .single();

  if (matchErr) throw new Error(matchErr.message);

  const rows = input.players.map((p) => ({
    match_id: match.id,
    player_key: p.playerKey,
    hero: p.hero,
    kills: p.kills,
    deaths: p.deaths,
    assists: p.assists,
    damage: p.damage ?? null,
    healing: p.healing ?? null,
    mitigation: p.mitigation ?? null,
  }));

  const { error: statsErr } = await sb.from("match_player_stats").insert(rows);
  if (statsErr) throw new Error(statsErr.message);

  return match;
}

export async function updateMatch(matchId: string, input: CreateMatchInput) {
  const sb = supabaseService();

  const { error: matchErr } = await sb
    .from("matches")
    .update({
      played_at: input.playedAt,
      mode: input.mode,
      result: input.result,
      map: input.map,
      notes: input.notes ?? null,
      screenshot_url: input.screenshotUrl ?? null,
    })
    .eq("id", matchId);

  if (matchErr) throw new Error(matchErr.message);

  const { error: deleteErr } = await sb.from("match_player_stats").delete().eq("match_id", matchId);
  if (deleteErr) throw new Error(deleteErr.message);

  const rows = input.players.map((p) => ({
    match_id: matchId,
    player_key: p.playerKey,
    hero: p.hero,
    kills: p.kills,
    deaths: p.deaths,
    assists: p.assists,
    damage: p.damage ?? null,
    healing: p.healing ?? null,
    mitigation: p.mitigation ?? null,
  }));

  const { error: statsErr } = await sb.from("match_player_stats").insert(rows);
  if (statsErr) throw new Error(statsErr.message);
}

export async function listMatches(limit = 50) {
  const sb = supabaseService();

  const { data, error } = await sb
    .from("matches")
    .select("id, played_at, mode, result, map, notes, screenshot_url, created_at")
    .order("played_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getMatch(matchId: string) {
  const sb = supabaseService();

  const { data, error } = await sb
    .from("matches")
    .select("id, played_at, mode, result, map, notes, screenshot_url, created_at")
    .eq("id", matchId)
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function listMatchStats(matchIds: string[]) {
  if (matchIds.length === 0) return [];
  const sb = supabaseService();

  const { data, error } = await sb
    .from("match_player_stats")
    .select("id, match_id, player_key, hero, kills, deaths, assists, damage, healing, mitigation")
    .in("match_id", matchIds);

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function deleteMatch(matchId: string) {
  const sb = supabaseService();

  const { error: statsErr } = await sb.from("match_player_stats").delete().eq("match_id", matchId);
  if (statsErr) throw new Error(statsErr.message);

  const { error: matchErr } = await sb.from("matches").delete().eq("id", matchId);
  if (matchErr) throw new Error(matchErr.message);
}

export async function fetchAllForDashboard(days = 60) {
  const sb = supabaseService();
  const since = new Date(Date.now() - days * 24 * 3600 * 1000).toISOString();

  const { data: matches, error: mErr } = await sb
    .from("matches")
    .select("id, played_at, mode, result, map")
    .gte("played_at", since)
    .order("played_at", { ascending: false });

  if (mErr) throw new Error(mErr.message);

  const ids = (matches ?? []).map((m) => m.id);
  const stats = await listMatchStats(ids);

  return { matches: matches ?? [], stats };
}
