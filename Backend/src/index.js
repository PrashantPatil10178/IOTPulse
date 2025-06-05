import express from "express";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./docs/swagger.js";
import { prisma } from "./lib/prisma.js";

import authRoutes from "./routes/auth.route.js";
import deviceRoutes from "./routes/devices.route.js";
import sensorDataRoutes from "./routes/sensor.route.js";
import alertRoutes from "./routes/alert.route.js";
import settingsRoutes from "./routes/settings.route.js";
import dashboardRoutes from "./routes/dashboard.route.js";

import { authenticateJWT } from "./middleware/auth.js";
import { setupSocketAuth } from "./socket/auth.js";
import { setupDeviceHandlers } from "./socket/deviceHandlers.js";
import { setupAlertHandlers } from "./socket/alertHandlers.js";
import { iotRouter } from "./routes/iot.route.js";
import { authenticateApiKey } from "./middleware/apikey.js";

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

app.use(cors());
app.use(express.json());

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api/data", authenticateApiKey, iotRouter);
app.use("/api/auth", authRoutes);
app.use("/api/devices", authenticateJWT, deviceRoutes);
app.use("/api/sensor-data", authenticateJWT, sensorDataRoutes);
app.use("/api/alerts", authenticateJWT, alertRoutes);
app.use("/api/settings", authenticateJWT, settingsRoutes);
app.use("/api/dashboard", authenticateJWT, dashboardRoutes);

setupSocketAuth(io);
export const {
  emitDeviceStatusUpdate,
  emitNewSensorReading,
  isUserSubscribedToDevice,
} = setupDeviceHandlers(io);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.statusCode || 500).json({
    error: {
      message: err.message || "Internal Server Error",
      ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
    },
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, async () => {
  try {
    await prisma.$connect();
    console.log("Connected to database");
  } catch (error) {
    console.error("Database connection error:", error);
    process.exit(1);
  }
  console.log(`Server running on port ${PORT}`);
});

process.on("SIGTERM", async () => {
  console.log("SIGTERM received, shutting down gracefully");
  await prisma.$disconnect();
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});
