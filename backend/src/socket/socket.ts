import { Server } from "socket.io";
import type { Server as HttpServer } from "http";

let io: Server;

export const initializeSocket = (
  server: HttpServer
) => {

  io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {

    console.log(
      "Socket Connected:",
      socket.id
    );

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