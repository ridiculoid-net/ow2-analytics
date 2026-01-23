import { Card, CardContent } from "@/components/ui";

export default function SettingsPage() {
  return (
    <div className="container mx-auto px-4 py-10 max-w-3xl">
      <h1 className="font-display text-3xl md:text-4xl tracking-widest text-foreground">SETTINGS</h1>
      <p className="mt-3 font-body text-muted-foreground">
        This MVP locks player identifiers to match your scoreboard OCR rows.
      </p>

      <Card className="mt-6 bg-card/40">
        <CardContent className="p-6">
          <div className="font-display tracking-widest text-sm text-foreground">PLAYERS</div>
          <div className="mt-4 grid md:grid-cols-2 gap-3">
            <div className="border border-border rounded-lg bg-muted/10 p-4">
              <div className="text-xs font-mono tracking-widest text-muted-foreground">PLAYER A</div>
              <div className="mt-2 font-display tracking-widest text-primary">ridiculoid</div>
            </div>
            <div className="border border-border rounded-lg bg-muted/10 p-4">
              <div className="text-xs font-mono tracking-widest text-muted-foreground">PLAYER B</div>
              <div className="mt-2 font-display tracking-widest text-primary">buttstough</div>
            </div>
          </div>

          <div className="mt-6 text-xs font-mono tracking-widest text-muted-foreground">
            To change these later, update <span className="text-foreground">src/types/index.ts</span> and the importer.
          </div>
        </CardContent>
      </Card>

      <Card className="mt-4 bg-card/40">
        <CardContent className="p-6">
          <div className="font-display tracking-widest text-sm text-foreground">PASSCODE</div>
          <p className="mt-3 text-sm font-body text-muted-foreground">
            Access is gated by a shared passcode (<span className="text-foreground">APP_PASSCODE</span> env var). The app
            sets a secure cookie after login.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
