import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import type { Difficulty } from "@/lib/types";

const difficultyVariant = {
  beginner: "success",
  intermediate: "warning",
  advanced: "destructive",
} as const;

export function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  const t = useTranslations("difficulty");
  return (
    <Badge variant={difficultyVariant[difficulty]}>{t(difficulty)}</Badge>
  );
}
