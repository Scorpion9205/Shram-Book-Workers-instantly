"use client";

import Link from "next/link";
import { Users, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/cards/EmptyState";
import { ListSkeleton } from "@/components/loaders/Skeletons";
import { useGetMyPostedJobsQuery } from "@/features/jobs/jobsApi";

export default function ApplicantsOverviewPage() {
  const { data, isLoading } = useGetMyPostedJobsQuery();
  const jobsWithApplicants = data?.items.filter((j) => (j._count?.applications ?? 0) > 0) || [];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Applicants</h1>
        <p className="text-sm text-muted-foreground">Review applicants across all your job postings.</p>
      </div>

      {isLoading ? (
        <ListSkeleton count={4} />
      ) : !jobsWithApplicants.length ? (
        <EmptyState icon={Users} title="No applicants yet" description="Once workers apply to your jobs, they'll show up here." />
      ) : (
        <div className="space-y-3">
          {jobsWithApplicants.map((job) => (
            <Link key={job.id} href={`/provider/jobs/${job.id}`}>
              <Card className="flex items-center justify-between gap-3 p-4 transition-transform hover:-translate-y-0.5">
                <div className="min-w-0">
                  <p className="truncate font-medium">{job.title}</p>
                  <p className="text-xs text-muted-foreground">{job.address}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge>
                    {job._count?.applications ?? 0} applicants
                  </Badge>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
