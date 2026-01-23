import Link from "next/link";
import { fetchAllForDashboard } from "@/lib/db";
import { Card, CardContent, Badge } from "@/components/ui";

export default async function HeroesPage() {
  const { matches, stats } = await fetchAllForDashboard(365);

  const matchById = new Map(matches.map((m) => [m.id, m]));
  const byHero = new Map<string, { picks: number; wins: number }>();

  for (const s of stats) {
    const hero = (s.hero || "Unknown").toUpperCase();
    const cur = byHero.get(hero) ?? { picks: 0, wins: 0 };
    cur.picks += 1;
    const m = matchById.get(s.match_id);
    if (m?.result === "W") cur.wins += 1;
    byHero.set(hero, cur);
  }

  const rows = Array.from(byHero.entries()).sort((a, b) => b[1].picks - a[1].picks);

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

      <Card className="mt-6 bg-card/40">
        <CardContent className="p-6">
          <div className="grid gap-2">
            {rows.map(([hero, v]) => {
              const wr = v.picks ? Math.round((v.wins / v.picks) * 100) : 0;
              return (
                <div key={hero} className="flex items-center justify-between gap-3 border border-border rounded-lg bg-muted/10 px-3 py-2">
                  <div className="font-display tracking-widest text-xs text-foreground">{hero}</div>
                  <div className="flex items-center gap-2 text-xs font-mono tracking-widest text-muted-foreground">
                    <Badge variant={wr >= 55 ? "success" : wr >= 45 ? "warning" : "danger"}>{wr}% WR</Badge>
                    <span className="text-primary">{v.picks} PICKS</span>
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
