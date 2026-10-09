"use client";

import { useEffect, useRef } from "react";
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

  useEffect(() => {
    if (!enabled || typeof window === "undefined" || !("geolocation" in navigator)) {
      return;
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        lastCoordsRef.current = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        };
      },
      () => {
        /* permission denied or unavailable — silently ignore */
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );

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
