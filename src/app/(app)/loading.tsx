import { Skeleton } from "@/components/ui/misc";

export default function Loading() {
  return (
    <div className="animate-fade-in space-y-6" aria-busy="true" aria-label="Carregando">
      <div className="space-y-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[120px] rounded-2xl" />)}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-[340px] rounded-2xl lg:col-span-2" />
        <Skeleton className="h-[340px] rounded-2xl" />
      </div>
      <Skeleton className="h-[240px] rounded-2xl" />
    </div>
  );
}
