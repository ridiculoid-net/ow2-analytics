import Link from "next/link";
import { fetchAllForDashboard } from "@/lib/db";
import { Card, CardContent, Badge } from "@/components/ui";

export default async function MapsPage() {
  const { matches } = await fetchAllForDashboard(365);

  const byMap = new Map<string, { games: number; wins: number; losses: number; draws: number }>();
  for (const m of matches) {
    const key = (m.map || "UNKNOWN").toUpperCase();
    const cur = byMap.get(key) ?? { games: 0, wins: 0, losses: 0, draws: 0 };
    cur.games += 1;
    if (m.result === "W") cur.wins += 1;
    else if (m.result === "L") cur.losses += 1;
    else cur.draws += 1;
    byMap.set(key, cur);
  }

  const rows = Array.from(byMap.entries()).sort((a, b) => b[1].games - a[1].games);
  const totalGames = matches.length;
  const totalMaps = byMap.size;
  const mostPlayed = rows[0];
  const bestWinRate = rows
    .filter(([, v]) => v.games >= 5)
    .sort((a, b) => (b[1].wins / b[1].games) - (a[1].wins / a[1].games))[0];

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl md:text-4xl tracking-widest text-foreground">MAPS</h1>
          <p className="mt-3 font-body text-muted-foreground">All-time map performance.</p>
        </div>
        <Link href="/dashboard" className="text-xs font-mono tracking-widest text-primary underline">
          BACK →
        </Link>
      </div>

      <div className="mt-6 grid md:grid-cols-3 gap-3">
        <Card className="bg-card/40">
          <CardContent className="p-4">
            <div className="text-xs font-mono tracking-widest text-muted-foreground">TOTAL GAMES</div>
            <div className="mt-2 font-display text-2xl tracking-widest text-foreground">{totalGames}</div>
            <div className="mt-1 text-[10px] font-mono tracking-widest text-muted-foreground">{totalMaps} MAPS</div>
          </CardContent>
        </Card>
        <Card className="bg-card/40">
          <CardContent className="p-4">
            <div className="text-xs font-mono tracking-widest text-muted-foreground">MOST PLAYED</div>
            <div className="mt-2 font-display text-sm tracking-widest text-foreground">{mostPlayed?.[0] ?? "—"}</div>
            <div className="mt-1 text-[10px] font-mono tracking-widest text-muted-foreground">
              {mostPlayed ? `${mostPlayed[1].games} G` : "NO DATA"}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/40">
          <CardContent className="p-4">
            <div className="text-xs font-mono tracking-widest text-muted-foreground">BEST WR (5+)</div>
            <div className="mt-2 font-display text-sm tracking-widest text-foreground">{bestWinRate?.[0] ?? "—"}</div>
            <div className="mt-1 text-[10px] font-mono tracking-widest text-muted-foreground">
              {bestWinRate ? `${Math.round((bestWinRate[1].wins / bestWinRate[1].games) * 100)}% WR` : "NO DATA"}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4 bg-card/40">
        <CardContent className="p-6">
          <div className="grid gap-2">
            {rows.map(([map, v]) => {
              const wr = v.games ? Math.round((v.wins / v.games) * 100) : 0;
              const share = totalGames ? Math.round((v.games / totalGames) * 100) : 0;
              return (
                <div key={map} className="flex flex-col gap-2 border border-border rounded-lg bg-muted/10 px-3 py-2">
                  <div className="flex items-baseline gap-2 min-w-0">
                    <div className="min-w-0 truncate font-display tracking-widest text-xs text-foreground">{map}</div>
                    <span className="text-[10px] font-mono tracking-widest text-primary">{v.games}G</span>
                  </div>
                  <div className="flex flex-nowrap items-center gap-1.5 text-[10px] font-mono tracking-widest text-muted-foreground sm:text-xs">
                    <Badge
                      variant={wr >= 55 ? "success" : wr >= 45 ? "warning" : "danger"}
                      className="px-1.5 py-0 text-[10px] sm:text-xs"
                    >
                      {wr}% WR
                    </Badge>
                    <Badge variant="info" className="px-1.5 py-0 text-[10px] sm:text-xs">
                      {share}% PLAYED
                    </Badge>
                    <span className="whitespace-nowrap">{v.wins}W</span>
                    <span className="whitespace-nowrap">{v.losses}L</span>
                    <span className="whitespace-nowrap">{v.draws}D</span>
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
