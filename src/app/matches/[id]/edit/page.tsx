import { getMatch, listMatchStats } from "@/lib/db";
import { updateMatchAction } from "@/app/actions";
import { HEROES, MAPS } from "@/lib/ow2/constants";
import { Card, CardContent, Button, Input, Select } from "@/components/ui";

const HERO_PRIORITY = ["Reinhardt", "D.Va", "Mercy", "Junkrat", "Lucio", "Torbjorn", "Bastion"];

function normalizeHeroName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function displayHeroName(name: string): string {
  const norm = normalizeHeroName(name);
  if (norm === "lucio") return "Lucio";
  if (norm === "torbjorn") return "Torbjorn";
  return name;
}

const HERO_OPTIONS = (() => {
  const byNorm = new Map(HEROES.map((h) => [normalizeHeroName(h.name), h]));
  const prioritized: { name: string; role: string }[] = [];
  const used = new Set<string>();

  for (const p of HERO_PRIORITY) {
    const found = byNorm.get(normalizeHeroName(p));
    if (found && !used.has(found.name)) {
      prioritized.push(found);
      used.add(found.name);
    }
  }

  const rest = HEROES.filter((h) => !used.has(h.name));
  return [...prioritized, ...rest];
})();

export default async function EditMatchPage({ params }: { params: { id: string } }) {
  const match = await getMatch(params.id);
  const stats = await listMatchStats([params.id]);

  const rid = stats.find((s) => s.player_key === "ridiculoid");
  const but = stats.find((s) => s.player_key === "buttstough");

  if (!match) {
    return (
      <div className="container mx-auto px-4 py-10">
        <div className="text-xs font-mono tracking-widest text-muted-foreground border border-border bg-card/40 rounded-xl p-6">
          MATCH NOT FOUND.
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-10 max-w-4xl">
      <h1 className="font-display text-3xl md:text-4xl tracking-widest text-foreground">EDIT MATCH</h1>

      <Card className="mt-6 bg-card/40">
        <CardContent className="p-6">
          <form action={updateMatchAction} className="grid gap-4">
            <input type="hidden" name="matchId" value={match.id} />
            <input type="hidden" name="screenshotUrl" value={match.screenshot_url ?? ""} />

            <div className="grid sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-display tracking-widest text-muted-foreground mb-2">PLAYED AT</label>
                <Input type="datetime-local" name="playedAt" defaultValue={new Date(match.played_at).toISOString().slice(0, 16)} />
              </div>
              <div>
                <label className="block text-xs font-display tracking-widest text-muted-foreground mb-2">MODE</label>
                <Select name="mode" defaultValue={match.mode}>
                  <option value="QP">QP</option>
                  <option value="COMP">COMP</option>
                  <option value="CUSTOM">CUSTOM</option>
                  <option value="OTHER">OTHER</option>
                </Select>
              </div>
              <div>
                <label className="block text-xs font-display tracking-widest text-muted-foreground mb-2">RESULT</label>
                <Select name="result" defaultValue={match.result}>
                  <option value="W">W</option>
                  <option value="L">L</option>
                  <option value="D">D</option>
                </Select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-display tracking-widest text-muted-foreground mb-2">MAP</label>
              <Input list="map-options" name="map" defaultValue={match.map} />
              <datalist id="map-options">
                {MAPS.map((m) => (
                  <option key={m} value={m} />
                ))}
              </datalist>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <Card className="bg-card/40">
                <CardContent className="p-4">
                  <div className="font-display tracking-widest text-sm text-foreground">RIDICULOID</div>
                  <input type="hidden" name="playerKey_ridiculoid" value="ridiculoid" />

                  <div className="mt-3 grid gap-2">
                    <label className="block text-[10px] font-display tracking-widest text-muted-foreground">HERO</label>
                    <Select name="hero_ridiculoid" defaultValue={rid?.hero ?? "Unknown"}>
                      <option value="Unknown">Unknown</option>
                      {HERO_OPTIONS.map((h) => (
                        <option key={`rid-${h.name}`} value={h.name}>
                          {displayHeroName(h.name)}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] font-display tracking-widest text-muted-foreground">K</label>
                      <Input name="kills_ridiculoid" defaultValue={rid?.kills ?? 0} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-display tracking-widest text-muted-foreground">D</label>
                      <Input name="deaths_ridiculoid" defaultValue={rid?.deaths ?? 0} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-display tracking-widest text-muted-foreground">A</label>
                      <Input name="assists_ridiculoid" defaultValue={rid?.assists ?? 0} />
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] font-display tracking-widest text-muted-foreground">DMG</label>
                      <Input name="damage_ridiculoid" defaultValue={rid?.damage ?? 0} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-display tracking-widest text-muted-foreground">H</label>
                      <Input name="healing_ridiculoid" defaultValue={rid?.healing ?? 0} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-display tracking-widest text-muted-foreground">MIT</label>
                      <Input name="mitigation_ridiculoid" defaultValue={rid?.mitigation ?? 0} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card/40">
                <CardContent className="p-4">
                  <div className="font-display tracking-widest text-sm text-foreground">BUTTSTOUGH</div>
                  <input type="hidden" name="playerKey_buttstough" value="buttstough" />

                  <div className="mt-3 grid gap-2">
                    <label className="block text-[10px] font-display tracking-widest text-muted-foreground">HERO</label>
                    <Select name="hero_buttstough" defaultValue={but?.hero ?? "Unknown"}>
                      <option value="Unknown">Unknown</option>
                      {HERO_OPTIONS.map((h) => (
                        <option key={`but-${h.name}`} value={h.name}>
                          {displayHeroName(h.name)}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] font-display tracking-widest text-muted-foreground">K</label>
                      <Input name="kills_buttstough" defaultValue={but?.kills ?? 0} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-display tracking-widest text-muted-foreground">D</label>
                      <Input name="deaths_buttstough" defaultValue={but?.deaths ?? 0} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-display tracking-widest text-muted-foreground">A</label>
                      <Input name="assists_buttstough" defaultValue={but?.assists ?? 0} />
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] font-display tracking-widest text-muted-foreground">DMG</label>
                      <Input name="damage_buttstough" defaultValue={but?.damage ?? 0} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-display tracking-widest text-muted-foreground">H</label>
                      <Input name="healing_buttstough" defaultValue={but?.healing ?? 0} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-display tracking-widest text-muted-foreground">MIT</label>
                      <Input name="mitigation_buttstough" defaultValue={but?.mitigation ?? 0} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="flex items-center gap-3">
              <Button type="submit">SAVE CHANGES</Button>
              <Button type="button" variant="outline" asChild>
                <a href="/matches">CANCEL</a>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
