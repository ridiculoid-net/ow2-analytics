import { cn } from "@/lib/utils";

export function StatusLine({ left, right }: { left: string; right?: string }) {
  return (
    <div className="mt-4 border border-border bg-card/40 rounded-xl px-4 py-2 relative overflow-hidden">
      <div className="absolute inset-0 scanlines pointer-events-none opacity-20" />
      <div className="flex items-center justify-between gap-4 text-xs font-mono tracking-widest text-muted-foreground">
        <span className={cn("text-primary")}>{left}</span>
        {right ? <span className="truncate">{right}</span> : null}
      </div>
    </div>
  );
}
