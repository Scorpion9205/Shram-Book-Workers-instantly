"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useSocket } from "@/providers/SocketProvider";

const BROADCAST_INTERVAL_MS = 5_000;

/**
 * Worker side of live booking tracking — while `enabled` (the booking is WORKER_EN_ROUTE),
 * watches the browser's geolocation and emits `worker:location_update` for this specific
 * booking every 5 seconds so the Provider's `useBookingLocationTracking` can render it moving.
 */
export function useBookingLocationBroadcast(bookingId: string, enabled: boolean) {
  const { socket } = useSocket();
  const watchIdRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastCoordsRef = useRef<{ latitude: number; longitude: number } | null>(null);
  const hasWarnedRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      toast.error("Your browser doesn't support location sharing — the Provider won't see your live position.");
      return;
    }

    hasWarnedRef.current = false;

    function onError(error: GeolocationPositionError) {
      // GPS can still recover on a later watchPosition tick (e.g. a momentary signal loss),
      // so this doesn't stop the watch — it just surfaces the problem once instead of leaving
      // the Provider staring at "waiting for live location" with zero explanation.
      if (!hasWarnedRef.current) {
        hasWarnedRef.current = true;
        toast.error(
          error.code === error.PERMISSION_DENIED
            ? "Location access is blocked — enable it in your browser settings so the Provider can see you arriving."
            : "Couldn't get a GPS fix yet — your live location will share as soon as it's available."
        );
      }
    }

    function onPosition(pos: GeolocationPosition) {
      hasWarnedRef.current = false;
      lastCoordsRef.current = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      };
    }

    // Get an immediate fix instead of waiting for watchPosition's first (often slower) callback,
    // so the Provider isn't stuck on "waiting for live location" for longer than necessary.
    navigator.geolocation.getCurrentPosition(onPosition, onError, {
      enableHighAccuracy: true,
      maximumAge: 5000,
      timeout: 10000,
    });

    watchIdRef.current = navigator.geolocation.watchPosition(onPosition, onError, {
      enableHighAccuracy: true,
      maximumAge: 5000,
      timeout: 10000,
    });

    intervalRef.current = setInterval(() => {
      if (lastCoordsRef.current && socket?.connected) {
        socket.emit("worker:location_update", { bookingId, ...lastCoordsRef.current });
      }
    }, BROADCAST_INTERVAL_MS);

    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [enabled, bookingId, socket]);
}
