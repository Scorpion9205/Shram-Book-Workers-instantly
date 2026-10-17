"use client";

import { useState } from "react";
import { CheckCircle2, Clock, IndianRupee, Wallet, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StatCard } from "@/components/cards/StatCard";
import { EmptyState } from "@/components/cards/EmptyState";
import { ListSkeleton } from "@/components/loaders/Skeletons";
import {
  PAYOUT_KIND_LABELS,
  PayoutStatusBadge,
  describeDestination,
} from "@/components/payouts/PayoutRequestList";
import {
  useGetPayoutPlatformSummaryQuery,
  useListPayoutRequestsQuery,
  useMarkPayoutPaidMutation,
  useRejectPayoutMutation,
  type PayoutRequest,
  type PayoutStatus,
} from "@/features/payouts/payoutApi";

type Action = { type: "pay" | "reject"; request: PayoutRequest };

export default function AdminPayoutsPage() {
  const [status, setStatus] = useState<PayoutStatus>("PENDING");
  const { data: summary } = useGetPayoutPlatformSummaryQuery();
  const { data: requests, isLoading } = useListPayoutRequestsQuery({ status });
  const [markPaid, { isLoading: isPaying }] = useMarkPayoutPaidMutation();
  const [reject, { isLoading: isRejecting }] = useRejectPayoutMutation();

  const [action, setAction] = useState<Action | null>(null);
  const [text, setText] = useState("");

  function close() {
    setAction(null);
    setText("");
  }

  async function handleConfirm() {
    if (!action) return;
    try {
      if (action.type === "pay") {
        await markPaid({ id: action.request.id, transactionRef: text.trim() }).unwrap();
        toast.success("Marked as paid.");
      } else {
        await reject({ id: action.request.id, reason: text.trim() }).unwrap();
        toast.success("Request rejected.");
      }
      close();
    } catch (err: any) {
      toast.error(err?.data?.message || "That didn't work.");
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Payouts</h1>
        <p className="text-sm text-muted-foreground">
          Money to send to workers and agents. Pay it from your bank or UPI app, then mark it paid here with the
          transaction reference.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Waiting to be paid" value={`₹${summary?.pending.amount ?? 0}`} icon={Clock} accent="accent" />
        <StatCard
          label="Requests waiting"
          value={summary?.pending.count ?? 0}
          icon={Wallet}
          accent="primary"
          delay={0.05}
        />
        <StatCard label="Paid so far" value={`₹${summary?.paid.amount ?? 0}`} icon={CheckCircle2} accent="success" delay={0.1} />
      </div>

      {summary && (
        <Card className="p-4 text-sm text-muted-foreground">
          On every booking the provider pays the work charge + a flat ₹{summary.rates.fixedFee} fee +{" "}
          {summary.rates.servicePercent}% of the work charge. The worker keeps the whole work charge; for agent bookings{" "}
          {summary.rates.agentPercent}% of the work charge goes to the agent, out of the platform&apos;s side. Change
          these in Settings (<code>platformFixedFee</code>, <code>serviceChargePercent</code>,{" "}
          <code>agentCommissionPercent</code>).
        </Card>
      )}

      <Tabs value={status} onValueChange={(v) => setStatus(v as PayoutStatus)}>
        <TabsList>
          <TabsTrigger value="PENDING">Pending</TabsTrigger>
          <TabsTrigger value="PAID">Paid</TabsTrigger>
          <TabsTrigger value="REJECTED">Rejected</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading ? (
        <ListSkeleton count={4} />
      ) : !requests?.length ? (
        <EmptyState icon={Wallet} title="Nothing here" description="No requests with this status." />
      ) : (
        <div className="space-y-3">
          {requests.map((r) => (
            <Card key={r.id} className="space-y-3 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">{r.user?.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.user?.role} · {r.user?.phone || r.user?.email || "no contact"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{PAYOUT_KIND_LABELS[r.kind]}</Badge>
                  <PayoutStatusBadge status={r.status} />
                </div>
              </div>

              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="flex items-center text-2xl font-bold">
                    <IndianRupee className="size-5" />
                    {Number(r.amount)}
                  </p>
                  {Number(r.duesDeducted) > 0 && (
                    <p className="text-xs text-amber-500">
                      After ₹{Number(r.duesDeducted)} cash dues deducted (agent collected cash from providers).
                    </p>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">
                    Send to: <span className="font-medium text-foreground">{describeDestination(r)}</span>
                    {r.accountHolderName ? ` · ${r.accountHolderName}` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">Requested {new Date(r.createdAt).toLocaleString()}</p>
                  {r.transactionRef && <p className="text-xs text-muted-foreground">Reference: {r.transactionRef}</p>}
                  {r.rejectionReason && <p className="text-xs text-destructive">Reason: {r.rejectionReason}</p>}
                </div>

                {r.status === "PENDING" && (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setAction({ type: "reject", request: r })}>
                      <XCircle className="size-4" /> Reject
                    </Button>
                    <Button size="sm" onClick={() => setAction({ type: "pay", request: r })}>
                      <CheckCircle2 className="size-4" /> Mark paid
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={action !== null} onOpenChange={(open) => !open && close()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{action?.type === "pay" ? "Mark as paid" : "Reject request"}</DialogTitle>
            <DialogDescription>
              {action?.type === "pay"
                ? `Confirm you sent ₹${Number(action.request.amount)} to ${action.request.user?.name}. Enter the UPI/bank transaction reference.`
                : "The money goes back to the requester's wallet or booking balance. Tell them why."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="payout-text">{action?.type === "pay" ? "Transaction reference (UTR)" : "Reason"}</Label>
              <Input id="payout-text" value={text} onChange={(e) => setText(e.target.value)} />
            </div>
            <Button
              className="w-full"
              onClick={handleConfirm}
              loading={isPaying || isRejecting}
              disabled={text.trim().length < 3}
              variant={action?.type === "reject" ? "destructive" : "default"}
            >
              {action?.type === "pay" ? "Confirm payment" : "Reject request"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
