import Link from "next/link";
import { fetchAllForDashboard } from "@/lib/db";
import { Card, CardContent, Badge } from "@/components/ui";

export default async function HeroesPage() {
  const { matches, stats } = await fetchAllForDashboard(365);

  const matchById = new Map(matches.map((m) => [m.id, m]));
  const byHero = new Map<string, { picks: number; wins: number; rid: number; but: number }>();

  for (const s of stats) {
    const hero = (s.hero || "Unknown").toUpperCase();
    const cur = byHero.get(hero) ?? { picks: 0, wins: 0, rid: 0, but: 0 };
    cur.picks += 1;
    const m = matchById.get(s.match_id);
    if (m?.result === "W") cur.wins += 1;
    if (s.player_key === "ridiculoid") cur.rid += 1;
    if (s.player_key === "buttstough") cur.but += 1;
    byHero.set(hero, cur);
  }

  const rows = Array.from(byHero.entries()).sort((a, b) => b[1].picks - a[1].picks);
  const totalPicks = stats.length;
  const totalHeroes = byHero.size;
  const mostPicked = rows[0];
  const bestWinRate = rows
    .filter(([, v]) => v.picks >= 5)
    .sort((a, b) => (b[1].wins / b[1].picks) - (a[1].wins / a[1].picks))[0];
  const ridGames = stats.filter((s) => s.player_key === "ridiculoid").length;
  const butGames = stats.filter((s) => s.player_key === "buttstough").length;

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl md:text-4xl tracking-widest text-foreground">HEROES</h1>
          <p className="mt-3 font-body text-muted-foreground">All-time hero picks (per player-row).</p>
        </div>
        <Link href="/dashboard" className="text-xs font-mono tracking-widest text-primary underline">
          BACK →
        </Link>
      </div>

      <div className="mt-6 grid md:grid-cols-3 gap-3">
        <Card className="bg-card/40">
          <CardContent className="p-4">
            <div className="text-xs font-mono tracking-widest text-muted-foreground">TOTAL PICKS</div>
            <div className="mt-2 font-display text-2xl tracking-widest text-foreground">{totalPicks}</div>
            <div className="mt-1 text-[10px] font-mono tracking-widest text-muted-foreground">{totalHeroes} HEROES</div>
          </CardContent>
        </Card>
        <Card className="bg-card/40">
          <CardContent className="p-4">
            <div className="text-xs font-mono tracking-widest text-muted-foreground">MOST PICKED</div>
            <div className="mt-2 font-display text-sm tracking-widest text-foreground">{mostPicked?.[0] ?? "—"}</div>
            <div className="mt-1 text-[10px] font-mono tracking-widest text-muted-foreground">
              {mostPicked ? `${mostPicked[1].picks} PICKS` : "NO DATA"}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/40">
          <CardContent className="p-4">
            <div className="text-xs font-mono tracking-widest text-muted-foreground">BEST WR (5+)</div>
            <div className="mt-2 font-display text-sm tracking-widest text-foreground">{bestWinRate?.[0] ?? "—"}</div>
            <div className="mt-1 text-[10px] font-mono tracking-widest text-muted-foreground">
              {bestWinRate ? `${Math.round((bestWinRate[1].wins / bestWinRate[1].picks) * 100)}% WR` : "NO DATA"}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4 bg-card/40">
        <CardContent className="p-6">
          <div className="grid gap-2">
            {rows.map(([hero, v]) => {
              const wr = v.picks ? Math.round((v.wins / v.picks) * 100) : 0;
              const share = totalPicks ? Math.round((v.picks / totalPicks) * 100) : 0;
              return (
                <div key={hero} className="flex flex-col gap-2 border border-border rounded-lg bg-muted/10 px-3 py-2">
                  <div className="flex items-baseline gap-2 min-w-0">
                    <div className="min-w-0 truncate font-display tracking-widest text-xs text-foreground">{hero}</div>
                    <span className="text-[10px] font-mono tracking-widest text-primary">{v.picks} PICKS</span>
                  </div>
                  <div className="flex flex-nowrap items-center gap-1.5 text-[10px] font-mono tracking-widest text-muted-foreground sm:text-xs">
                    <Badge
                      variant={wr >= 55 ? "success" : wr >= 45 ? "warning" : "danger"}
                      className="px-1.5 py-0 text-[10px] sm:text-xs"
                    >
                      {wr}% WR
                    </Badge>
                    <Badge variant="info" className="px-1.5 py-0 text-[10px] sm:text-xs">
                      {share}% PICKS
                    </Badge>
                    <Badge variant="info" className="px-1.5 py-0 text-[10px] sm:text-xs">
                      RID {ridGames ? Math.round((v.rid / ridGames) * 100) : 0}%
                    </Badge>
                    <Badge variant="info" className="px-1.5 py-0 text-[10px] sm:text-xs">
                      BUT {butGames ? Math.round((v.but / butGames) * 100) : 0}%
                    </Badge>
                  </div>
                </div>
              );
            })}
            {rows.length === 0 ? <div className="text-xs font-mono tracking-widest text-muted-foreground">NO DATA</div> : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
