"use client";

import { use } from "react";
import { ArrowLeft, Star, MapPin, IndianRupee,Briefcase as BriefcaseIcon } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/cards/EmptyState";
import { ListSkeleton } from "@/components/loaders/Skeletons";
import { useGetJobByIdQuery, useGetJobApplicationsQuery, useAcceptApplicationMutation } from "@/features/jobs/jobsApi";

export default function ProviderJobDetailPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = use(params);
  const { data: job, isLoading: jobLoading } = useGetJobByIdQuery(jobId);
  const { data: applications, isLoading: appsLoading } = useGetJobApplicationsQuery(jobId);
  const [acceptApplication, { isLoading: isAccepting }] = useAcceptApplicationMutation();

  async function handleAccept(applicationId: string) {
    try {
      await acceptApplication(applicationId).unwrap();
      toast.success("Worker accepted! Booking created.");
    } catch {
      toast.error("Couldn't accept this applicant.");
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href="/provider/jobs" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Back to My Jobs
      </Link>

      {jobLoading ? (
        <Skeleton className="h-32 w-full rounded-2xl" />
      ) : job ? (
        <Card className="p-5">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold">{job.title}</h1>
            <Badge variant={job.status === "OPEN" ? "success" : "outline"}>
              {job.status}
            </Badge>
          </div>
          <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="size-3.5" /> {job.address}
          </p>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Applicants</CardTitle>
        </CardHeader>
        <CardContent>
          {appsLoading ? (
            <ListSkeleton count={3} />
          ) : !applications?.length ? (
            <EmptyState icon={BriefcaseIcon} title="No applicants yet" description="Workers who apply will appear here." />
          ) : (
            <div className="space-y-3">
              {applications.map((app) => (
                <div key={app.id} className="flex items-center gap-3 rounded-2xl border border-border p-4">
                  <Avatar className="size-12">
                    <AvatarImage src={app.worker?.user?.profileImage ?? ""} />
                    <AvatarFallback>
                      {app.worker?.user?.name?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{app.worker?.user?.name}</p>
                    <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Star className="size-3 fill-accent text-accent" /> {app.worker?.rating ?? "—"}
                      </span>

                      {app.worker?.experience != null && (
                        <span>{app.worker.experience} yrs exp</span>
                      )}

                      {app.bidAmount != null && (
                        <span className="flex items-center gap-1 font-semibold text-primary">
                          <IndianRupee className="size-3" />
                          {app.bidAmount}
                        </span>
                      )}

                    </div>
                  </div>
                  {app.status === "PENDING" ? (
                    <Button size="sm" onClick={() => handleAccept(app.id)} loading={isAccepting}>
                      Accept
                    </Button>
                  ) : (
                    <Badge variant={app.status === "ACCEPTED" ? "success" : "destructive"} className="capitalize">
                      {app.status}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
