"use client";

import Link from "next/link";
import { Plus, Briefcase, Users, IndianRupee } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/cards/EmptyState";
import { ListSkeleton } from "@/components/loaders/Skeletons";
import { useGetMyPostedJobsQuery } from "@/features/jobs/jobsApi";

export default function MyJobsPage() {
  const { data, isLoading } = useGetMyPostedJobsQuery();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">My Jobs</h1>
          <p className="text-sm text-muted-foreground">Manage the jobs you've posted.</p>
        </div>
        <Button asChild>
          <Link href="/provider/jobs/create">
            <Plus className="size-4" /> Create Job
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <ListSkeleton count={4} />
      ) : !data?.items.length ? (
        <EmptyState
          icon={Briefcase}
          title="No jobs posted yet"
          description="Create your first job posting to start receiving applications."
          actionLabel="Create Job"
          onAction={() => (window.location.href = "/provider/jobs/create")}
        />
      ) : (
        <div className="space-y-3">
          {data.items.map((job) => (
            <Link key={job.id} href={`/provider/jobs/${job.id}`}>
              <Card className="flex items-center justify-between gap-4 p-4 transition-transform hover:-translate-y-0.5">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium">{job.title}</p>
                    <Badge
                      variant={job.status === "OPEN" ? "success" : "outline"}
                      className="capitalize"
                    >
                      {job.status.replaceAll("_", " ").toLowerCase()}
                    </Badge>
                  </div>
                  <p className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="size-3" /> {job._count?.applications ?? 0}applicants
                    </span>
                    <span className="flex items-center gap-1">
                      <IndianRupee className="size-3" /> {job.budget}
                    </span>
                  </p>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
