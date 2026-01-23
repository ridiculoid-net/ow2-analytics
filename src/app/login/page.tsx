import { loginWithPasscode } from "@/app/actions";
import { Card, CardContent, Button, Input } from "@/components/ui";

export default function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string; error?: string };
}) {
  const nextPath = searchParams?.next ?? "/";
  const error = searchParams?.error === "1";

  return (
    <div className="container mx-auto px-4 py-14 max-w-xl">
      <div className="text-center">
        <h1 className="font-display text-3xl md:text-4xl tracking-widest text-foreground">
          ACCESS REQUIRED
        </h1>
        <p className="mt-3 font-body text-muted-foreground">
          Enter the shared passcode for <span className="text-primary">ridiculoid // buttstough</span>.
        </p>
      </div>

      <Card className="mt-8">
        <CardContent className="p-6">
          {error ? (
            <div className="mb-4 text-xs font-mono tracking-widest text-danger">
              INVALID PASSCODE
            </div>
          ) : null}

          <form action={loginWithPasscode} className="space-y-4">
            <input type="hidden" name="next" value={nextPath} />
            <div>
              <label className="block text-xs font-display tracking-widest text-muted-foreground mb-2">
                PASSCODE
              </label>
              <Input name="passcode" type="password" placeholder="••••••••" required />
            </div>

            <Button type="submit" className="w-full">
              UNLOCK
            </Button>

            <p className="text-[11px] font-mono tracking-widest text-muted-foreground">
              TIP: set <span className="text-foreground">APP_PASSCODE</span> in your environment.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
