import { Link } from "@/i18n/navigation";
import { Compass, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center px-6 py-24 text-center">
      <Compass className="h-12 w-12 text-primary" />
      <h1 className="mt-4 text-3xl font-bold">Page not found</h1>
      <p className="mt-2 max-w-md text-muted-foreground">
        That page doesn&apos;t exist — maybe the lesson was moved or renamed.
      </p>
      <div className="mt-6 flex gap-3">
        <Button asChild>
          <Link href="/">
            <Home className="h-4 w-4" />
            Back home
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/lessons">All lessons</Link>
        </Button>
      </div>
    </div>
  );
}
