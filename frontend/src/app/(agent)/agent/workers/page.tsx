"use client";

import { useState } from "react";
import { BadgeCheck, IndianRupee, MapPin, ShieldCheck, Trash2, UserPlus, Users, Wallet } from "lucide-react";
import { toast } from "sonner";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { EmptyState } from "@/components/cards/EmptyState";
import { ListSkeleton } from "@/components/loaders/Skeletons";
import AddManagedWorkerDialog from "@/components/dialogs/AddManagedWorkerDialog";
import WorkerCheckoutDialog from "@/components/dialogs/WorkerCheckoutDialog";
import {
  useGetMyWorkersQuery,
  useSetWorkerAvailabilityMutation,
  useSetWorkerVerifiedMutation,
  useRemoveWorkerMutation,
  type AgentWorkerRosterEntry,
} from "@/features/agent/agentWorkerApi";

export default function AgentWorkersPage() {
  const { data: workers = [], isLoading } = useGetMyWorkersQuery();
  const [setAvailability] = useSetWorkerAvailabilityMutation();
  const [setVerified] = useSetWorkerVerifiedMutation();
  const [removeWorker] = useRemoveWorkerMutation();
  const [addOpen, setAddOpen] = useState(false);
  const [checkoutWorker, setCheckoutWorker] = useState<AgentWorkerRosterEntry | null>(null);

  async function handleToggleAvailability(worker: AgentWorkerRosterEntry) {
    const goingOnline = !worker.worker.isAvailable;
    if (goingOnline && (worker.worker.latitude === null || worker.worker.longitude === null)) {
      toast.error(`${worker.worker.user.name} has no location set yet — use "Use my current location" from Add Worker, or mark them available once nearby.`);
      return;
    }
    try {
      await setAvailability({ workerId: worker.workerId, isAvailable: goingOnline }).unwrap();
      toast.success(`${worker.worker.user.name} is now ${goingOnline ? "available" : "unavailable"}.`);
    } catch (err: any) {
      toast.error(err?.data?.message || "Couldn't update availability.");
    }
  }

  async function handleToggleVerified(worker: AgentWorkerRosterEntry) {
    try {
      await setVerified({ workerId: worker.workerId, verified: !worker.verifiedByAgent }).unwrap();
    } catch (err: any) {
      toast.error(err?.data?.message || "Couldn't update verification status.");
    }
  }

  async function handleRemove(worker: AgentWorkerRosterEntry) {
    if (!window.confirm(`Remove ${worker.worker.user.name} from your roster? This can't be undone.`)) return;
    try {
      await removeWorker(worker.workerId).unwrap();
      toast.success(`${worker.worker.user.name} removed from your roster.`);
    } catch (err: any) {
      toast.error(err?.data?.message || "Couldn't remove worker.");
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Worker Roster</h1>
          <p className="text-sm text-muted-foreground">
            Manage workers who don't have a smartphone — you add them, mark them available, and assign them work.
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <UserPlus className="size-4" /> Add Worker
        </Button>
      </div>

      {isLoading ? (
        <ListSkeleton count={4} />
      ) : workers.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No workers yet"
          description="Add a worker to start assigning them to jobs and instant requests."
          actionLabel="Add Worker"
          onAction={() => setAddOpen(true)}
        />
      ) : (
        <div className="space-y-3">
          {workers.map((worker) => (
            <Card key={worker.id} className="p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold truncate">{worker.worker.user.name}</p>
                    {worker.verifiedByAgent && (
                      <Badge variant="outline" className="gap-1 border-success/30 text-success">
                        <ShieldCheck className="size-3" /> Verified
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    {worker.worker.user.phone && <span>{worker.worker.user.phone}</span>}
                    {worker.worker.dailyRate != null && (
                      <span className="flex items-center gap-0.5">
                        <IndianRupee className="size-3" /> {worker.worker.dailyRate}/day
                      </span>
                    )}
                    {worker.worker.latitude != null ? (
                      <span className="flex items-center gap-0.5">
                        <MapPin className="size-3" /> Location set
                      </span>
                    ) : (
                      <span className="flex items-center gap-0.5 text-amber-500">
                        <MapPin className="size-3" /> No location
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {worker.worker.skills.map((s) => (
                      <Badge key={s.skillId} variant="outline">
                        {s.skill.name}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={worker.worker.isAvailable}
                      onCheckedChange={() => handleToggleAvailability(worker)}
                    />
                    <span className="text-xs text-muted-foreground">
                      {worker.worker.isAvailable ? "Available" : "Unavailable"}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleVerified(worker)}
                    className="gap-1.5"
                  >
                    <BadgeCheck className="size-3.5" />
                    {worker.verifiedByAgent ? "Unverify" : "Verify"}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setCheckoutWorker(worker)} className="gap-1.5">
                    <Wallet className="size-3.5" /> Checkout
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive border-destructive/30 hover:bg-destructive/5"
                    onClick={() => handleRemove(worker)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <AddManagedWorkerDialog open={addOpen} onOpenChange={setAddOpen} />
      {checkoutWorker && (
        <WorkerCheckoutDialog
          open={!!checkoutWorker}
          onOpenChange={(open) => !open && setCheckoutWorker(null)}
          worker={checkoutWorker}
        />
      )}
    </div>
  );
}
