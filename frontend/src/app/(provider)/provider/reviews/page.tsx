"use client";

import { Star } from "lucide-react";

import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/cards/EmptyState";
import { ListSkeleton } from "@/components/loaders/Skeletons";

import { useGetMyProviderProfileQuery } from "@/features/provider/providerApi";
import { useGetProviderReviewsQuery } from "@/features/reviews/reviewApi";

export default function ProviderReviewsPage() {
  const { data: profile } = useGetMyProviderProfileQuery();

 const { data: reviews, isLoading } =
  useGetProviderReviewsQuery(
    profile?.userId || "",
    {
      skip: !profile?.userId,
    }
  );
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Reviews</h1>
        <p className="text-sm text-muted-foreground">Reviews you've left for workers.</p>
      </div>
      <Card className="p-6">
        {isLoading ? (
          <ListSkeleton count={3} />
        ) : !reviews?.length ? (
          <Card className="p-6">
            <EmptyState
              icon={Star}
              title="No reviews yet"
              description="You haven't reviewed any workers yet."
            />
          </Card>
        ) : (
          <div className="space-y-3">

            {reviews.map((review) => (

              <Card
                key={review.id}
                className="p-4"
              >

                <div className="flex items-center justify-between">

                  <div>

                    <p className="font-medium">
                      {review.worker?.user?.name}
                    </p>

                    <p className="text-sm text-muted-foreground">
                      {review.booking?.job?.title}
                    </p>

                  </div>

                  <div className="flex gap-1 text-yellow-500">

                    {Array.from({
                      length: review.rating,
                    }).map((_, i) => (
                      <Star
                        key={i}
                        className="size-4 fill-current"
                      />
                    ))}

                  </div>

                </div>

                {review.comment && (
                  <p className="mt-3 text-sm text-muted-foreground">
                    {review.comment}
                  </p>
                )}

              </Card>

            ))}

          </div>
        )}
      </Card>
    </div>
  );
}
