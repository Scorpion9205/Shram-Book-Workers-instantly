"use client";

import { useEffect, useState } from "react";
import { Banknote, IndianRupee, Landmark, Loader2, Wallet } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  useGetWorkerEarningsQuery,
  useSetWorkerBankDetailsMutation,
  usePayoutWorkerMutation,
  type AgentWorkerRosterEntry,
} from "@/features/agent/agentWorkerApi";

interface WorkerCheckoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  worker: AgentWorkerRosterEntry;
}

export default function WorkerCheckoutDialog({ open, onOpenChange, worker }: WorkerCheckoutDialogProps) {
  const { data: earnings, isLoading } = useGetWorkerEarningsQuery(worker.workerId, { skip: !open });
  const [setBankDetails, { isLoading: isSavingBank }] = useSetWorkerBankDetailsMutation();
  const [payout, { isLoading: isPaying }] = usePayoutWorkerMutation();

  const hasBankDetails = !!worker.worker.bankDetails.accountNumber;
  const [editingBank, setEditingBank] = useState(!hasBankDetails);
  const [accountHolderName, setAccountHolderName] = useState(worker.worker.bankDetails.accountHolderName ?? "");
  const [accountNumber, setAccountNumber] = useState(worker.worker.bankDetails.accountNumber ?? "");
  const [ifscCode, setIfscCode] = useState(worker.worker.bankDetails.ifscCode ?? "");
  const [bankName, setBankName] = useState(worker.worker.bankDetails.bankName ?? "");

  useEffect(() => {
    if (!open) return;
    setEditingBank(!hasBankDetails);
    setAccountHolderName(worker.worker.bankDetails.accountHolderName ?? "");
    setAccountNumber(worker.worker.bankDetails.accountNumber ?? "");
    setIfscCode(worker.worker.bankDetails.ifscCode ?? "");
    setBankName(worker.worker.bankDetails.bankName ?? "");
  }, [open, worker]);

  async function handleSaveBankDetails() {
    if (!accountHolderName.trim() || !accountNumber.trim() || !ifscCode.trim() || !bankName.trim()) {
      toast.error("Fill in all bank details fields.");
      return;
    }
    try {
      await setBankDetails({
        workerId: worker.workerId,
        accountHolderName: accountHolderName.trim(),
        accountNumber: accountNumber.trim(),
        ifscCode: ifscCode.trim().toUpperCase(),
        bankName: bankName.trim(),
      }).unwrap();
      toast.success("Bank details saved.");
      setEditingBank(false);
    } catch (err: any) {
      toast.error(err?.data?.message || "Couldn't save bank details.");
    }
  }

  async function handlePayout(method: "CASH" | "BANK_TRANSFER") {
    try {
      await payout({ workerId: worker.workerId, method }).unwrap();
      toast.success(`${worker.worker.user.name} marked as paid (${method === "CASH" ? "cash" : "bank transfer"}).`);
    } catch (err: any) {
      toast.error(err?.data?.message || "Couldn't mark as paid.");
    }
  }

  const hasPending = (earnings?.totalPending ?? 0) > 0;
  const payableNow = earnings?.payableNow ?? 0;
  // Pending money that admin hasn't paid to the agent yet can't be handed over.
  const waitingForAdmin = Math.max((earnings?.totalPending ?? 0) - payableNow, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="size-5 text-primary" /> Checkout — {worker.worker.user.name}
          </DialogTitle>
          <DialogDescription>
            Hand this worker their earnings, by cash or bank transfer, and mark it paid.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Loading earnings…</p>
        ) : (
          <div className="space-y-5">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-xl bg-secondary p-3">
                <p className="text-xs text-muted-foreground">Total Earned</p>
                <p className="mt-1 flex items-center justify-center gap-0.5 font-semibold">
                  <IndianRupee className="size-3.5" />
                  {earnings?.totalEarned ?? 0}
                </p>
              </div>
              <div className="rounded-xl bg-secondary p-3">
                <p className="text-xs text-muted-foreground">Paid</p>
                <p className="mt-1 flex items-center justify-center gap-0.5 font-semibold text-success">
                  <IndianRupee className="size-3.5" />
                  {earnings?.totalPaid ?? 0}
                </p>
              </div>
              <div className="rounded-xl bg-secondary p-3">
                <p className="text-xs text-muted-foreground">Pending</p>
                <p className="mt-1 flex items-center justify-center gap-0.5 font-semibold text-amber-500">
                  <IndianRupee className="size-3.5" />
                  {earnings?.totalPending ?? 0}
                </p>
              </div>
            </div>

            {!hasPending ? (
              <p className="text-center text-sm text-muted-foreground">Nothing pending right now — fully settled.</p>
            ) : payableNow <= 0 ? (
              <p className="rounded-xl bg-secondary p-3 text-center text-sm text-muted-foreground">
                ₹{waitingForAdmin} is pending, but admin hasn&apos;t paid it to you yet. Request the workers&apos; payout
                from the Commissions page first; you can pay this worker once admin has paid you.
              </p>
            ) : (
              <>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Bank Details</Label>
                    {hasBankDetails && !editingBank && (
                      <Button variant="ghost" size="sm" onClick={() => setEditingBank(true)}>
                        Edit
                      </Button>
                    )}
                  </div>

                  {!editingBank ? (
                    <div className="rounded-xl border border-dashed border-border p-3 text-sm">
                      <p className="font-medium">{worker.worker.bankDetails.accountHolderName}</p>
                      <p className="text-muted-foreground">
                        {worker.worker.bankDetails.bankName} •••• {worker.worker.bankDetails.accountNumber?.slice(-4)}
                      </p>
                      <p className="text-muted-foreground">{worker.worker.bankDetails.ifscCode}</p>
                    </div>
                  ) : (
                    <div className="space-y-2 rounded-xl border border-border p-3">
                      <Input
                        placeholder="Account holder name"
                        value={accountHolderName}
                        onChange={(e) => setAccountHolderName(e.target.value)}
                      />
                      <Input
                        placeholder="Account number"
                        value={accountNumber}
                        onChange={(e) => setAccountNumber(e.target.value)}
                      />
                      <Input
                        placeholder="IFSC code"
                        value={ifscCode}
                        onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                      />
                      <Input placeholder="Bank name" value={bankName} onChange={(e) => setBankName(e.target.value)} />
                      <Button size="sm" className="w-full" onClick={handleSaveBankDetails} loading={isSavingBank}>
                        Save Bank Details
                      </Button>
                    </div>
                  )}
                </div>

                <p className="text-center text-sm">
                  You can pay <span className="font-semibold">₹{payableNow}</span> to this worker now.
                  {waitingForAdmin > 0 && (
                    <span className="text-muted-foreground"> (₹{waitingForAdmin} more is waiting for admin.)</span>
                  )}
                </p>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => handlePayout("CASH")}
                    loading={isPaying}
                  >
                    <Banknote className="size-4" /> Paid by Cash
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={() => handlePayout("BANK_TRANSFER")}
                    disabled={!hasBankDetails || editingBank}
                    loading={isPaying}
                  >
                    <Landmark className="size-4" /> Paid by Bank
                  </Button>
                </div>
              </>
            )}
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
