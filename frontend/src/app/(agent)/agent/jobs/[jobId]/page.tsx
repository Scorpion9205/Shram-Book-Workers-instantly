"use client";

import { use, useState } from "react";
import { motion } from "framer-motion";
import { MapPin, Calendar, Users, IndianRupee, ArrowLeft, CheckCircle2 } from "lucide-react";
import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/cards/EmptyState";
import { useGetJobByIdQuery } from "@/features/jobs/jobsApi";
import ApplyJobDialog from "@/components/dialogs/ApplyJobDialog";

export default function AgentJobDetailPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = use(params);
  const { data: job, isLoading, isError } = useGetJobByIdQuery(jobId);
  const [open, setOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    );
  }

  if (isError || !job) {
    return <EmptyState title="Job not found" description="This job may have been removed." />;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href="/agent/jobs" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Back to Jobs
      </Link>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="overflow-hidden">
          <div className="bg-linear-to-br from-primary to-emerald-700 px-6 py-8 text-white">
            <Badge variant="outline" className="border-white/30 bg-white/10 text-white capitalize">
              {job.skill?.name ?? "Unknown Skill"}
            </Badge>
            <h1 className="mt-3 text-2xl font-bold">{job.title}</h1>
            <p className="mt-1 text-white/80">{job.provider?.name ?? "Provider"}</p>
          </div>

          <CardContent className="space-y-6 pt-6">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                { icon: IndianRupee, label: "Salary", value: `₹${job.budget ?? 0}` },
                { icon: MapPin, label: "Location", value: job.address, truncate: true },
                { icon: Calendar, label: "Date", value: new Date(job.createdAt).toLocaleDateString("en-IN") },
                { icon: Users, label: "Workers", value: job.requiredWorkers },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl bg-secondary p-3 text-center">
                  <item.icon className="mx-auto mb-1 size-4 text-primary" />
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className={`text-sm font-semibold ${item.truncate ? "truncate" : ""}`}>{item.value}</p>
                </div>
              ))}
            </div>

            <div>
              <h3 className="mb-2 font-semibold">Description</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{job.description}</p>
            </div>

            <div>
              <h3 className="mb-2 font-semibold">Required Skills</h3>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">
                  {job.skill?.name ?? "No Skill"}
                </Badge>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-2xl border border-dashed border-border p-4">
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{job._count?.applications ?? 0}</span> applicants so far
              </p>
              <Button
                onClick={() => setOpen(true)}
                disabled={job.status !== "OPEN" || job.hasApplied}
              >
                <CheckCircle2 className="size-4" />
                {job.hasApplied
                  ? "Already Applied"
                  : job.status === "OPEN"
                    ? "Apply for Agency"
                    : "Closed"}
              </Button>
            </div>
          </CardContent>
        </Card>
        <ApplyJobDialog
          open={open}
          onOpenChange={setOpen}
          job={job}
        />
      </motion.div>
    </div>
  );
}
