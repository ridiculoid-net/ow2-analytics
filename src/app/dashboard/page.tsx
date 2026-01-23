import Link from "next/link";
import { fetchAllForDashboard } from "@/lib/db";
import { Card, CardContent, Badge } from "@/components/ui";

function ratio(k: number, d: number, a: number) {
  const kd = d === 0 ? k + a : (k + a) / d;
  return kd.toFixed(2);
}

export default async function DashboardPage() {
  const { matches, stats } = await fetchAllForDashboard(90);

  const total = matches.length;

  const byMap = new Map<string, { games: number; wins: number; losses: number; draws: number }>();
  for (const m of matches) {
    const key = m.map || "UNKNOWN";
    const cur = byMap.get(key) ?? { games: 0, wins: 0, losses: 0, draws: 0 };
    cur.games += 1;
    if (m.result === "W") cur.wins += 1;
    else if (m.result === "L") cur.losses += 1;
    else cur.draws += 1;
    byMap.set(key, cur);
  }
  const topMaps = Array.from(byMap.entries())
    .sort((a, b) => b[1].games - a[1].games)
    .slice(0, 8);

  const byHero = new Map<string, { games: number; wins: number }>();
  for (const s of stats) {
    const hero = (s.hero || "Unknown").toUpperCase();
    const cur = byHero.get(hero) ?? { games: 0, wins: 0 };
    cur.games += 1;
    const match = matches.find((m) => m.id === s.match_id);
    if (match?.result === "W") cur.wins += 1;
    byHero.set(hero, cur);
  }
  const topHeroes = Array.from(byHero.entries())
    .sort((a, b) => b[1].games - a[1].games)
    .slice(0, 8);

  const byPlayer = new Map<string, { k: number; d: number; a: number; games: number }>();
  for (const s of stats) {
    const cur = byPlayer.get(s.player_key) ?? { k: 0, d: 0, a: 0, games: 0 };
    cur.k += s.kills ?? 0;
    cur.d += s.deaths ?? 0;
    cur.a += s.assists ?? 0;
    cur.games += 1;
    byPlayer.set(s.player_key, cur);
  }

  const rid = byPlayer.get("ridiculoid") ?? { k: 0, d: 0, a: 0, games: 0 };
  const but = byPlayer.get("buttstough") ?? { k: 0, d: 0, a: 0, games: 0 };

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl md:text-4xl tracking-widest text-foreground">DASHBOARD</h1>
          <p className="mt-3 font-body text-muted-foreground">
            Rolling 90 days. Import more matches to improve signal.
          </p>
        </div>
        <Link href="/import" className="text-xs font-mono tracking-widest text-primary underline">
          IMPORT →
        </Link>
      </div>

      <div className="mt-6 grid md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="font-display tracking-widest text-sm text-muted-foreground">MATCHES</div>
            <div className="mt-2 font-display text-4xl tracking-widest text-foreground">{total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="font-display tracking-widest text-sm text-muted-foreground">RIDICULOID (KDA)</div>
            <div className="mt-2 font-mono text-2xl tracking-widest text-foreground">
              {rid.k}/{rid.d}/{rid.a} <span className="text-primary">({ratio(rid.k, rid.d, rid.a)})</span>
            </div>
            <div className="mt-2 text-xs font-mono tracking-widest text-muted-foreground">GAMES: {rid.games}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="font-display tracking-widest text-sm text-muted-foreground">BUTTSTOUGH (KDA)</div>
            <div className="mt-2 font-mono text-2xl tracking-widest text-foreground">
              {but.k}/{but.d}/{but.a} <span className="text-primary">({ratio(but.k, but.d, but.a)})</span>
            </div>
            <div className="mt-2 text-xs font-mono tracking-widest text-muted-foreground">GAMES: {but.games}</div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid lg:grid-cols-2 gap-4">
        <Card className="bg-card/40">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="font-display tracking-widest text-sm text-foreground">TOP MAPS</div>
              <Link href="/dashboard/maps" className="text-xs font-mono tracking-widest text-primary underline">
                VIEW ALL →
              </Link>
            </div>

            <div className="mt-4 grid gap-2">
              {topMaps.map(([name, v]) => {
                const wr = v.games ? Math.round((v.wins / v.games) * 100) : 0;
                return (
                  <div
                    key={name}
                    className="flex items-center justify-between gap-3 border border-border rounded-lg bg-muted/10 px-3 py-2"
                  >
                    <div className="font-display tracking-widest text-xs text-foreground">{name}</div>
                    <div className="flex items-center gap-2 text-xs font-mono tracking-widest text-muted-foreground">
                      <Badge variant={wr >= 55 ? "success" : wr >= 45 ? "warning" : "danger"}>{wr}% WR</Badge>
                      <span>{v.games} G</span>
                      <span className="text-primary">→</span>
                    </div>
                  </div>
                );
              })}

              {topMaps.length === 0 ? (
                <div className="text-xs font-mono tracking-widest text-muted-foreground">NO DATA</div>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/40">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="font-display tracking-widest text-sm text-foreground">TOP HEROES</div>
              <Link href="/dashboard/heroes" className="text-xs font-mono tracking-widest text-primary underline">
                VIEW ALL →
              </Link>
            </div>

            <div className="mt-4 grid gap-2">
              {topHeroes.map(([hero, v]) => {
                const wr = v.games ? Math.round((v.wins / v.games) * 100) : 0;
                return (
                  <div
                    key={hero}
                    className="flex items-center justify-between gap-3 border border-border rounded-lg bg-muted/10 px-3 py-2"
                  >
                    <div className="font-display tracking-widest text-xs text-foreground">{hero}</div>
                    <div className="flex items-center gap-2 text-xs font-mono tracking-widest text-muted-foreground">
                      <Badge variant={wr >= 55 ? "success" : wr >= 45 ? "warning" : "danger"}>{wr}% WR</Badge>
                      <span>{v.games} PICKS</span>
                      <span className="text-primary">→</span>
                    </div>
                  </div>
                );
              })}

              {topHeroes.length === 0 ? (
                <div className="text-xs font-mono tracking-widest text-muted-foreground">NO DATA</div>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <Card className="bg-card/40">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="font-display tracking-widest text-sm text-foreground">STREAKS</div>
              <Link href="/dashboard/streaks" className="text-xs font-mono tracking-widest text-primary underline">
                VIEW →
              </Link>
            </div>
            <p className="mt-3 text-sm font-body text-muted-foreground">
              Streak computations are available on the streaks page.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
