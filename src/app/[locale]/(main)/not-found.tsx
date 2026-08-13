import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Compass, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function NotFound() {
  const t = await getTranslations("notFound");
  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center px-6 py-24 text-center">
      <Compass className="h-12 w-12 text-primary" />
      <h1 className="mt-4 text-3xl font-bold">{t("title")}</h1>
      <p className="mt-2 max-w-md text-muted-foreground">{t("body")}</p>
      <div className="mt-6 flex gap-3">
        <Button asChild>
          <Link href="/">
            <Home className="h-4 w-4" />
            {t("backHome")}
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/lessons">{t("allLessons")}</Link>
        </Button>
      </div>
    </div>
  );
}
