"use client";

import { useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useSocket } from "@/providers/SocketProvider";
import {
  useGetMyWorkerProfileQuery,
  useUpdateAvailabilityMutation,
} from "@/features/worker/workerApi";
import { useWorkerLocation } from "../hooks/useWorkerLocation";
import { useUpdateLocationMutation } from "@/features/location/locationApi";

export function GoOnlineButton() {
  const { data: profile, isLoading } = useGetMyWorkerProfileQuery();
  const [updateAvailability, { isLoading: isUpdating }] = useUpdateAvailabilityMutation();
  const [updateLocation] = useUpdateLocationMutation();
  const { socket } = useSocket();

  // Watch location in background when online
  const isAvailable = profile?.isAvailable ?? false;
  useWorkerLocation(isAvailable);

  const handleToggle = async (checked: boolean) => {
    if (checked) {
      // Request geolocation permission before going online
      if (!("geolocation" in navigator)) {
        toast.error("Geolocation is not supported by your browser.");
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          try {
            // Update location first
            await updateLocation({ latitude, longitude }).unwrap();

            // Set available (online)
            await updateAvailability({ isAvailable: true }).unwrap();
            
            if (socket?.connected) {
              socket.emit("worker:go_online", { latitude, longitude });
            }
            toast.success("You are now online! Watching for instant requests...");
          } catch (err: unknown) {
            const message = (err as { data?: { message?: string } })?.data?.message || "Failed to go online.";
            toast.error(message);
          }
        },
        (error) => {
          toast.error("Please allow location access to go online.");
        },
        { enableHighAccuracy: true }
      );
    } else {
      try {
        await updateAvailability({ isAvailable: false }).unwrap();
        if (socket?.connected) {
          socket.emit("worker:go_offline");
        }
        toast.info("You are now offline.");
      } catch (err) {
        toast.error("Failed to go offline.");
      }
    }
  };

  // Auto go offline on page unload
  useEffect(() => {
    const handleUnload = () => {
      if (isAvailable && socket?.connected) {
        socket.emit("worker:go_offline");
      }
    };

    window.addEventListener("beforeunload", handleUnload);
    return () => {
      window.removeEventListener("beforeunload", handleUnload);
    };
  }, [isAvailable, socket]);

  if (isLoading) {
    return <div className="h-6 w-20 animate-pulse rounded bg-muted" />;
  }

  return (
    <div className="flex items-center gap-3 rounded-full border border-border bg-card/60 backdrop-blur-md px-4 py-2 shadow-sm transition-all hover:bg-card">
      <Switch
        id="online-status"
        checked={isAvailable}
        onCheckedChange={handleToggle}
        disabled={isUpdating}
      />
      <Label
        htmlFor="online-status"
        className={`text-sm font-semibold select-none cursor-pointer transition-colors ${
          isAvailable ? "text-emerald-500" : "text-muted-foreground"
        }`}
      >
        {isAvailable ? "Online" : "Offline"}
      </Label>
    </div>
  );
}
