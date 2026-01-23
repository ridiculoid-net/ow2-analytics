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

      <Card className="mt-6 bg-card/40">
        <CardContent className="p-6">
          <div className="grid gap-2">
            {rows.map(([map, v]) => {
              const wr = v.games ? Math.round((v.wins / v.games) * 100) : 0;
              return (
                <div key={map} className="flex items-center justify-between gap-3 border border-border rounded-lg bg-muted/10 px-3 py-2">
                  <div className="font-display tracking-widest text-xs text-foreground">{map}</div>
                  <div className="flex items-center gap-2 text-xs font-mono tracking-widest text-muted-foreground">
                    <Badge variant={wr >= 55 ? "success" : wr >= 45 ? "warning" : "danger"}>{wr}% WR</Badge>
                    <span>{v.wins}W</span>
                    <span>{v.losses}L</span>
                    <span>{v.draws}D</span>
                    <span className="text-primary">{v.games}G</span>
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
