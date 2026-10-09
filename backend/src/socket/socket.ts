import { Server, type Socket, type Namespace } from "socket.io";
import type { Server as HttpServer } from "http";
import jwt from "jsonwebtoken";
import { createAdapter } from "@socket.io/redis-adapter";
import { redis } from "../shared/config/redis.js";
import { Logger } from "../core/logger/Logger.js";
import { env } from "../config/env.js";
import { PrismaService } from "../database/prisma/PrismaService.js";

const logger = new Logger("Socket");

let io: Server;

interface AuthedSocket extends Socket {
  userId?: string;
  role?: string;
}

/**
 * Verifies the same access token the REST API uses, on any namespace. Shared so every
 * namespace (default, /chat, and any added later) gates connections identically instead of
 * each reimplementing its own JWT check.
 */
function authenticateSocket(socket: AuthedSocket, next: (err?: Error) => void): void {
  try {
    const token = socket.handshake.auth?.token as string | undefined;

    if (!token) {
      return next(new Error("Authentication token required"));
    }

    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as {
      userId: string;
      role: string;
    };

    socket.userId = decoded.userId;
    socket.role = decoded.role;

    next();
  } catch {
    next(new Error("Invalid or expired token"));
  }
}

/**
 * Mirrors ChatService's own REST-side ownership check — a socket may only join a booking's
 * chat room if it belongs to that booking's Provider or assigned Worker, otherwise any
 * authenticated socket could eavesdrop on any booking's chat just by guessing its id.
 */
async function isBookingParticipant(userId: string | undefined, bookingId: string): Promise<boolean> {
  if (!userId) return false;

  const booking = await PrismaService.getInstance().client.booking.findUnique({
    where: { id: bookingId },
    select: { providerId: true, worker: { select: { userId: true } } },
  });

  if (!booking) return false;
  return booking.providerId === userId || booking.worker?.userId === userId;
}

export const initializeSocket = (
  server: HttpServer
) => {

  io = new Server(server, {
    cors: {
      origin: env.FRONTEND_URL,
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  // Redis adapter: without this, Socket.IO can only deliver events to clients connected to
  // THIS process — running more than one API instance behind a load balancer means a user
  // connected to instance A would never receive an event emitted from instance B (e.g. a
  // worker's accept processed on a different instance than the provider's open socket).
  // Two separate connections are required: one dedicated to publishing, one to subscribing.
  const pubClient = redis.duplicate();
  const subClient = redis.duplicate();
  io.adapter(createAdapter(pubClient, subClient));
  pubClient.on("error", (err) => logger.error("Redis adapter pub client error", err));
  subClient.on("error", (err) => logger.error("Redis adapter sub client error", err));

  // Authenticate every socket connection using the same access token
  // the REST API uses, so we know which user each socket belongs to.
  io.use(authenticateSocket);

  io.on("connection", (socket: AuthedSocket) => {

    console.log(
      "Socket Connected:",
      socket.id,
      "user:",
      socket.userId
    );

    // Every authenticated socket joins a private room keyed to its user id.
    // This lets us send targeted events (booking updates, notifications)
    // to a specific user instead of broadcasting to everyone.
    if (socket.userId) {
      socket.join(`user:${socket.userId}`);
    }

    socket.on(
      "join_skill_room",
      (skillId: string) => {

        socket.join(
          `skill:${skillId}`
        );

        console.log(
          `${socket.id} joined skill:${skillId}`
        );

      }
    );

    socket.on(
      "leave_skill_room",
      (skillId: string) => {

        socket.leave(
          `skill:${skillId}`
        );

        console.log(
          `${socket.id} left skill:${skillId}`
        );

      }
    );

    socket.on("disconnect", () => {

      console.log(
        "Socket Disconnected:",
        socket.id
      );

    });

  });

  // /chat namespace — rooms keyed by bookingId. A client joins/leaves the room for whichever
  // booking's chat thread it currently has open; ChatService emits new messages to that room.
  const chatNamespace = io.of("/chat");
  chatNamespace.use(authenticateSocket);
  chatNamespace.on("connection", (socket: AuthedSocket) => {
    socket.on("join_chat", async (bookingId: string) => {
      const allowed = await isBookingParticipant(socket.userId, bookingId);
      if (!allowed) {
        logger.warn(`Socket ${socket.id} (user ${socket.userId}) denied join_chat for booking ${bookingId}`);
        return;
      }
      socket.join(`booking:${bookingId}`);
    });

    socket.on("leave_chat", (bookingId: string) => {
      socket.leave(`booking:${bookingId}`);
    });
  });

};

export const getIO = () => {

  if (!io) {
    throw new Error(
      "Socket not initialized"
    );
  }

  return io;

};

export const getChatNamespace = (): Namespace => {
  if (!io) {
    throw new Error("Socket not initialized");
  }
  return io.of("/chat");
};
