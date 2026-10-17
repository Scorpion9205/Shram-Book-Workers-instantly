"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { PayoutKind, PayoutRequest, PayoutStatus } from "@/features/payouts/payoutApi";

export const PAYOUT_KIND_LABELS: Record<PayoutKind, string> = {
  WORKER_WALLET: "Wallet withdrawal",
  AGENT_COMMISSION: "Agent commission",
  AGENT_WORKER_FUNDS: "Workers' payout",
};

const STATUS_VARIANT: Record<PayoutStatus, "default" | "success" | "destructive"> = {
  PENDING: "default",
  PAID: "success",
  REJECTED: "destructive",
};

const STATUS_LABEL: Record<PayoutStatus, string> = {
  PENDING: "Waiting for admin",
  PAID: "Paid",
  REJECTED: "Rejected",
};

export function PayoutStatusBadge({ status }: { status: PayoutStatus }) {
  return <Badge variant={STATUS_VARIANT[status]}>{STATUS_LABEL[status]}</Badge>;
}

// Where the money is going, in one short line.
export function describeDestination(r: PayoutRequest): string {
  if (r.method === "UPI") return `UPI ${r.upiId}`;
  return `${r.bankName} •••• ${r.accountNumber?.slice(-4)} (${r.ifscCode})`;
}

// The requester's own history of payout requests, newest first.
export function PayoutRequestList({ requests }: { requests: PayoutRequest[] }) {
  return (
    <div className="space-y-3">
      {requests.map((r) => (
        <Card key={r.id} className="space-y-1 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium">{PAYOUT_KIND_LABELS[r.kind]}</p>
            <span className="text-sm font-semibold">₹{Number(r.amount)}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              {new Date(r.createdAt).toLocaleDateString()} · {describeDestination(r)}
            </p>
            <PayoutStatusBadge status={r.status} />
          </div>
          {r.status === "PAID" && r.transactionRef && (
            <p className="text-xs text-muted-foreground">Reference: {r.transactionRef}</p>
          )}
          {r.status === "REJECTED" && r.rejectionReason && (
            <p className="text-xs text-destructive">Reason: {r.rejectionReason}</p>
          )}
        </Card>
      ))}
    </div>
  );
}
