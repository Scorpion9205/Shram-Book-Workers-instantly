import { Server, type Socket } from "socket.io";
import type { Server as HttpServer } from "http";
import jwt from "jsonwebtoken";

let io: Server;

interface AuthedSocket extends Socket {
  userId?: string;
  role?: string;
}

export const initializeSocket = (
  server: HttpServer
) => {

  io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  // Authenticate every socket connection using the same access token
  // the REST API uses, so we know which user each socket belongs to.
  io.use((socket: AuthedSocket, next) => {
    try {
      const token = socket.handshake.auth?.token as string | undefined;

      if (!token) {
        return next(new Error("Authentication token required"));
      }

      const secret = process.env.JWT_ACCESS_SECRET;

      if (!secret) {
        return next(new Error("Server configuration error"));
      }

      const decoded = jwt.verify(token, secret) as {
        userId: string;
        role: string;
      };

      socket.userId = decoded.userId;
      socket.role = decoded.role;

      next();
    } catch {
      next(new Error("Invalid or expired token"));
    }
  });

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

};

export const getIO = () => {

  if (!io) {
    throw new Error(
      "Socket not initialized"
    );
  }

  return io;

};