"use client";

import { useState } from "react";
import { ClipboardList, UserPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/cards/EmptyState";
import { ListSkeleton } from "@/components/loaders/Skeletons";
import { useGetAgentApplicationsQuery } from "@/features/agent/agentApi";
import AssignWorkerDialog from "@/components/dialogs/AssignWorkerDialog";

export default function AgentApplicationsPage() {
  const { data = [], isLoading } = useGetAgentApplicationsQuery();
  const [assigningApp, setAssigningApp] = useState<{ id: string; skillId?: string; title?: string } | null>(null);

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
                  {application.workerCount != null && (
                    <p className="text-xs text-muted-foreground mt-0.5">{application.workerCount} worker(s) needed</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="capitalize">
                    {application.status}
                  </Badge>
                  {application.status === "ACCEPTED" && (
                    <Button
                      size="sm"
                      onClick={() =>
                        setAssigningApp({
                          id: application.id,
                          skillId: application.job?.skill?.id,
                          title: application.job?.title,
                        })
                      }
                    >
                      <UserPlus className="size-3.5" /> Assign Workers
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {assigningApp && (
        <AssignWorkerDialog
          open={!!assigningApp}
          onOpenChange={(open) => !open && setAssigningApp(null)}
          applicationId={assigningApp.id}
          jobSkillId={assigningApp.skillId}
          jobTitle={assigningApp.title}
        />
      )}
    </div>
  );
}
