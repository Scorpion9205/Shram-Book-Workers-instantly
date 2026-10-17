"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { useCreateCompletionPaymentMutation } from "@/features/booking/bookingApi";

// Shows a payment QR for a finished job (like the QR a delivery or cab app shows). The QR encodes
// a Razorpay Payment Link; the provider scans it and pays with any UPI app. Once Razorpay
// confirms, the server settles the booking and the page above updates by itself.
export function PaymentQr({ bookingId, amount }: { bookingId: string; amount: number }) {
  const [createPayment, { isLoading }] = useCreateCompletionPaymentMutation();
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const result = await createPayment(bookingId).unwrap();
      setUrl(result.url);
    } catch (err: any) {
      setUrl(null);
      setError(err?.data?.message || "Couldn't load the payment QR. You can collect cash instead.");
    }
  }, [bookingId, createPayment]);

  useEffect(() => {
    load();
    // Only fetch once per booking when the card appears.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId]);

  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-emerald-100 bg-white p-4">
      {url ? (
        <QRCodeSVG value={url} size={224} marginSize={2} />
      ) : (
        <div className="flex size-56 items-center justify-center text-center text-sm text-muted-foreground">
          {isLoading ? "Preparing payment QR…" : error || "Payment QR not available"}
        </div>
      )}
      <p className="mt-2 text-sm font-semibold text-foreground">Pay ₹{amount}</p>
      <p className="text-xs text-muted-foreground">Scan using any UPI app</p>
      {!isLoading && (
        <Button variant="ghost" size="sm" className="mt-2" onClick={load}>
          <RefreshCw className="size-3.5" />
          {url ? "Refresh QR" : "Try again"}
        </Button>
      )}
    </div>
  );
}
