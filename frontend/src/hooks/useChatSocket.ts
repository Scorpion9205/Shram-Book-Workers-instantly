"use client";

import { useEffect, useRef } from "react";
import { io, type Socket } from "socket.io-client";
import { SOCKET_URL } from "@/lib/constants";
import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { chatApi, type ChatMessage } from "@/features/chat/chatApi";

/**
 * Connects to the dedicated /chat Socket.IO namespace and joins the room for `bookingId`,
 * pushing incoming messages straight into the RTK Query cache (no refetch needed) so the
 * chat UI updates in real time. Separate from the main SocketProvider connection since this
 * is only needed while a specific chat thread is open.
 */
export function useChatSocket(bookingId: string | undefined) {
  const dispatch = useAppDispatch();
  const accessToken = useAppSelector((s) => s.auth.accessToken);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!bookingId || !accessToken) return;

    const socket = io(`${SOCKET_URL}/chat`, {
      auth: { token: accessToken },
      transports: ["polling", "websocket"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1500,
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("join_chat", bookingId);
    });

    const onMessage = (message: ChatMessage) => {
      dispatch(
        chatApi.util.updateQueryData("getChatMessages", bookingId, (draft) => {
          if (draft.some((m) => m.id === message.id)) return;
          draft.push(message);
        }),
      );
    };
    socket.on("chat:message", onMessage);

    return () => {
      socket.emit("leave_chat", bookingId);
      socket.off("chat:message", onMessage);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [bookingId, accessToken, dispatch]);
}
