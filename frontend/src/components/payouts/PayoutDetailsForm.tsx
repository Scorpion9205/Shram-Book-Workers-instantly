"use client";

import { useState } from "react";
import { Landmark, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { PayoutDetails } from "@/features/payouts/payoutApi";

interface PayoutDetailsFormProps {
  submitLabel: string;
  loading?: boolean;
  onSubmit: (details: PayoutDetails) => void | Promise<void>;
}

const UPI_PATTERN = /^[\w.\-]{2,}@[a-zA-Z]{2,}$/;
const IFSC_PATTERN = /^[A-Z]{4}0[A-Z0-9]{6}$/;

// Where should the money be sent? UPI id or bank account. Used by every payout request
// (worker withdrawal, agent commission, agent's workers' payout).
export function PayoutDetailsForm({ submitLabel, loading, onSubmit }: PayoutDetailsFormProps) {
  const [method, setMethod] = useState<"UPI" | "BANK">("UPI");
  const [upiId, setUpiId] = useState("");
  const [accountHolderName, setAccountHolderName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifscCode, setIfscCode] = useState("");
  const [bankName, setBankName] = useState("");

  function handleSubmit() {
    if (method === "UPI") {
      if (!UPI_PATTERN.test(upiId.trim())) {
        toast.error("Enter a valid UPI id, e.g. name@bank.");
        return;
      }
      onSubmit({ method, upiId: upiId.trim() });
      return;
    }

    if (!accountHolderName.trim() || !bankName.trim()) {
      toast.error("Fill in the account holder name and bank name.");
      return;
    }
    if (!/^[0-9]{9,18}$/.test(accountNumber.trim())) {
      toast.error("Account number must be 9 to 18 digits.");
      return;
    }
    if (!IFSC_PATTERN.test(ifscCode.trim().toUpperCase())) {
      toast.error("Enter a valid IFSC code, e.g. SBIN0001234.");
      return;
    }
    onSubmit({
      method,
      accountHolderName: accountHolderName.trim(),
      accountNumber: accountNumber.trim(),
      ifscCode: ifscCode.trim().toUpperCase(),
      bankName: bankName.trim(),
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        {(
          [
            { value: "UPI", label: "UPI", icon: Smartphone },
            { value: "BANK", label: "Bank account", icon: Landmark },
          ] as const
        ).map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            type="button"
            onClick={() => setMethod(value)}
            className={cn(
              "flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors",
              method === value ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground",
            )}
          >
            <Icon className="size-4" /> {label}
          </button>
        ))}
      </div>

      {method === "UPI" ? (
        <div className="space-y-1.5">
          <Label htmlFor="payout-upi">UPI id</Label>
          <Input id="payout-upi" placeholder="name@bank" value={upiId} onChange={(e) => setUpiId(e.target.value)} />
        </div>
      ) : (
        <div className="space-y-2">
          <Input
            placeholder="Account holder name"
            value={accountHolderName}
            onChange={(e) => setAccountHolderName(e.target.value)}
          />
          <Input
            inputMode="numeric"
            placeholder="Account number"
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ""))}
          />
          <Input
            placeholder="IFSC code"
            value={ifscCode}
            onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
          />
          <Input placeholder="Bank name" value={bankName} onChange={(e) => setBankName(e.target.value)} />
        </div>
      )}

      <Button className="w-full" onClick={handleSubmit} loading={loading}>
        {submitLabel}
      </Button>
    </div>
  );
}
