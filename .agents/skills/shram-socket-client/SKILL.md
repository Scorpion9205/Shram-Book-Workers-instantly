---
name: shram-socket-client
description: >-
  Use this skill when implementing Socket.IO client-side in the SHRAM frontend:
  socket provider setup, connecting to namespaces, event listener patterns,
  the SocketProvider React context, and hooks for consuming real-time events
  (instant requests, notifications, chat). Activate when: user asks about
  frontend WebSocket, Socket.IO client, real-time updates, or socket hooks.
---

# SHRAM — Frontend Socket.IO Client

## Socket Manager (services/socket/socket.ts)

```typescript
// services/socket/socket.ts
import { io, Socket } from 'socket.io-client';
import { env } from '@/lib/config/env.js';

export type SocketNamespace = 'instant-requests' | 'bidding' | 'chat' | 'notifications';

const sockets = new Map<SocketNamespace, Socket>();

export function getSocket(namespace: SocketNamespace, token: string): Socket {
  if (!sockets.has(namespace)) {
    const socket = io(`${env.NEXT_PUBLIC_API_URL}/${namespace}`, {
      auth: { token },
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      transports: ['websocket'],
    });
    sockets.set(namespace, socket);
  }
  return sockets.get(namespace)!;
}

export function connectSocket(namespace: SocketNamespace, token: string): Socket {
  const socket = getSocket(namespace, token);
  if (!socket.connected) socket.connect();
  return socket;
}

export function disconnectSocket(namespace: SocketNamespace): void {
  sockets.get(namespace)?.disconnect();
}

export function disconnectAll(): void {
  sockets.forEach(socket => socket.disconnect());
  sockets.clear();
}
```

## SocketProvider (providers/SocketProvider.tsx)

```typescript
// providers/SocketProvider.tsx
'use client';

import React, { createContext, useContext, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useSelector } from 'react-redux';
import { selectAccessToken } from '@/store/slices/authSlice.js';
import { useAppDispatch } from '@/store/index.js';
import { addNotification } from '@/store/slices/notificationSlice.js';
import { addMessage } from '@/store/slices/chatSlice.js';

interface SocketContextValue {
  notificationSocket: Socket | null;
  chatSocket: Socket | null;
  instantRequestSocket: Socket | null;
}

const SocketContext = createContext<SocketContextValue>({
  notificationSocket: null,
  chatSocket: null,
  instantRequestSocket: null,
});

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const token = useSelector(selectAccessToken);
  const dispatch = useAppDispatch();
  const socketRefs = useRef<Record<string, Socket>>({});

  useEffect(() => {
    if (!token) {
      // Disconnect all on logout
      Object.values(socketRefs.current).forEach(s => s.disconnect());
      socketRefs.current = {};
      return;
    }

    // Connect to notification namespace for all users
    const notifSocket = io(`${process.env.NEXT_PUBLIC_API_URL}/notifications`, {
      auth: { token },
      transports: ['websocket'],
    });

    notifSocket.on('notification:new', (payload) => {
      dispatch(addNotification(payload));
    });

    socketRefs.current.notifications = notifSocket;

    return () => {
      notifSocket.disconnect();
    };
  }, [token]);

  const value: SocketContextValue = {
    notificationSocket: socketRefs.current.notifications ?? null,
    chatSocket: socketRefs.current.chat ?? null,
    instantRequestSocket: socketRefs.current.instantRequests ?? null,
  };

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export const useSocketContext = () => useContext(SocketContext);
```

## Custom Socket Hooks

```typescript
// features/notification/hooks/useNotificationSocket.ts
export function useNotificationSocket() {
  const { notificationSocket } = useSocketContext();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!notificationSocket) return;

    const handler = () => setUnreadCount(prev => prev + 1);
    notificationSocket.on('notification:new', handler);
    return () => { notificationSocket.off('notification:new', handler); };
  }, [notificationSocket]);

  return { unreadCount };
}

// features/chat/hooks/useChatSocket.ts
export function useChatSocket(bookingId: string) {
  const token = useSelector(selectAccessToken);
  const [messages, setMessages] = useState<Message[]>([]);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!token) return;

    const socket = io(`${process.env.NEXT_PUBLIC_API_URL}/chat`, {
      auth: { token },
      transports: ['websocket'],
    });

    socket.emit('chat:join', { bookingId });

    socket.on('chat:message_new', (message: Message) => {
      setMessages(prev => [...prev, message]);
    });

    socketRef.current = socket;
    return () => { socket.disconnect(); };
  }, [token, bookingId]);

  const sendMessage = (content: string) => {
    socketRef.current?.emit('chat:send_message', { bookingId, content });
  };

  return { messages, sendMessage };
}

// features/worker/hooks/useInstantRequestSocket.ts (for Worker role)
export function useInstantRequestSocket() {
  const token = useSelector(selectAccessToken);
  const [pendingRequest, setPendingRequest] = useState<InstantRequest | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!token) return;

    const socket = io(`${process.env.NEXT_PUBLIC_API_URL}/instant-requests`, {
      auth: { token },
      transports: ['websocket'],
    });

    socket.on('instant_request:new', (request: InstantRequest) => {
      setPendingRequest(request);
    });

    socket.on('instant_request:closed', () => {
      setPendingRequest(null);
    });

    socketRef.current = socket;
    return () => { socket.disconnect(); };
  }, [token]);

  const acceptRequest = (requestId: string) => {
    socketRef.current?.emit('instant_request:accept', { requestId });
  };

  const goOnline = (lat: number, lng: number) => {
    socketRef.current?.emit('worker:go_online', { lat, lng });
  };

  const updateLocation = (lat: number, lng: number) => {
    socketRef.current?.emit('worker:location_update', { lat, lng });
  };

  return { pendingRequest, acceptRequest, goOnline, updateLocation };
}
```

## Provider Registration (app/providers.tsx)

```typescript
// app/providers.tsx
'use client';

import { Provider as ReduxProvider } from 'react-redux';
import { store } from '@/store/index.js';
import { SocketProvider } from '@/providers/SocketProvider.js';
import { ThemeProvider } from '@/providers/ThemeProvider.js';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ReduxProvider store={store}>
      <ThemeProvider>
        <SocketProvider>
          {children}
        </SocketProvider>
      </ThemeProvider>
    </ReduxProvider>
  );
}
```
