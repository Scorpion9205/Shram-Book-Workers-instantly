import { useEffect } from "react";
import { useSocket } from "@/providers/SocketProvider";
import { useAppDispatch } from "@/hooks/redux";
import { showIncomingInstantRequest } from "@/store/uiSlice";
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

    return () => {
      socket.off("newInstantRequest");
    };
  }, [socket, dispatch]);
}
