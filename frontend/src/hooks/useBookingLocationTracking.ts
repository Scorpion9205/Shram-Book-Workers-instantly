"use client";

import { useEffect, useState } from "react";
import { useSocket } from "@/providers/SocketProvider";

export interface WorkerLivePosition {
  latitude: number;
  longitude: number;
  updatedAt: string;
}

/**
 * Provider side of live booking tracking — while `enabled` (the booking is WORKER_EN_ROUTE),
 * joins the booking's tracking room and returns the Worker's latest broadcast position, or
 * null until the first update arrives.
 */
export function useBookingLocationTracking(bookingId: string, enabled: boolean): WorkerLivePosition | null {
  const { socket } = useSocket();
  const [position, setPosition] = useState<WorkerLivePosition | null>(null);

  useEffect(() => {
    if (!enabled || !socket) return;

    function joinRoom() {
      socket!.emit("track:join", bookingId);
    }

    if (socket.connected) joinRoom();
    socket.on("connect", joinRoom);

    function onLocation(payload: WorkerLivePosition & { bookingId: string }) {
      if (payload.bookingId === bookingId) {
        setPosition({ latitude: payload.latitude, longitude: payload.longitude, updatedAt: payload.updatedAt });
      }
    }

    socket.on("worker:location", onLocation);

    return () => {
      socket.emit("track:leave", bookingId);
      socket.off("connect", joinRoom);
      socket.off("worker:location", onLocation);
    };
  }, [enabled, bookingId, socket]);

  return enabled ? position : null;
}
