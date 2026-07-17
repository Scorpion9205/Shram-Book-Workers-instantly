"use client";

import { useState } from "react";
import { Briefcase } from "lucide-react";
import { JobFilterBar } from "@/components/forms/JobFilterBar";
import { JobCard } from "@/components/cards/JobCard";
import { EmptyState } from "@/components/cards/EmptyState";
import { ListSkeleton } from "@/components/loaders/Skeletons";
import { useGetJobsQuery, type JobFilters } from "@/features/jobs/jobsApi";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";

export default function WorkerJobFeedPage() {
  const [filters, setFilters] = useState<JobFilters>({ page: 1, pageSize: 12, sort: "latest" });
  const debouncedSearch = useDebouncedValue(filters.search, 300);
  const queryArgs = { ...filters, search: debouncedSearch };

  const { data, isLoading, isFetching, isError, refetch } = useGetJobsQuery(queryArgs);

  const sentinelRef = useInfiniteScroll(() => {
    if (data?.hasMore && !isFetching) {
      setFilters((f) => ({ ...f, page: (f.page || 1) + 1 }));
    }
  }, Boolean(data?.hasMore));

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Job Feed</h1>
        <p className="text-sm text-muted-foreground">
          Browse jobs that match your skills across different locations.
        </p>
      </div>

      <JobFilterBar filters={filters} onChange={setFilters} />

      {isLoading ? (
        <ListSkeleton count={6} />
      ) : isError ? (
        <EmptyState title="Couldn't load jobs" description="Something went wrong." actionLabel="Retry" onAction={refetch} />
      ) : !data?.items.length ? (
        <EmptyState icon={Briefcase} title="No jobs found" description="Try adjusting your filters or check back later." />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.items.map((job, i) => (
              <JobCard key={job.id} job={job} index={i} href={`/worker/jobs/${job.id}`} />
            ))}
          </div>
          <div ref={sentinelRef} className="h-4" />
          {isFetching && <ListSkeleton count={2} />}
        </>
      )}
    </div>
  );
}
