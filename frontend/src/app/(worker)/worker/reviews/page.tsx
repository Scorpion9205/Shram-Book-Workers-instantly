"use client";

import { Star } from "lucide-react";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/cards/EmptyState";
import { ListSkeleton } from "@/components/loaders/Skeletons";
import { Progress } from "@/components/ui/progress";
import { useGetMyWorkerProfileQuery } from "@/features/worker/workerApi";
import { useGetWorkerRatingQuery } from "@/features/reviews/reviewApi";
import { useGetWorkerReviewsQuery } from "@/features/reviews/reviewApi";

export default function WorkerReviewsPage() {
  const { data: profile } = useGetMyWorkerProfileQuery();
 const { data, isLoading } =
useGetWorkerReviewsQuery(
    profile?.id || "",
    {
        skip: !profile?.id
    }
);

  const breakdown = [5, 4, 3, 2, 1].map((star) => {
    const count = data?.reviews.filter((r) => r.rating === star).length || 0;
    const pct = data?.total ? (count / data.total) * 100 : 0;
    return { star, count, pct };
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Reviews</h1>
        <p className="text-sm text-muted-foreground">What providers are saying about your work.</p>
      </div>

      <Card className="flex flex-col items-center gap-4 p-6 sm:flex-row sm:items-start">
        <div className="text-center">
          <p className="text-4xl font-bold text-primary">{data?.average?.toFixed(1) ?? "—"}</p>
          <div className="mt-1 flex justify-center gap-0.5 text-accent">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className={`size-4 ${i < Math.round(data?.average || 0) ? "fill-current" : "opacity-30"}`} />
            ))}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{data?.total ?? 0} reviews</p>
        </div>
        <div className="flex-1 space-y-1.5">
          {breakdown.map((b) => (
            <div key={b.star} className="flex items-center gap-2">
              <span className="w-3 text-xs text-muted-foreground">{b.star}</span>
              <Progress value={b.pct} className="h-1.5 flex-1" />
              <span className="w-6 text-right text-xs text-muted-foreground">{b.count}</span>
            </div>
          ))}
        </div>
      </Card>

      {isLoading ? (
        <ListSkeleton count={3} />
      ) : !data?.reviews.length ? (
        <EmptyState icon={Star} title="No reviews yet" description="Complete jobs to start receiving reviews." />
      ) : (
        <div className="space-y-3">
          {data.reviews.map((r) => (
            <Card key={r.id} className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">
                  {r.provider?.name ?? "Anonymous"}
                </p>
                <div className="flex items-center gap-0.5 text-accent">
                  {Array.from({ length: r.rating }).map((_, i) => (
                    <Star key={i} className="size-3.5 fill-current" />
                  ))}
                </div>
              </div>
              {r.comment && <p className="mt-1.5 text-sm text-muted-foreground">{r.comment}</p>}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
