"use client";

import { useState } from "react";
import { UserCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/cards/EmptyState";
import { useGetMyWorkersQuery } from "@/features/agent/agentWorkerApi";
import { useAssignWorkerToApplicationMutation } from "@/features/agent/agentApi";

interface AssignWorkerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  applicationId: string;
  jobSkillId?: string;
  jobTitle?: string;
}

export default function AssignWorkerDialog({
  open,
  onOpenChange,
  applicationId,
  jobSkillId,
  jobTitle,
}: AssignWorkerDialogProps) {
  const { data: roster = [], isLoading } = useGetMyWorkersQuery();
  const [assignWorker, { isLoading: isAssigning }] = useAssignWorkerToApplicationMutation();
  const [assigningId, setAssigningId] = useState<string | null>(null);

  const availableWorkers = roster.filter((entry) => {
    if (!entry.worker.isAvailable) return false;
    if (!jobSkillId) return true;
    return entry.worker.skills.some((s) => s.skillId === jobSkillId);
  });

  async function handleAssign(workerId: string) {
    setAssigningId(workerId);
    try {
      await assignWorker({ applicationId, workerId }).unwrap();
      toast.success("Worker assigned successfully.");
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.data?.message || "Couldn't assign this worker.");
    } finally {
      setAssigningId(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="size-5 text-primary" /> Assign a Worker
          </DialogTitle>
          <DialogDescription>
            {jobTitle ? `Pick an available roster worker for "${jobTitle}".` : "Pick an available roster worker."}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Loading your roster…</p>
        ) : availableWorkers.length === 0 ? (
          <EmptyState
            title="No available workers match"
            description="Mark a roster worker available (with the right skill) from Worker Roster first."
          />
        ) : (
          <div className="max-h-80 space-y-2 overflow-y-auto">
            {availableWorkers.map((entry) => (
              <div
                key={entry.workerId}
                className="flex items-center justify-between gap-3 rounded-xl border border-border p-3"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{entry.worker.user.name}</p>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {entry.worker.skills.map((s) => (
                      <Badge key={s.skillId} variant="outline" className="text-xs">
                        {s.skill.name}
                      </Badge>
                    ))}
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleAssign(entry.workerId)}
                  loading={isAssigning && assigningId === entry.workerId}
                  disabled={isAssigning}
                >
                  Assign
                </Button>
              </div>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
