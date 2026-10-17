"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { MapPin, IndianRupee, Clock, X, Check, Briefcase } from "lucide-react";
import { toast } from "sonner";
import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { clearIncomingInstantRequest } from "@/store/uiSlice";
import { useAcceptInstantRequestItemMutation } from "@/features/instantRequests/instantRequestApi";
import { Button } from "@/components/ui/button";

export function InstantRequestPopup() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const incoming = useAppSelector((s) => s.ui.incomingInstantRequest);
  const [acceptItem, { isLoading: isAccepting }] = useAcceptInstantRequestItemMutation();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // The popup stays until the worker taps Accept or Reject (or the server closes the request).
  // There is no countdown or expiry. This only plays a short alert sound while it is open.
  useEffect(() => {
    if (!incoming) return;

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

    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, [incoming]);

  if (!incoming) return null;

  const { itemId, request } = incoming;

  // Reject just closes the popup for this worker; nothing is sent to the server.
  function handleReject() {
    audioRef.current?.pause();
    dispatch(clearIncomingInstantRequest());
  }

  async function handleAccept() {
    try {
      audioRef.current?.pause();
      const result = await acceptItem(itemId).unwrap();
      dispatch(clearIncomingInstantRequest());
      toast.success("Request accepted! Heading to booking…");
      router.push(`/worker/booking/${result.bookingId}`);
    } catch {
      toast.error("Couldn't accept — it may have been taken by another worker");
      dispatch(clearIncomingInstantRequest());
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        key="instant-request-overlay"
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
          <div className="relative flex flex-col items-center gap-3 bg-linear-to-br from-primary to-emerald-700 px-6 pb-8 pt-10 text-white">
            <div className="relative flex size-20 items-center justify-center">
              <span className="absolute inset-0 rounded-full bg-white/30 animate-pulse-ring" />
              <span className="absolute inset-0 rounded-full bg-white/20 animate-pulse-ring [animation-delay:0.5s]" />
              <div className="relative flex size-16 items-center justify-center rounded-full bg-white text-primary shadow-lg">
                <Briefcase className="size-7" />
              </div>
            </div>
            <p className="text-sm font-medium uppercase tracking-wider text-white/80">
              New Instant Request
            </p>
            <h2 className="text-2xl font-bold">{request.providerName || "A nearby Provider"}</h2>
          </div>

          <div className="space-y-5 px-6 py-6">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-2xl bg-secondary p-3">
                <MapPin className="mx-auto mb-1 size-4 text-primary" />
                <p className="text-xs text-muted-foreground">Distance</p>
                <p className="text-sm font-semibold">
                  {request.distanceKm != null ? `${request.distanceKm} km` : "—"}
                </p>
              </div>
              <div className="rounded-2xl bg-secondary p-3">
                <IndianRupee className="mx-auto mb-1 size-4 text-primary" />
                <p className="text-xs text-muted-foreground">Amount</p>
                <p className="text-sm font-semibold">₹{request.amount}</p>
              </div>
              <div className="rounded-2xl bg-secondary p-3">
                <Clock className="mx-auto mb-1 size-4 text-primary" />
                <p className="text-xs text-muted-foreground">ETA</p>
                <p className="text-sm font-semibold">
                  {request.estimatedMinutes != null ? `${request.estimatedMinutes} min` : "—"}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-dashed border-border p-3 text-sm">
              <p className="font-medium capitalize">{request.workerType.replace("_", " ")}</p>
              <p className="mt-0.5 text-muted-foreground">{request.address}</p>
              {request.notes && (
                <p className="mt-1.5 text-xs text-muted-foreground">“{request.notes}”</p>
              )}
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                size="lg"
                className="flex-1 border-destructive/30 text-destructive hover:bg-destructive/5"
                onClick={handleReject}
                disabled={isAccepting}
              >
                <X className="size-4" />
                Reject
              </Button>
              <Button
                variant="default"
                size="lg"
                className="flex-1 bg-success hover:bg-success/90 text-success-foreground"
                onClick={handleAccept}
                loading={isAccepting}
              >
                <Check className="size-4" />
                Accept
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
