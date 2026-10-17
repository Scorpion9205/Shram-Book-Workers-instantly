"use client";

import { useState } from "react";
import { Wallet, Percent, Briefcase, IndianRupee, Users, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/cards/StatCard";
import { EmptyState } from "@/components/cards/EmptyState";
import { StatGridSkeleton, ListSkeleton } from "@/components/loaders/Skeletons";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PayoutDetailsForm } from "@/components/payouts/PayoutDetailsForm";
import { PayoutRequestList } from "@/components/payouts/PayoutRequestList";
import { useGetAgentCommissionsQuery } from "@/features/agent/agentApi";
import {
  useGetAgentPayoutSummaryQuery,
  useGetMyPayoutRequestsQuery,
  useRequestAgentCommissionMutation,
  useRequestAgentWorkerFundsMutation,
  type PayoutDetails,
} from "@/features/payouts/payoutApi";

type CommissionPeriod = "today" | "month" | "all";
type RequestKind = "commission" | "funds";

const PERIOD_LABELS: Record<CommissionPeriod, string> = {
  today: "Today's Earnings",
  month: "This Month's Earnings",
  all: "Total Earnings",
};

export default function AgentCommissionsPage() {
  const { data, isLoading } = useGetAgentCommissionsQuery();
  const { data: payout } = useGetAgentPayoutSummaryQuery();
  const { data: requests } = useGetMyPayoutRequestsQuery();
  const [requestCommission, { isLoading: isRequestingCommission }] = useRequestAgentCommissionMutation();
  const [requestFunds, { isLoading: isRequestingFunds }] = useRequestAgentWorkerFundsMutation();

  const [period, setPeriod] = useState<CommissionPeriod>("all");
  const [requestKind, setRequestKind] = useState<RequestKind | null>(null);

  const periodValue =
    period === "today" ? data?.todayEarnings : period === "month" ? data?.monthEarnings : data?.totalEarnings;

  const minimum = payout?.minimumPayout ?? 100;
  const commissionAvailable = payout?.commission.availableAmount ?? 0;
  const fundsAvailable = payout?.workerFunds.availableAmount ?? 0;
  const cashDues = payout?.cashDues.amount ?? 0;

  async function handleSubmit(details: PayoutDetails) {
    try {
      if (requestKind === "commission") {
        await requestCommission(details).unwrap();
        toast.success("Commission payout requested. Admin will pay it soon.");
      } else {
        await requestFunds(details).unwrap();
        toast.success("Workers' payout requested. Once admin pays you, hand each worker their share.");
      }
      setRequestKind(null);
    } catch (err: any) {
      toast.error(err?.data?.message || "Couldn't send the request.");
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Commissions &amp; Payouts</h1>
          <p className="text-sm text-muted-foreground">
            Your commission on paid bookings, and the money for your workers, paid to you by admin.
          </p>
        </div>
        <Select value={period} onValueChange={(v) => setPeriod(v as CommissionPeriod)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
            <SelectItem value="all">All Time</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <StatGridSkeleton />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard label={PERIOD_LABELS[period]} value={`₹${periodValue ?? 0}`} icon={Wallet} accent="success" />
          <StatCard
            label="Commission Rate"
            value={data?.commissionPercent ?? 0}
            suffix="%"
            icon={Percent}
            accent="primary"
            delay={0.05}
          />
          <StatCard
            label="Commissionable Bookings"
            value={data?.bookingCount ?? 0}
            icon={Briefcase}
            accent="accent"
            delay={0.1}
          />
        </div>
      )}

      {cashDues > 0 && (
        <Card className="flex items-start gap-3 border-amber-500/30 bg-amber-500/5 p-4">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-500" />
          <p className="text-sm">
            You collected cash on {payout?.cashDues.bookingCount} booking(s). The platform&apos;s share,{" "}
            <span className="font-semibold">₹{cashDues}</span>, will be deducted from your next payout.
          </p>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card className="p-5">
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="size-4" /> Workers&apos; payout
          </p>
          <p className="mt-1 flex items-center gap-1 text-2xl font-bold">
            <IndianRupee className="size-5" />
            {fundsAvailable}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            The money your workers earned (their full work charge), paid to you in one go. Then you hand each worker
            their share from the Workers page.
          </p>
          {!!payout?.workerFunds.requestedAmount && (
            <p className="mt-1 text-xs text-amber-500">₹{payout.workerFunds.requestedAmount} already requested, waiting for admin.</p>
          )}
          {!!payout?.workerFunds.toDistributeAmount && (
            <p className="mt-1 text-xs text-success">You hold ₹{payout.workerFunds.toDistributeAmount} to hand to your workers.</p>
          )}
          <Button className="mt-4 w-full" onClick={() => setRequestKind("funds")} disabled={fundsAvailable < minimum}>
            Request workers&apos; payout
          </Button>
          {fundsAvailable < minimum && (
            <p className="mt-2 text-xs text-muted-foreground">Minimum ₹{minimum} needed.</p>
          )}
        </Card>

        <Card className="p-5">
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Wallet className="size-4" /> My commission
          </p>
          <p className="mt-1 flex items-center gap-1 text-2xl font-bold">
            <IndianRupee className="size-5" />
            {commissionAvailable}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Your own {payout?.rates.agentPercent ?? data?.commissionPercent ?? 0}% on bookings paid online. Paid
            separately from your workers&apos; money.
          </p>
          {!!payout?.commission.requestedAmount && (
            <p className="mt-1 text-xs text-amber-500">₹{payout.commission.requestedAmount} already requested, waiting for admin.</p>
          )}
          <Button
            className="mt-4 w-full"
            variant="outline"
            onClick={() => setRequestKind("commission")}
            disabled={commissionAvailable < minimum}
          >
            Request my commission
          </Button>
          {commissionAvailable < minimum && (
            <p className="mt-2 text-xs text-muted-foreground">Minimum ₹{minimum} needed.</p>
          )}
        </Card>
      </div>

      {!!requests?.length && (
        <div>
          <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Your payout requests</h2>
          <PayoutRequestList requests={requests} />
        </div>
      )}

      <div>
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Recent Commissions</h2>
        {isLoading ? (
          <ListSkeleton count={4} />
        ) : !data?.recentCommissions.length ? (
          <EmptyState
            icon={Wallet}
            title="No commissions yet"
            description="You'll earn a commission once a booking you sourced is completed and paid."
          />
        ) : (
          <div className="space-y-3">
            {data.recentCommissions.map((c) => (
              <Card key={c.bookingId} className="flex items-center justify-between gap-3 p-4">
                <div>
                  <p className="text-sm font-medium">Booking #{c.bookingId.slice(0, 8)}</p>
                  <p className="text-xs text-muted-foreground">
                    Gross: ₹{c.grossAmount}
                    {c.completedAt ? ` · ${new Date(c.completedAt).toLocaleDateString()}` : ""}
                  </p>
                </div>
                <span className="text-sm font-semibold text-success">₹{c.commission}</span>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={requestKind !== null} onOpenChange={(open) => !open && setRequestKind(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {requestKind === "commission"
                ? `Request my commission — ₹${commissionAvailable}`
                : `Request workers' payout — ₹${fundsAvailable}`}
            </DialogTitle>
            <DialogDescription>
              Where should admin send the money?
              {cashDues > 0 && ` The platform's share of your cash bookings (₹${cashDues}) is deducted first.`}
            </DialogDescription>
          </DialogHeader>
          <PayoutDetailsForm
            submitLabel="Send request"
            loading={isRequestingCommission || isRequestingFunds}
            onSubmit={handleSubmit}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
