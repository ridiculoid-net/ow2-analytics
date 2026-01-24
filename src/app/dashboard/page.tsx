import Link from "next/link";
import { fetchAllForDashboard } from "@/lib/db";
import { Card, CardContent, Badge } from "@/components/ui";

function ratio(k: number, d: number, a: number) {
  const kd = d === 0 ? k + a : (k + a) / d;
  return kd.toFixed(2);
}

function pct(n: number, d: number) {
  if (!d) return 0;
  return Math.round((n / d) * 100);
}

function fmt(n: number) {
  return n.toLocaleString("en-US");
}

export default async function DashboardPage() {
  const { matches, stats } = await fetchAllForDashboard(90);

  const total = matches.length;
  const wins = matches.filter((m) => m.result === "W").length;
  const losses = matches.filter((m) => m.result === "L").length;
  const draws = matches.filter((m) => m.result === "D").length;
  const winRate = pct(wins, total);

  const matchById = new Map(matches.map((m) => [m.id, m]));

  const statsByMatch = new Map<string, typeof stats>();
  for (const s of stats) {
    const list = statsByMatch.get(s.match_id) ?? [];
    list.push(s);
    statsByMatch.set(s.match_id, list);
  }

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
    const match = matchById.get(s.match_id);
    if (match?.result === "W") cur.wins += 1;
    byHero.set(hero, cur);
  }
  const topHeroes = Array.from(byHero.entries())
    .sort((a, b) => b[1].games - a[1].games)
    .slice(0, 8);

  const byPlayer = new Map<
    string,
    { k: number; d: number; a: number; games: number; dmg: number; heal: number; mit: number }
  >();
  for (const s of stats) {
    const cur = byPlayer.get(s.player_key) ?? { k: 0, d: 0, a: 0, games: 0, dmg: 0, heal: 0, mit: 0 };
    cur.k += s.kills ?? 0;
    cur.d += s.deaths ?? 0;
    cur.a += s.assists ?? 0;
    cur.dmg += s.damage ?? 0;
    cur.heal += s.healing ?? 0;
    cur.mit += s.mitigation ?? 0;
    cur.games += 1;
    byPlayer.set(s.player_key, cur);
  }

  const rid = byPlayer.get("ridiculoid") ?? { k: 0, d: 0, a: 0, games: 0, dmg: 0, heal: 0, mit: 0 };
  const but = byPlayer.get("buttstough") ?? { k: 0, d: 0, a: 0, games: 0, dmg: 0, heal: 0, mit: 0 };

  const avg = (totalValue: number, games: number) => (games ? Math.round(totalValue / games) : 0);

  const modes = ["QP", "COMP", "CUSTOM", "OTHER"] as const;
  const modeCounts = modes.map((mode) => ({
    mode,
    count: matches.filter((m) => m.mode === mode).length,
  }));
  const maxMode = Math.max(1, ...modeCounts.map((m) => m.count));

  const recent = [...matches]
    .sort((a, b) => new Date(b.played_at).getTime() - new Date(a.played_at).getTime())
    .slice(0, 10)
    .map((m) => {
      const rows = statsByMatch.get(m.id) ?? [];
      const dmg = rows.reduce((acc, r) => acc + (r.damage ?? 0), 0);
      const heal = rows.reduce((acc, r) => acc + (r.healing ?? 0), 0);
      const mit = rows.reduce((acc, r) => acc + (r.mitigation ?? 0), 0);
      return { match: m, dmg, heal, mit };
    })
    .reverse();

  const maxRecent = Math.max(1, ...recent.map((r) => r.dmg + r.heal + r.mit));

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl md:text-4xl tracking-widest text-foreground text-glow">DASHBOARD</h1>
          <p className="mt-3 font-body text-muted-foreground">
            Rolling 90 days. Import more matches to improve signal.
          </p>
        </div>
        <Link href="/import" className="text-xs font-mono tracking-widest text-primary underline">
          IMPORT &gt;
        </Link>
      </div>

      <div className="mt-6 grid md:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="panel-title font-display tracking-widest text-sm text-muted-foreground">MATCHES</div>
            <div className="mt-2 font-display text-4xl tracking-widest text-foreground">{total}</div>
            <div className="mt-3 text-xs font-mono tracking-widest text-muted-foreground">W {wins} / L {losses} / D {draws}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="panel-title font-display tracking-widest text-sm text-muted-foreground">WIN RATE</div>
            <div className="mt-2 font-display text-4xl tracking-widest text-foreground">{winRate}%</div>
            <div className="mt-3 h-2 rounded-full bg-border/60 overflow-hidden">
              <div className="h-full bg-primary" style={{ width: `${winRate}%` }} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="panel-title font-display tracking-widest text-sm text-muted-foreground">RIDICULOID KDA</div>
            <div className="mt-2 font-mono text-2xl tracking-widest text-foreground">
              {rid.k}/{rid.d}/{rid.a} <span className="text-primary">({ratio(rid.k, rid.d, rid.a)})</span>
            </div>
            <div className="mt-2 text-xs font-mono tracking-widest text-muted-foreground">GAMES: {rid.games}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="panel-title font-display tracking-widest text-sm text-muted-foreground">BUTTSTOUGH KDA</div>
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
            <div className="panel-title font-display tracking-widest text-sm text-foreground">PLAYER OUTPUT</div>
            <div className="mt-4 grid md:grid-cols-2 gap-4 text-xs font-mono tracking-widest">
              {[
                { label: "RIDICULOID", data: rid },
                { label: "BUTTSTOUGH", data: but },
              ].map((p) => (
                <div key={p.label} className="border border-border rounded-lg bg-muted/10 p-4">
                  <div className="text-primary">{p.label}</div>
                  <div className="mt-2 text-muted-foreground">AVG DMG: <span className="text-foreground">{fmt(avg(p.data.dmg, p.data.games))}</span></div>
                  <div className="mt-1 text-muted-foreground">AVG HEAL: <span className="text-foreground">{fmt(avg(p.data.heal, p.data.games))}</span></div>
                  <div className="mt-1 text-muted-foreground">AVG MIT: <span className="text-foreground">{fmt(avg(p.data.mit, p.data.games))}</span></div>
                  <div className="mt-2 text-muted-foreground">KDA/GM: <span className="text-foreground">{ratio(avg(p.data.k, p.data.games), avg(p.data.d, p.data.games), avg(p.data.a, p.data.games))}</span></div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/40">
          <CardContent className="p-6">
            <div className="panel-title font-display tracking-widest text-sm text-foreground">MODE BREAKDOWN</div>
            <div className="mt-4 grid gap-3">
              {modeCounts.map((m) => (
                <div key={m.mode} className="grid grid-cols-[80px_1fr_40px] items-center gap-3">
                  <div className="text-xs font-mono tracking-widest text-muted-foreground">{m.mode}</div>
                  <div className="h-2 rounded-full bg-border/60 overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${Math.max(5, Math.round((m.count / maxMode) * 100))}%` }} />
                  </div>
                  <div className="text-xs font-mono tracking-widest text-muted-foreground text-right">{m.count}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid lg:grid-cols-2 gap-4">
        <Card className="bg-card/40">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="panel-title font-display tracking-widest text-sm text-foreground">TOP MAPS</div>
              <Link href="/dashboard/maps" className="text-xs font-mono tracking-widest text-primary underline">
                VIEW ALL &gt;
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
                      <span className="text-primary">&gt;</span>
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
              <div className="panel-title font-display tracking-widest text-sm text-foreground">TOP HEROES</div>
              <Link href="/dashboard/heroes" className="text-xs font-mono tracking-widest text-primary underline">
                VIEW ALL &gt;
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
                      <span className="text-primary">&gt;</span>
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

      <div className="mt-6 grid lg:grid-cols-2 gap-4">
        <Card className="bg-card/40">
          <CardContent className="p-6">
            <div className="panel-title font-display tracking-widest text-sm text-foreground">RECENT OUTPUT (LAST 10)</div>
            <div className="mt-4 grid gap-3">
              {recent.map((r, idx) => {
                const totalOut = r.dmg + r.heal + r.mit;
                const width = Math.max(4, Math.round((totalOut / maxRecent) * 100));
                return (
                  <div key={`${r.match.id}-${idx}`} className="grid grid-cols-[52px_1fr_60px] items-center gap-3">
                    <Badge variant={r.match.result === "W" ? "success" : r.match.result === "L" ? "danger" : "secondary"}>
                      {r.match.result}
                    </Badge>
                    <div className="h-2 rounded-full bg-border/60 overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${width}%` }} />
                    </div>
                    <div className="text-xs font-mono tracking-widest text-muted-foreground text-right">{fmt(totalOut)}</div>
                  </div>
                );
              })}
              {recent.length === 0 ? (
                <div className="text-xs font-mono tracking-widest text-muted-foreground">NO DATA</div>
              ) : null}
            </div>
            <div className="mt-3 text-[10px] font-mono tracking-widest text-muted-foreground">
              Output = damage + healing + mitigation
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/40">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="panel-title font-display tracking-widest text-sm text-foreground">STREAKS</div>
              <Link href="/dashboard/streaks" className="text-xs font-mono tracking-widest text-primary underline">
                VIEW &gt;
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
