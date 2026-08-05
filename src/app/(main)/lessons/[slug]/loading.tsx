import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto flex w-full max-w-6xl gap-10 px-6 py-10">
      <div className="min-w-0 flex-1">
        <Skeleton className="mb-4 h-4 w-48" />
        <Skeleton className="mb-3 h-9 w-3/4" />
        <Skeleton className="mb-6 h-5 w-2/3" />
        <div className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-11/12" />
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="mt-6 h-40 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
      <div className="hidden w-52 shrink-0 xl:block">
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  );
}
