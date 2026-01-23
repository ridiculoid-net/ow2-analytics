import Link from "next/link";
import { Button, Card, CardContent } from "@/components/ui";
import { StatusLine } from "@/components/status-line";
import { Upload, LayoutDashboard, Activity } from "lucide-react";

export default function HomePage() {
  return (
    <div className="container mx-auto px-4 py-10">
      <div className="relative">
        <div className="absolute -inset-6 bg-primary/10 blur-3xl rounded-full opacity-30" />
        <div className="relative">
          <h1 className="font-display text-4xl md:text-6xl tracking-widest text-foreground">
            ANALYZE YOUR STACK
          </h1>
          <p className="mt-4 font-body text-lg md:text-xl text-muted-foreground max-w-2xl">
            Screenshot import → OCR → dashboards. Maps, heroes, KDA, streaks. Zero fluff.
          </p>

          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <Button asChild size="lg" className="gap-2">
              <Link href="/import">
                <Upload className="w-4 h-4" />
                IMPORT SCREENSHOT
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="gap-2">
              <Link href="/dashboard">
                <LayoutDashboard className="w-4 h-4" />
                VIEW DASHBOARD
              </Link>
            </Button>
          </div>

          <StatusLine left="SYSTEM ONLINE • OCR READY" right="PLAYERS CONNECTED: ridiculoid, buttstough" />
        </div>
      </div>

      <div className="mt-10 grid md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-primary">
              <Activity className="w-4 h-4" />
              <span className="font-display tracking-widest text-sm">ONE IMAGE → ONE MATCH</span>
            </div>
            <p className="mt-3 text-sm font-body text-muted-foreground">
              Upload the end-of-match scoreboard screenshot that includes both players. Confirm fields once.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-primary">
              <span className="font-display tracking-widest text-sm">KDA • MAPS • HEROES</span>
            </div>
            <p className="mt-3 text-sm font-body text-muted-foreground">
              Map winrates, hero pool, and KDA trends. Built for duo decision-making.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-primary">
              <span className="font-display tracking-widest text-sm">STREAKS & SESSIONS</span>
            </div>
            <p className="mt-3 text-sm font-body text-muted-foreground">
              Track W/L streaks and sessions to spot patterns, tilt points, and “hot maps”.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
