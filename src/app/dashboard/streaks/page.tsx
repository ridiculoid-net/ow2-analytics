import Link from "next/link";
import { fetchAllForDashboard } from "@/lib/db";
import { Card, CardContent, Badge } from "@/components/ui";

type Streak = { current: number; bestW: number; bestL: number; lastResult?: string };

function computeStreak(results: string[]): Streak {
  let current = 0;
  let bestW = 0;
  let bestL = 0;

  let run = 0;
  let runType: "W" | "L" | "D" | null = null;

  for (const r of results) {
    if (runType === r) run += 1;
    else {
      run = 1;
      runType = r as any;
    }
    if (runType === "W") bestW = Math.max(bestW, run);
    if (runType === "L") bestL = Math.max(bestL, run);
  }

  // current streak from the front
  if (results.length > 0) {
    const first = results[0];
    let i = 0;
    while (i < results.length && results[i] === first) i++;
    current = i;
    return { current, bestW, bestL, lastResult: first };
  }

  return { current: 0, bestW, bestL };
}

export default async function StreaksPage() {
  const { matches } = await fetchAllForDashboard(365);

  // same match result for both players (team result)
  const results = matches.map((m) => m.result);
  const s = computeStreak(results);

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl md:text-4xl tracking-widest text-foreground">STREAKS</h1>
          <p className="mt-3 font-body text-muted-foreground">All-time streak summary (team result).</p>
        </div>
        <Link href="/dashboard" className="text-xs font-mono tracking-widest text-primary underline">
          BACK →
        </Link>
      </div>

      <div className="mt-6 grid md:grid-cols-3 gap-4">
        <Card className="bg-card/40">
          <CardContent className="p-6">
            <div className="font-display tracking-widest text-sm text-muted-foreground">CURRENT</div>
            <div className="mt-2 flex items-center gap-2">
              <Badge variant={s.lastResult === "W" ? "success" : s.lastResult === "L" ? "danger" : "secondary"}>
                {s.lastResult ?? "—"}
              </Badge>
              <div className="font-display text-4xl tracking-widest text-foreground">{s.current}</div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/40">
          <CardContent className="p-6">
            <div className="font-display tracking-widest text-sm text-muted-foreground">BEST WIN STREAK</div>
            <div className="mt-2 font-display text-4xl tracking-widest text-foreground">{s.bestW}</div>
          </CardContent>
        </Card>

        <Card className="bg-card/40">
          <CardContent className="p-6">
            <div className="font-display tracking-widest text-sm text-muted-foreground">BEST LOSS STREAK</div>
            <div className="mt-2 font-display text-4xl tracking-widest text-foreground">{s.bestL}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
