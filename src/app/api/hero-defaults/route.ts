import { NextResponse } from "next/server";
import { fetchAllForDashboard } from "@/lib/db";
import type { PlayerKey } from "@/types";

type HeroDefault = {
  hero: string;
  source: "recent" | "mostPlayed";
};

const PLAYER_KEYS: PlayerKey[] = ["ridiculoid", "buttstough"];

export async function GET() {
  const { matches, stats } = await fetchAllForDashboard(365);
  const matchById = new Map(matches.map((m) => [m.id, m]));

  const countsByPlayer = new Map<PlayerKey, Map<string, number>>();
  const recentByPlayer = new Map<PlayerKey, { hero: string; playedAt: string }>();

  for (const s of stats) {
    const hero = (s.hero ?? "").trim();
    if (!hero) continue;

    const playerKey = s.player_key as PlayerKey;
    const counts = countsByPlayer.get(playerKey) ?? new Map<string, number>();
    counts.set(hero, (counts.get(hero) ?? 0) + 1);
    countsByPlayer.set(playerKey, counts);

    const match = matchById.get(s.match_id);
    if (match?.played_at) {
      const existing = recentByPlayer.get(playerKey);
      if (!existing || new Date(match.played_at) > new Date(existing.playedAt)) {
        recentByPlayer.set(playerKey, { hero, playedAt: match.played_at });
      }
    }
  }

  const defaults: Partial<Record<PlayerKey, HeroDefault>> = {};

  for (const key of PLAYER_KEYS) {
    const recent = recentByPlayer.get(key);
    if (recent?.hero) {
      defaults[key] = { hero: recent.hero, source: "recent" };
      continue;
    }

    const counts = countsByPlayer.get(key);
    if (counts) {
      let bestHero: string | null = null;
      let bestCount = -1;
      for (const [hero, count] of counts.entries()) {
        if (count > bestCount) {
          bestHero = hero;
          bestCount = count;
        }
      }
      if (bestHero) {
        defaults[key] = { hero: bestHero, source: "mostPlayed" };
      }
    }
  }

  return NextResponse.json({ defaults });
}
