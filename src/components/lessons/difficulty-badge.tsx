import { Badge } from "@/components/ui/badge";
import { DIFFICULTY_LABEL, type Difficulty } from "@/lib/types";

const difficultyVariant = {
  beginner: "success",
  intermediate: "warning",
  advanced: "destructive",
} as const;

export function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  return (
    <Badge variant={difficultyVariant[difficulty]}>
      {DIFFICULTY_LABEL[difficulty]}
    </Badge>
  );
}
