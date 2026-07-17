import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        "relative overflow-hidden rounded-xl bg-secondary",
        "before:absolute before:inset-0 before:-translate-x-full before:bg-linear-to-r before:from-transparent before:via-card/60 before:to-transparent before:animate-[shimmer_1.6s_infinite]",
        className
      )}
      {...props}
    />
  );
}

export { Skeleton };
