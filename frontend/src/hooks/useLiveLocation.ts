"use client";

import { useEffect, useRef } from "react";
import { useUpdateLocationMutation } from "@/features/location/locationApi";
import { useAppSelector } from "@/hooks/redux";

const UPDATE_INTERVAL_MS = 10_000;

/**
 * Tracks the worker's live location using the browser Geolocation API and pushes it to the
 * backend every 10 seconds while active — this feeds the Redis geo-index used for nearby-worker
 * matching on instant requests, independent of any specific booking. Only runs for authenticated
 * workers who are marked available.
 *
 * For live tracking during a specific active booking (Provider watching a Worker en route),
 * see `useBookingLocationBroadcast`.
 */
export function useLiveLocation(enabled: boolean) {
  const [updateLocation] = useUpdateLocationMutation();
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);
  const watchIdRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastCoordsRef = useRef<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    if (!enabled || !isAuthenticated || typeof window === "undefined" || !("geolocation" in navigator)) {
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
        /* permission denied or unavailable — silently ignore, UI can surface a banner */
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );

    intervalRef.current = setInterval(async () => {
      if (lastCoordsRef.current) {
        try {
          await updateLocation(lastCoordsRef.current).unwrap();
        } catch (err) {
          console.error("Failed to update live location", err);
        }
      }
    }, UPDATE_INTERVAL_MS);

    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [enabled, isAuthenticated, updateLocation]);
}
