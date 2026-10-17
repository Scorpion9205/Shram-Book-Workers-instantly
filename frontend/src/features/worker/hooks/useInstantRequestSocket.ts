import { useEffect } from "react";
import { useSocket } from "@/providers/SocketProvider";
import { useAppDispatch } from "@/hooks/redux";
import { showIncomingInstantRequest, clearIncomingInstantRequest } from "@/store/uiSlice";
import type { InstantRequest } from "@/types";

export function useInstantRequestSocket() {
  const { socket } = useSocket();
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (!socket) return;

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

    // Someone else took the request (or the provider cancelled it): remove the popup so the
    // worker doesn't tap Accept on something that no longer exists.
    socket.on("instant_request:closed", () => {
      dispatch(clearIncomingInstantRequest());
    });

    return () => {
      socket.off("newInstantRequest");
      socket.off("instant_request:closed");
    };
  }, [socket, dispatch]);
}
