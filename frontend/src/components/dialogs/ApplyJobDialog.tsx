"use client";

import { useEffect, useState } from "react";
import { IndianRupee, Loader2, Send } from "lucide-react";
import { toast } from "sonner";

import { Job } from "@/types";
import { useApplyToJobMutation } from "@/features/jobs/jobsApi";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface ApplyJobDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job: Job;
}

export default function ApplyJobDialog({
  open,
  onOpenChange,
  job,
}: ApplyJobDialogProps) {
  const [bidAmount, setBidAmount] = useState("");
  const [message, setMessage] = useState("");

  const [applyToJob, { isLoading }] = useApplyToJobMutation();

  useEffect(() => {
    setBidAmount(job.budget?.toString() ?? "");
    setMessage("");
  }, [job, open]);

  async function handleApply() {
    if (!bidAmount) {
      toast.error("Please enter your bid amount.");
      return;
    }

    try {
      await applyToJob({
        jobId: job.id,
        bidAmount: Number(bidAmount),
        message,
      }).unwrap();

      toast.success("Application submitted successfully.");

      onOpenChange(false);

      setBidAmount("");
      setMessage("");
    } catch (err: any) {
      console.log(err);

      toast.error(
        err?.data?.message ??
          "Unable to submit application."
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">

        <DialogHeader>
          <DialogTitle>
            Apply for Job
          </DialogTitle>

          <DialogDescription>
            Submit your bid for this job.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">

          <div>
            <Label>Provider Budget</Label>

            <div className="mt-2 rounded-lg border bg-muted p-3 flex items-center gap-2">
              <IndianRupee className="h-4 w-4" />
              <span className="font-semibold">
                {job.budget ?? 0}
              </span>
            </div>
          </div>

          <div>
            <Label>Your Bid Amount</Label>

            <Input
              type="number"
              placeholder="Enter your bid amount"
              value={bidAmount}
              onChange={(e) =>
                setBidAmount(e.target.value)
              }
            />
          </div>

          <div>
            <Label>Message (Optional)</Label>

            <Textarea
              rows={4}
              placeholder="Write a message..."
              value={message}
              onChange={(e) =>
                setMessage(e.target.value)
              }
            />
          </div>

        </div>

        <DialogFooter>

          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>

          <Button
            onClick={handleApply}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Applying...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Apply
              </>
            )}
          </Button>

        </DialogFooter>

      </DialogContent>
    </Dialog>
  );
}