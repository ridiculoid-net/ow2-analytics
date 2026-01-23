import Link from "next/link";
import { Button } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="container mx-auto px-4 py-14 text-center">
      <h1 className="font-display text-4xl tracking-widest text-foreground">NOT FOUND</h1>
      <p className="mt-3 font-body text-muted-foreground">The requested page does not exist.</p>
      <div className="mt-6">
        <Button asChild>
          <Link href="/">HOME</Link>
        </Button>
      </div>
    </div>
  );
}
