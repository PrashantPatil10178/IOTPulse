import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma.js";

export const setupSocketAuth = (io) => {
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.headers.token || socket.handshake.auth.token;

      if (!token) {
        return next(new Error("Authentication error: Token missing"));
      }

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const user = await prisma.user.findUnique({
          where: { id: decoded.userId },
          select: { id: true, email: true, fullName: true, role: true },
        });

        if (!user) {
          return next(new Error("Authentication error: User not found"));
        }

        socket.user = user;
        next();
      } catch (error) {
        return next(new Error("Authentication error: Invalid token"));
      }
    } catch (error) {
      console.error("Socket authentication error:", error);
      return next(new Error("Authentication error"));
    }
  });

  io.on("connection", (socket) => {
    console.log(`User connected: ${socket.user.id}`);

    socket.join(`user:${socket.user.id}`);

    socket.on("disconnect", () => {
      console.log(`User disconnected: ${socket.user.id}`);
    });
  });
};
