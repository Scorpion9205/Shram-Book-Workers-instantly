---
name: shram-socket-realtime
description: >-
  Use this skill when implementing real-time features in SHRAM with Socket.IO:
  server setup, namespaces, rooms, JWT auth handshake, Socket.IO Redis adapter
  for horizontal scaling, and all event handlers. Activate when: user asks
  about WebSocket, Socket.IO setup, real-time notifications, chat, or
  instant request broadcasting.
---

# SHRAM — Socket.IO Real-Time Layer

## Namespaces

```
/instant-requests   — Instant request broadcasting to workers
/bidding            — Bidding room events (bid submitted, bid selected)
/chat               — Booking chat thread messages
/notifications      — General push notifications per user
```

## SocketServer Setup

```typescript
// socket/SocketServer.ts
import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import { env } from '../config/env.js';
import { socketAuthMiddleware } from './socket.middleware.js';

export class SocketServer {
  private static io: SocketIOServer;

  static async init(httpServer: HTTPServer): Promise<SocketIOServer> {
    SocketServer.io = new SocketIOServer(httpServer, {
      cors: {
        origin: env.FRONTEND_URL,
        credentials: true,
      },
      transports: ['websocket', 'polling'],
    });

    // Redis adapter for horizontal scaling
    const pubClient = createClient({ url: env.REDIS_URL });
    const subClient = pubClient.duplicate();
    await Promise.all([pubClient.connect(), subClient.connect()]);
    SocketServer.io.adapter(createAdapter(pubClient, subClient));

    // Attach JWT auth middleware to ALL namespaces
    SocketServer.io.use(socketAuthMiddleware);

    // Mount namespace handlers
    new InstantRequestNamespace(SocketServer.io.of('/instant-requests')).register();
    new BiddingNamespace(SocketServer.io.of('/bidding')).register();
    new ChatNamespace(SocketServer.io.of('/chat')).register();
    new NotificationNamespace(SocketServer.io.of('/notifications')).register();

    return SocketServer.io;
  }

  static getInstance(): SocketIOServer {
    if (!SocketServer.io) throw new Error('SocketServer not initialized');
    return SocketServer.io;
  }
}
```

## Socket Auth Middleware

```typescript
// socket/socket.middleware.ts
import { Socket } from 'socket.io';
import { tokenService } from '../modules/auth/index.js';

export const socketAuthMiddleware = (socket: Socket, next: (err?: Error) => void): void => {
  const token = socket.handshake.auth?.token ?? socket.handshake.headers?.authorization?.split(' ')[1];

  if (!token) {
    return next(new Error('Authentication required'));
  }

  try {
    const payload = tokenService.verifyAccessToken(token);
    socket.data.user = { id: payload.userId, role: payload.role };
    next();
  } catch (e) {
    next(new Error('Invalid token'));
  }
};
```

## Room Naming Conventions (socket.rooms.ts)

```typescript
// socket/socket.rooms.ts
export const SocketRooms = {
  user: (userId: string) => `user:${userId}`,
  booking: (bookingId: string) => `booking:${bookingId}`,
  instantRequest: (requestId: string) => `instant_request:${requestId}`,
  bidding: (biddingId: string) => `bidding:${biddingId}`,
  workerPool: (skillId: string) => `workers:skill:${skillId}`,
} as const;
```

## Socket Events Constants (socket.events.ts)

```typescript
// socket/socket.events.ts
export const SocketEvents = {
  // Instant Requests
  IR_NEW: 'instant_request:new',
  IR_CLOSED: 'instant_request:closed',
  IR_ACCEPTED: 'instant_request:accepted',
  IR_NO_WORKERS: 'instant_request:no_workers',

  // Bidding
  BID_SUBMITTED: 'bid:submitted',
  BID_SELECTED: 'bid:selected',
  BIDDING_CLOSED: 'bidding:closed',

  // Booking
  BOOKING_STATUS_CHANGED: 'booking:status_changed',
  OTP_SENT: 'booking:otp_sent',

  // Chat
  MESSAGE_NEW: 'chat:message_new',
  MESSAGE_READ: 'chat:message_read',
  USER_TYPING: 'chat:user_typing',

  // Notifications
  NOTIFICATION_NEW: 'notification:new',

  // Worker presence
  WORKER_ONLINE: 'worker:online',
  WORKER_OFFLINE: 'worker:offline',
  WORKER_LOCATION_UPDATE: 'worker:location_update',
} as const;
```

## Instant Request Namespace Handler

```typescript
// socket/handlers/InstantRequestNamespace.ts
import { Namespace, Socket } from 'socket.io';

export class InstantRequestNamespace {
  constructor(private readonly namespace: Namespace) {}

  register(): void {
    this.namespace.on('connection', (socket: Socket) => {
      const userId = socket.data.user.id;
      const role = socket.data.user.role;

      // Each user joins their personal room
      socket.join(SocketRooms.user(userId));

      if (role === 'WORKER') {
        this.handleWorkerConnection(socket, userId);
      }

      socket.on('disconnect', () => {
        if (role === 'WORKER') {
          workerLocationService.setOffline(userId).catch(console.error);
        }
      });
    });
  }

  private handleWorkerConnection(socket: Socket, workerId: string): void {
    socket.on('worker:go_online', async (data: { lat: number; lng: number }) => {
      await workerLocationService.setOnline(workerId, data.lat, data.lng);
      socket.emit('worker:status_updated', { status: 'ONLINE' });
    });

    socket.on('worker:location_update', async (data: { lat: number; lng: number }) => {
      await workerLocationService.updateLocation(workerId, data.lat, data.lng);
    });

    socket.on('worker:go_offline', async () => {
      await workerLocationService.setOffline(workerId);
    });
  }
}
```

## SocketGateway (Used by Services)

Services emit via SocketGateway — never directly import io instance:

```typescript
// socket/SocketGateway.ts
export interface ISocketGateway {
  emitToUser(userId: string, event: string, payload: object): Promise<void>;
  emitToRoom(room: string, event: string, payload: object): Promise<void>;
  emitToAll(namespace: string, event: string, payload: object): Promise<void>;
}

export class SocketGateway implements ISocketGateway {
  constructor(private readonly io: SocketIOServer) {}

  async emitToUser(userId: string, event: string, payload: object): Promise<void> {
    this.io.to(SocketRooms.user(userId)).emit(event, payload);
  }

  async emitToRoom(room: string, event: string, payload: object): Promise<void> {
    this.io.to(room).emit(event, payload);
  }

  async emitToAll(namespace: string, event: string, payload: object): Promise<void> {
    this.io.of(namespace).emit(event, payload);
  }
}
```
