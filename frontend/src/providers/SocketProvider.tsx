"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { toast } from "sonner";
import { SOCKET_URL } from "@/lib/constants";
import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { showIncomingInstantRequest } from "@/store/uiSlice";
import { notificationReceived } from "@/store/notificationSlice";
import { apiSlice } from "@/services/api/apiSlice";
import type { AppNotification, Booking, InstantRequest } from "@/types";

interface SocketContextValue {
  socket: Socket | null;
  connected: boolean;
}

const SocketContext = createContext<SocketContextValue>({ socket: null, connected: false });

export function useSocket() {
  return useContext(SocketContext);
}

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);
  const accessToken = useAppSelector((s) => s.auth.accessToken);
  const role = useAppSelector((s) => s.auth.user?.role);
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !accessToken) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setConnected(false);
      return;
    }

    const socket = io(SOCKET_URL, {
      auth: { token: accessToken },
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1500,
    });
    socketRef.current = socket;

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));

    // --- Instant Requests (worker side) ---
    socket.on(
      "newInstantRequest",
      (payload: { itemId: string; request: InstantRequest }) => {
        dispatch(
          showIncomingInstantRequest({
            itemId: payload.itemId,
            request: payload.request,
            receivedAt: Date.now(),
          })
        );
      }
    );

    // --- Booking lifecycle updates ---
    socket.on("bookingUpdated", (booking: Booking) => {
      dispatch(apiSlice.util.invalidateTags([{ type: "Booking", id: booking.id }, "Booking"]));
      const statusMessages: Record<string, string> = {
        accepted: "Worker accepted the booking",
        started: "Worker has started the job",
        completed: "Job marked as completed",
        cancelled: "Booking was cancelled",
      };
      const msg = statusMessages[booking.status];
      if (msg) toast.success(msg);
    });

    // --- Realtime notifications ---
    socket.on("notification", (notification: AppNotification) => {
      dispatch(notificationReceived(notification));
      const toastFn =
        notification.type === "error"
          ? toast.error
          : notification.type === "warning"
            ? toast.warning
            : notification.type === "success"
              ? toast.success
              : toast.info;
      toastFn(notification.title, { description: notification.message });
    });

    // --- Worker availability / dashboard refresh hooks ---
    socket.on("dashboardRefresh", () => {
      dispatch(apiSlice.util.invalidateTags(["DashboardWorker", "DashboardProvider"]));
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [isAuthenticated, accessToken, role, dispatch]);

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, connected }}>
      {children}
    </SocketContext.Provider>
  );
}
