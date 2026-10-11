"use client";

import { useState } from "react";
import { IndianRupee, MapPin, UserPlus, Zap } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/cards/EmptyState";
import { ListSkeleton } from "@/components/loaders/Skeletons";
import { useGetOpenInstantRequestsQuery } from "@/features/agent/agentApi";
import AssignInstantItemWorkerDialog from "@/components/dialogs/AssignInstantItemWorkerDialog";

export default function AgentInstantRequestsPage() {
  const { data: requests = [], isLoading } = useGetOpenInstantRequestsQuery();
  const [assigningItem, setAssigningItem] = useState<{ itemId: string; skillId: string; skillName: string } | null>(
    null,
  );

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Open Instant Requests</h1>
        <p className="text-sm text-muted-foreground">
          Requests matching your roster's skills — assign a worker per skill needed, right from here.
        </p>
      </div>

      {isLoading ? (
        <ListSkeleton count={4} />
      ) : requests.length === 0 ? (
        <EmptyState
          icon={Zap}
          title="No open requests right now"
          description="Requests matching your linked workers' skills will show up here as they come in."
        />
      ) : (
        <div className="space-y-4">
          {requests.map((request) => (
            <Card key={request.id} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{request.title}</p>
                  <p className="text-sm text-muted-foreground">{request.provider?.name ?? "Provider"}</p>
                </div>
                <span className="flex items-center gap-0.5 font-semibold text-primary">
                  <IndianRupee className="size-4" />
                  {request.amount}
                </span>
              </div>

              {request.address && (
                <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="size-3.5" /> {request.address}
                </p>
              )}
              {request.description && <p className="mt-2 text-sm text-muted-foreground">{request.description}</p>}

              <div className="mt-4 space-y-2">
                {request.items.map((item) => {
                  const slotsLeft = item.requiredWorkers - item.acceptedWorkers;
                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-border p-3"
                    >
                      <div>
                        <p className="text-sm font-medium">{item.skill.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.acceptedWorkers}/{item.requiredWorkers} filled
                        </p>
                      </div>
                      {slotsLeft > 0 ? (
                        <Button
                          size="sm"
                          onClick={() =>
                            setAssigningItem({ itemId: item.id, skillId: item.skill.id, skillName: item.skill.name })
                          }
                        >
                          <UserPlus className="size-3.5" /> Assign Worker
                        </Button>
                      ) : (
                        <Badge variant="outline" className="border-success/30 text-success">
                          Filled
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          ))}
        </div>
      )}

      {assigningItem && (
        <AssignInstantItemWorkerDialog
          open={!!assigningItem}
          onOpenChange={(open) => !open && setAssigningItem(null)}
          itemId={assigningItem.itemId}
          skillId={assigningItem.skillId}
          skillName={assigningItem.skillName}
        />
      )}
    </div>
  );
}
