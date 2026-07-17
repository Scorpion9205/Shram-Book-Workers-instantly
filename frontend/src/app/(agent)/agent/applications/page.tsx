"use client";

import { ClipboardList } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/cards/EmptyState";
import { ListSkeleton } from "@/components/loaders/Skeletons";
import { useGetAgentApplicationsQuery } from "@/features/agent/agentApi";

export default function AgentApplicationsPage() {
  const { data = [], isLoading } = useGetAgentApplicationsQuery();

  if (isLoading) return <ListSkeleton count={4} />;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Applications</h1>
        <p className="text-sm text-muted-foreground">Track jobs your agency has applied for.</p>
      </div>

      {!data.length ? (
        <EmptyState icon={ClipboardList} title="No applications yet" description="Agency applications will appear here." />
      ) : (
        <div className="space-y-3">
          {data.map((application) => (
            <Card key={application.id} className="p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{application.job?.title ?? "Job application"}</p>
                  <p className="text-sm text-muted-foreground">{application.job?.address}</p>
                </div>
                <Badge variant="outline" className="capitalize">
                  {application.status}
                </Badge>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
