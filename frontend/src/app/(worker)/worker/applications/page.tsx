"use client";

import { useState } from "react";
import { ClipboardList } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { EmptyState } from "@/components/cards/EmptyState";
import { ListSkeleton } from "@/components/loaders/Skeletons";
import { useGetMyApplicationsQuery } from "@/features/jobs/jobsApi";
import type { ApplicationStatus } from "@/types";

const statusVariant: Record<ApplicationStatus, "default" | "success" | "destructive"> = {
  pending: "default",
  accepted: "success",
  rejected: "destructive",
};

export default function WorkerApplicationsPage() {
  const { data, isLoading } = useGetMyApplicationsQuery();
  const [tab, setTab] = useState<ApplicationStatus | "all">("all");

  const filtered = data?.filter((a) => tab === "all" || a.status === tab) || [];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Applied Jobs</h1>
        <p className="text-sm text-muted-foreground">Track the status of your job applications.</p>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="accepted">Accepted</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
        </TabsList>
        <TabsContent value={tab}>
          {isLoading ? (
            <ListSkeleton count={4} />
          ) : !filtered.length ? (
            <EmptyState icon={ClipboardList} title="No applications" description="Jobs you apply to will show up here." />
          ) : (
            <div className="space-y-3">
              {filtered.map((app) => (
                <Card key={app.id} className="flex items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{app.job?.title || "Job"}</p>
                    <p className="text-xs text-muted-foreground">{app.job?.address}</p>
                  </div>
                  <Badge variant={statusVariant[app.status]} className="shrink-0 capitalize">
                    {app.status}
                  </Badge>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
