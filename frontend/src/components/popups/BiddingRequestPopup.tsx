"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MapPin, IndianRupee, Clock, X, Gavel } from "lucide-react";
import { toast } from "sonner";
import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { clearIncomingBiddingRequest } from "@/store/uiSlice";
import { useSubmitBidMutation } from "@/features/instantRequests/instantRequestApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Bidding is not a "first worker wins" race like direct requests, so there's no fixed
// accept-or-lose countdown. We just show time remaining until the request itself expires,
// capped so the modal doesn't sit open for the full (up to 30min) window if ignored.
const DISPLAY_CAP_SECONDS = 120;

export function BiddingRequestPopup() {
  const dispatch = useAppDispatch();
  const incoming = useAppSelector((s) => s.ui.incomingBiddingRequest);
  const [submitBid, { isLoading: isSubmitting }] = useSubmitBidMutation();
  const [secondsLeft, setSecondsLeft] = useState(DISPLAY_CAP_SECONDS);
  const [bidAmount, setBidAmount] = useState("");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const { minBid, maxBid } = useMemo(() => {
    if (!incoming) return { minBid: 0, maxBid: 0 };
    return {
      minBid: Math.ceil(incoming.amount * 0.8),
      maxBid: Math.floor(incoming.amount),
    };
  }, [incoming]);

  useEffect(() => {
    if (!incoming) return;
    const remainingUntilExpiry = Math.floor((new Date(incoming.expiresAt).getTime() - Date.now()) / 1000);
    setSecondsLeft(Math.max(0, Math.min(DISPLAY_CAP_SECONDS, remainingUntilExpiry)));
    setBidAmount(String(incoming.amount));

    try {
      audioRef.current = new Audio(
        "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA="
      );
      audioRef.current.loop = true;
      audioRef.current.volume = 0.5;
      audioRef.current.play().catch(() => {});
    } catch {
      /* ignore */
    }

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(interval);
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, [incoming]);

  useEffect(() => {
    if (incoming && secondsLeft === 0) {
      handleDismiss();
    }
  }, [secondsLeft]);

  if (!incoming) return null;

  const progress = (secondsLeft / DISPLAY_CAP_SECONDS) * 100;
  const parsedBid = Number(bidAmount);
  const isValidBid = Number.isFinite(parsedBid) && parsedBid >= minBid && parsedBid <= maxBid;

  function handleDismiss() {
    audioRef.current?.pause();
    dispatch(clearIncomingBiddingRequest());
  }

  async function handleSubmit() {
    if (!isValidBid) return;
    try {
      audioRef.current?.pause();
      await submitBid({ requestId: incoming!.requestId, bidAmount: parsedBid }).unwrap();
      dispatch(clearIncomingBiddingRequest());
      toast.success("Bid submitted! You'll be notified if the Provider selects you.");
    } catch {
      toast.error("Couldn't submit bid — the request may have closed");
      dispatch(clearIncomingBiddingRequest());
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        key="bidding-request-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-100 flex items-center justify-center bg-black/70 backdrop-blur-md p-4"
      >
        <motion.div
          initial={{ scale: 0.85, opacity: 0, y: 40 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.85, opacity: 0, y: 40 }}
          transition={{ type: "spring", stiffness: 260, damping: 24 }}
          className="relative w-full max-w-md overflow-hidden rounded-3xl bg-card shadow-soft-lg"
        >
          {/* Pulse header */}
          <div className="relative flex flex-col items-center gap-3 bg-linear-to-br from-accent to-amber-700 px-6 pb-8 pt-10 text-white">
            <div className="relative flex size-20 items-center justify-center">
              <span className="absolute inset-0 rounded-full bg-white/30 animate-pulse-ring" />
              <span className="absolute inset-0 rounded-full bg-white/20 animate-pulse-ring [animation-delay:0.5s]" />
              <div className="relative flex size-16 items-center justify-center rounded-full bg-white text-accent shadow-lg">
                <Gavel className="size-7" />
              </div>
            </div>
            <p className="text-sm font-medium uppercase tracking-wider text-white/80">
              New Bidding Request
            </p>
            <h2 className="text-2xl font-bold">{incoming.providerName}</h2>
          </div>

          {/* Countdown progress bar */}
          <div className="h-1.5 w-full bg-secondary">
            <motion.div
              className="h-full bg-accent"
              animate={{ width: `${progress}%` }}
              transition={{ ease: "linear", duration: 1 }}
            />
          </div>

          <div className="space-y-5 px-6 py-6">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-2xl bg-secondary p-3">
                <MapPin className="mx-auto mb-1 size-4 text-primary" />
                <p className="text-xs text-muted-foreground">Distance</p>
                <p className="text-sm font-semibold">
                  {incoming.distanceKm != null ? `${incoming.distanceKm} km` : "—"}
                </p>
              </div>
              <div className="rounded-2xl bg-secondary p-3">
                <IndianRupee className="mx-auto mb-1 size-4 text-primary" />
                <p className="text-xs text-muted-foreground">Listed</p>
                <p className="text-sm font-semibold">₹{incoming.amount}</p>
              </div>
              <div className="rounded-2xl bg-secondary p-3">
                <Clock className="mx-auto mb-1 size-4 text-primary" />
                <p className="text-xs text-muted-foreground">ETA</p>
                <p className="text-sm font-semibold">
                  {incoming.estimatedMinutes != null ? `${incoming.estimatedMinutes} min` : "—"}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-dashed border-border p-3 text-sm">
              <p className="font-medium capitalize">{incoming.workerType.replace("_", " ")}</p>
              {incoming.address && <p className="mt-0.5 text-muted-foreground">{incoming.address}</p>}
              {incoming.notes && (
                <p className="mt-1.5 text-xs text-muted-foreground">“{incoming.notes}”</p>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Your bid (₹{minBid} – ₹{maxBid})
              </label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="number"
                  inputMode="numeric"
                  className="pl-9"
                  value={bidAmount}
                  min={minBid}
                  max={maxBid}
                  onChange={(e) => setBidAmount(e.target.value)}
                />
              </div>
              {!isValidBid && bidAmount !== "" && (
                <p className="mt-1 text-xs text-destructive">
                  Bid must be between ₹{minBid} and ₹{maxBid}.
                </p>
              )}
            </div>

            <div className="flex items-center justify-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-accent/10 text-accent font-bold text-lg tabular-nums">
                {secondsLeft}
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                size="lg"
                className="flex-1 border-destructive/30 text-destructive hover:bg-destructive/5"
                onClick={handleDismiss}
                disabled={isSubmitting}
              >
                <X className="size-4" />
                Dismiss
              </Button>
              <Button
                variant="default"
                size="lg"
                className="flex-1"
                onClick={handleSubmit}
                loading={isSubmitting}
                disabled={!isValidBid}
              >
                <Gavel className="size-4" />
                Submit Bid
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
