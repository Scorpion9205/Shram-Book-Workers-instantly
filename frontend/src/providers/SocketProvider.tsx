"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { SOCKET_URL } from "@/lib/constants";
import { useAppDispatch } from "@/hooks/redux";
import { useAuth } from "@/hooks/useAuth";
import { usePermission } from "@/hooks/usePermission";
import { showIncomingInstantRequest } from "@/store/uiSlice";
import { notificationReceived } from "@/store/notificationSlice";
import { apiSlice } from "@/services/api/apiSlice";
import { useGetMyWorkerProfileQuery } from "@/features/worker/workerApi";
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
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { isAuthenticated, accessToken } = useAuth();
  const { isWorker, isProvider } = usePermission();
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  // Only fetch worker profile for workers — used purely to know which
  // skill rooms this socket should join so instant-request pushes for
  // those skills reach it.
  const { data: workerProfile } = useGetMyWorkerProfileQuery(undefined, {
    skip: !isAuthenticated || !isWorker,
  });

  useEffect(() => {
    if (!isAuthenticated || !accessToken) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setConnected(false);
      return;
    }

    const socket = io(SOCKET_URL, {
      auth: { token: accessToken },
      transports: ["polling", "websocket"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1500,
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      if (isWorker) {
        workerProfile?.skills?.forEach((s) => socket.emit("join_skill_room", s.id));
      }
    });
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
      dispatch(
        apiSlice.util.invalidateTags([
          { type: "Booking", id: booking.id },
          "Booking",
          "InstantRequest",
          "DashboardWorker",
          "DashboardProvider",
        ])
      );
      const statusMessages: Record<string, string> = {
        accepted: "Worker accepted the booking",
        started: "Worker has started the job",
        completed: "Job marked as completed",
        cancelled: "Booking was cancelled",
        WORKER_ASSIGNED: "Worker has been assigned to the booking",
        WORKER_EN_ROUTE: "Worker is on the way",
        WORK_STARTED: "Work has started",
        WORK_COMPLETED: "Work has been completed",
        CANCELLED_BY_PROVIDER: "Booking was cancelled by provider",
        CANCELLED_BY_WORKER: "Booking was cancelled by worker",
      };
      const msg = statusMessages[booking.status];
      if (msg) toast.success(msg);

      if (booking.status === "WORKER_ASSIGNED") {
        if (isWorker) {
          toast.success("You have been assigned to a booking!");
          router.push(`/worker/booking/${booking.id}`);
        } else if (isProvider) {
          router.push(`/provider/booking/${booking.id}`);
        }
      }
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
  }, [isAuthenticated, accessToken, isWorker, isProvider, dispatch]);

  // Re-join skill rooms if the worker's skill list loads or changes
  // after the socket already connected (e.g. profile fetch finishes late).
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !connected || !isWorker || !workerProfile?.skills) return;

    workerProfile.skills.forEach((s) => socket.emit("join_skill_room", s.id));

    return () => {
      workerProfile.skills?.forEach((s) => socket.emit("leave_skill_room", s.id));
    };
  }, [workerProfile, isWorker, connected]);

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, connected }}>
      {children}
    </SocketContext.Provider>
  );
}