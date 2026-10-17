"use client";

import { useState } from "react";
import { ArrowDownLeft, ArrowUpRight, IndianRupee, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/cards/EmptyState";
import { ListSkeleton } from "@/components/loaders/Skeletons";
import { PayoutDetailsForm } from "@/components/payouts/PayoutDetailsForm";
import { PayoutRequestList } from "@/components/payouts/PayoutRequestList";
import {
  useGetMyPayoutRequestsQuery,
  useGetWalletBalanceQuery,
  useGetWalletTransactionsQuery,
  useRequestWorkerWithdrawalMutation,
  type PayoutDetails,
} from "@/features/payouts/payoutApi";

const MINIMUM_WITHDRAWAL = 100;

// What a transaction was for, from its reference ("BOOKING_PAYMENT:<id>", "WITHDRAWAL:<id>", ...).
function describeTransaction(reference: string): string {
  const purpose = reference.split(":")[0];
  switch (purpose) {
    case "BOOKING_PAYMENT":
      return "Payment for a booking";
    case "COMMISSION_DEDUCTION":
      return "Platform fee on a cash job";
    case "WITHDRAWAL":
      return "Withdrawal requested";
    case "WITHDRAWAL_REFUND":
      return "Withdrawal rejected — money returned";
    default:
      return "Wallet transaction";
  }
}

export default function WorkerWalletPage() {
  const { data: wallet, isLoading: loadingBalance } = useGetWalletBalanceQuery();
  const { data: transactions, isLoading: loadingTransactions } = useGetWalletTransactionsQuery();
  const { data: requests } = useGetMyPayoutRequestsQuery();
  const [requestWithdrawal, { isLoading: isRequesting }] = useRequestWorkerWithdrawalMutation();

  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");

  const balance = wallet?.balance ?? 0;
  const amountNumber = Number(amount);
  const hasPending = (requests ?? []).some((r) => r.status === "PENDING");

  async function handleSubmit(details: PayoutDetails) {
    if (!Number.isFinite(amountNumber) || amountNumber < MINIMUM_WITHDRAWAL) {
      toast.error(`The minimum withdrawal is ₹${MINIMUM_WITHDRAWAL}.`);
      return;
    }
    if (amountNumber > balance) {
      toast.error("You don't have that much in your wallet.");
      return;
    }
    try {
      await requestWithdrawal({ ...details, amount: amountNumber }).unwrap();
      toast.success("Withdrawal requested. You'll get the money once admin pays it.");
      setOpen(false);
      setAmount("");
    } catch (err: any) {
      toast.error(err?.data?.message || "Couldn't request the withdrawal.");
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Wallet</h1>
        <p className="text-sm text-muted-foreground">
          Your earnings from paid bookings: you keep your full work charge. Withdraw them to your UPI or bank.
        </p>
      </div>

      <Card className="p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Available balance</p>
            <p className="mt-1 flex items-center gap-1 text-3xl font-bold">
              <IndianRupee className="size-6" />
              {loadingBalance ? "…" : balance}
            </p>
            {balance < 0 && (
              <p className="mt-1 text-xs text-destructive">
                A negative balance is the platform fee on your cash jobs (the part of the cash you collected that belongs to SHRAM). It is cleared from your next earnings.
              </p>
            )}
          </div>
          <Button onClick={() => setOpen(true)} disabled={balance < MINIMUM_WITHDRAWAL}>
            <Wallet className="size-4" /> Withdraw
          </Button>
        </div>
        {balance >= 0 && balance < MINIMUM_WITHDRAWAL && (
          <p className="mt-3 text-xs text-muted-foreground">You can withdraw once you have at least ₹{MINIMUM_WITHDRAWAL}.</p>
        )}
        {hasPending && (
          <p className="mt-3 text-xs text-muted-foreground">You have a withdrawal waiting for admin to pay.</p>
        )}
      </Card>

      {!!requests?.length && (
        <div>
          <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Withdrawal requests</h2>
          <PayoutRequestList requests={requests} />
        </div>
      )}

      <div>
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Transactions</h2>
        {loadingTransactions ? (
          <ListSkeleton count={4} />
        ) : !transactions?.length ? (
          <EmptyState
            icon={Wallet}
            title="No transactions yet"
            description="Your earnings will show up here once a paid booking is completed."
          />
        ) : (
          <div className="space-y-3">
            {transactions.map((t) => {
              const credit = t.type === "CREDIT";
              return (
                <Card key={t.id} className="flex items-center justify-between gap-3 p-4">
                  <div className="flex items-center gap-3">
                    {credit ? (
                      <ArrowDownLeft className="size-4 text-success" />
                    ) : (
                      <ArrowUpRight className="size-4 text-destructive" />
                    )}
                    <div>
                      <p className="text-sm font-medium">{describeTransaction(t.reference)}</p>
                      <p className="text-xs text-muted-foreground">{new Date(t.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                  <span className={credit ? "text-sm font-semibold text-success" : "text-sm font-semibold text-destructive"}>
                    {credit ? "+" : "−"}₹{Number(t.amount)}
                  </span>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Withdraw from wallet</DialogTitle>
            <DialogDescription>
              Admin pays this to your UPI/bank, usually within a day or two. The amount leaves your wallet now and
              comes back if the request is rejected.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="withdraw-amount">Amount (₹)</Label>
              <Input
                id="withdraw-amount"
                inputMode="decimal"
                placeholder={`Between ${MINIMUM_WITHDRAWAL} and ${balance}`}
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
              />
              <button type="button" className="text-xs text-primary" onClick={() => setAmount(String(balance))}>
                Withdraw everything (₹{balance})
              </button>
            </div>
            <PayoutDetailsForm submitLabel="Request withdrawal" loading={isRequesting} onSubmit={handleSubmit} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
