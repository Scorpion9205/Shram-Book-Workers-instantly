"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
  const { jobId } = use(params);
  const { data: job, isLoading: jobLoading } = useGetJobByIdQuery(jobId);
  const { data: applications, isLoading: appsLoading } = useGetJobApplicationsQuery(jobId);
  const [acceptApplication, { isLoading: isAccepting }] = useAcceptApplicationMutation();

  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);

  function handleAccept(applicationId: string) {
    setSelectedAppId(applicationId);
  }

  async function confirmAccept(applicationId: string, paymentMode: "ONLINE" | "OFFLINE") {
    try {
      const res = await acceptApplication({ applicationId, paymentMode, jobId }).unwrap() as any;
      toast.success("Worker accepted! Booking created.");
      setSelectedAppId(null);
      if (res.bookingId) {
        router.push(`/provider/booking/${res.bookingId}`);
      }
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

      {selectedAppId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-3xl w-full max-w-md p-6 shadow-2xl relative">
            <h3 className="text-xl font-semibold mb-2">Choose Payment Option</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Select how you would like to pay the worker for this job.
            </p>
            <div className="space-y-3">
              <Button
                className="w-full justify-between h-14 rounded-2xl border-2 border-primary/20 hover:border-primary flex items-center px-4"
                variant="outline"
                onClick={() => confirmAccept(selectedAppId, "ONLINE")}
                disabled={isAccepting}
              >
                <div className="text-left">
                  <p className="font-semibold text-sm">Pay Online</p>
                  <p className="text-xs text-muted-foreground">Pay now securely using Razorpay card/UPI</p>
                </div>
                <span className="text-primary font-bold">→</span>
              </Button>
              <Button
                className="w-full justify-between h-14 rounded-2xl border border-emerald-500/20 hover:border-emerald-500 flex items-center px-4"
                variant="outline"
                onClick={() => confirmAccept(selectedAppId, "OFFLINE")}
                disabled={isAccepting}
              >
                <div className="text-left">
                  <p className="font-semibold text-sm text-emerald-500">Pay Offline</p>
                  <p className="text-xs text-muted-foreground">Pay direct cash/UPI to worker after work is completed</p>
                </div>
                <span className="text-emerald-500 font-bold">→</span>
              </Button>
            </div>
            <Button
              className="w-full mt-4 rounded-xl"
              variant="ghost"
              onClick={() => setSelectedAppId(null)}
              disabled={isAccepting}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
