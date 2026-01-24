import { listMatches, listMatchStats } from "@/lib/db";
import { deleteMatchAction } from "@/app/actions";
import { Card, CardContent, Badge, Button } from "@/components/ui";
import Link from "next/link";

function kda(k: number, d: number, a: number) {
  return `${k}/${d}/${a}`;
}

export const dynamic = "force-dynamic";

export default async function MatchesPage() {
  const matches = await listMatches(100);
  const stats = await listMatchStats(matches.map((m) => m.id));

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl md:text-4xl tracking-widest text-foreground">MATCHES</h1>
          <p className="mt-3 font-body text-muted-foreground">
            Recent imports. Click a match to view the screenshot.
          </p>
        </div>
        <Link href="/import" className="text-xs font-mono tracking-widest text-primary underline">
          IMPORT MORE &gt;
        </Link>
      </div>

      <div className="mt-6 grid gap-3">
        {matches.map((m) => {
          const rows = stats.filter((s) => s.match_id === m.id);
          const rid = rows.find((r) => r.player_key === "ridiculoid");
          const but = rows.find((r) => r.player_key === "buttstough");

          return (
            <Card key={m.id} className="bg-card/40 hover:bg-card/60 transition-colors">
              <CardContent className="p-5">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Badge variant={m.result === "W" ? "success" : m.result === "L" ? "danger" : "secondary"}>
                      {m.result}
                    </Badge>
                    <div>
                      <div className="font-display tracking-widest text-sm text-foreground">
                        {m.map} - {m.mode}
                      </div>
                      <div className="mt-1 text-[11px] font-mono tracking-widest text-muted-foreground">
                        {new Date(m.played_at).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono tracking-widest text-muted-foreground">
                    <div className="border border-border rounded-lg px-3 py-2 bg-muted/10">
                      <div className="text-primary">RIDICULOID</div>
                      <div className="mt-1">{rid ? `${rid.hero} - ${kda(rid.kills, rid.deaths, rid.assists)}` : "--"}</div>
                    </div>
                    <div className="border border-border rounded-lg px-3 py-2 bg-muted/10">
                      <div className="text-primary">BUTTSTOUGH</div>
                      <div className="mt-1">{but ? `${but.hero} - ${kda(but.kills, but.deaths, but.assists)}` : "--"}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {m.screenshot_url ? (
                      <a
                        href={m.screenshot_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-mono tracking-widest text-primary underline"
                      >
                        VIEW SCREENSHOT &gt;
                      </a>
                    ) : null}
                    <Link href={`/matches/${m.id}/edit`} className="text-xs font-mono tracking-widest text-primary underline">
                      EDIT
                    </Link>
                    <form action={deleteMatchAction}>
                      <input type="hidden" name="matchId" value={m.id} />
                      <Button type="submit" variant="outline" className="text-xs font-mono tracking-widest">
                        DELETE
                      </Button>
                    </form>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {matches.length === 0 ? (
          <div className="text-xs font-mono tracking-widest text-muted-foreground border border-border bg-card/40 rounded-xl p-6">
            NO MATCHES YET. IMPORT YOUR FIRST ONE.
          </div>
        ) : null}
      </div>
    </div>
  );
}
