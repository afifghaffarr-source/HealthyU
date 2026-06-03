import { cn } from "@/lib/utils";

function Bone({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-md bg-muted relative overflow-hidden motion-safe:animate-pulse motion-reduce:opacity-60",
        className,
      )}
    />
  );
}

export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-3xl bg-card outline-1 outline-black/5 p-4 space-y-3 shadow-sm", className)}>
      <Bone className="h-4 w-2/3" />
      <Bone className="h-3 w-full" />
      <Bone className="h-3 w-4/5" />
    </div>
  );
}

export function ListSkeleton({ count = 4, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("space-y-3", className)} aria-busy="true" aria-live="polite">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

export function StatSkeleton() {
  return (
    <div className="rounded-2xl bg-card outline-1 outline-black/5 p-3 space-y-2">
      <Bone className="h-3 w-12 mx-auto" />
      <Bone className="h-5 w-16 mx-auto" />
    </div>
  );
}