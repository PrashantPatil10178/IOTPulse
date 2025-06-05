import express from "express";
import { prisma } from "../lib/prisma.js";

const router = express.Router();

// Get sensor data for a specific device
router.get("/:deviceId", async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { metric, timeRange = "24h", aggregate } = req.query;

    // Check if device exists and user owns it
    const device = await prisma.device.findUnique({
      where: { id: deviceId },
    });

    if (!device) {
      return res.status(404).json({ error: "Device not found" });
    }

    if (device.userId !== req.user.id && req.user.role !== "ADMIN") {
      return res.status(403).json({ error: "Access denied" });
    }

    // Calculate time range
    const now = new Date();
    let startTime;

    switch (timeRange) {
      case "1h":
        startTime = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case "6h":
        startTime = new Date(now.getTime() - 6 * 60 * 60 * 1000);
        break;
      case "24h":
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case "7d":
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "30d":
        startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    // Build query
    const where = {
      deviceId,
      timestamp: { gte: startTime },
      ...(metric && { metric }),
    };

    // If aggregation is requested, we need to handle it differently
    if (aggregate) {
      // For simplicity, we'll just return the data and let the frontend handle aggregation
      // In a real system, you'd use database aggregation functions
      const data = await prisma.sensorData.findMany({
        where,
        orderBy: { timestamp: "asc" },
      });

      res.json({ data });
    } else {
      // Return raw data
      const data = await prisma.sensorData.findMany({
        where,
        orderBy: { timestamp: "asc" },
      });

      res.json({ data });
    }
  } catch (error) {
    console.error("Get sensor data error:", error);
    res.status(500).json({ error: "Failed to get sensor data" });
  }
});

// Get aggregated sensor data
router.get("/aggregate", async (req, res) => {
  try {
    const { metric, groupBy, timeRange = "7d" } = req.query;

    if (!metric) {
      return res.status(400).json({ error: "Metric parameter is required" });
    }

    // Calculate time range
    const now = new Date();
    let startTime;

    switch (timeRange) {
      case "1h":
        startTime = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case "6h":
        startTime = new Date(now.getTime() - 6 * 60 * 60 * 1000);
        break;
      case "24h":
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case "7d":
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "30d":
        startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    // Get devices owned by the user
    const userDevices = await prisma.device.findMany({
      where: { userId: req.user.id },
      select: { id: true },
    });

    const deviceIds = userDevices.map((device) => device.id);

    // Get sensor data
    const sensorData = await prisma.sensorData.findMany({
      where: {
        deviceId: { in: deviceIds },
        metric,
        timestamp: { gte: startTime },
      },
      include: {
        device: {
          select: {
            id: true,
            name: true,
            location: true,
          },
        },
      },
      orderBy: { timestamp: "asc" },
    });

    // Group data based on groupBy parameter
    let groupedData = [];

    if (groupBy === "device") {
      // Group by device
      const deviceGroups = {};

      sensorData.forEach((data) => {
        if (!deviceGroups[data.deviceId]) {
          deviceGroups[data.deviceId] = {
            deviceId: data.deviceId,
            deviceName: data.device.name,
            values: [],
          };
        }

        deviceGroups[data.deviceId].values.push({
          timestamp: data.timestamp,
          value: data.value,
        });
      });

      groupedData = Object.values(deviceGroups);
    } else if (groupBy === "location") {
      // Group by location
      const locationGroups = {};

      sensorData.forEach((data) => {
        const location = data.device.location || "Unknown";

        if (!locationGroups[location]) {
          locationGroups[location] = {
            location,
            values: [],
          };
        }

        locationGroups[location].values.push({
          timestamp: data.timestamp,
          value: data.value,
        });
      });

      groupedData = Object.values(locationGroups);
    } else {
      // No grouping, just return all data
      groupedData = sensorData.map((data) => ({
        timestamp: data.timestamp,
        value: data.value,
        deviceId: data.deviceId,
        deviceName: data.device.name,
      }));
    }

    res.json({ data: groupedData });
  } catch (error) {
    console.error("Get aggregated sensor data error:", error);
    res.status(500).json({ error: "Failed to get aggregated sensor data" });
  }
});

// Add sensor data (for testing or manual input)
router.post("/:deviceId", async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { metric, value, unit, timestamp } = req.body;

    // Check if device exists and user owns it
    const device = await prisma.device.findUnique({
      where: { id: deviceId },
    });

    if (!device) {
      return res.status(404).json({ error: "Device not found" });
    }

    if (device.userId !== req.user.id && req.user.role !== "ADMIN") {
      return res.status(403).json({ error: "Access denied" });
    }

    // Create sensor data
    const sensorData = await prisma.sensorData.create({
      data: {
        deviceId,
        metric,
        value,
        unit,
        timestamp: timestamp ? new Date(timestamp) : new Date(),
      },
    });

    // Update device last seen
    await prisma.device.update({
      where: { id: deviceId },
      data: {
        lastSeen: new Date(),
        status: "ONLINE",
      },
    });

    res.status(201).json(sensorData);
  } catch (error) {
    console.error("Add sensor data error:", error);
    res.status(500).json({ error: "Failed to add sensor data" });
  }
});

// Ingest endpoint for devices to send data
router.post("/ingest", async (req, res) => {
  try {
    const { deviceId, apiKey, readings } = req.body;

    if (!deviceId || !apiKey || !readings || !Array.isArray(readings)) {
      return res.status(400).json({ error: "Invalid request format" });
    }

    // Verify API key
    const apiKeyRecord = await prisma.apiKey.findUnique({
      where: { key: apiKey },
      include: { user: true },
    });

    if (!apiKeyRecord) {
      return res.status(401).json({ error: "Invalid API key" });
    }

    // Check if device exists and belongs to the API key owner
    const device = await prisma.device.findUnique({
      where: { id: deviceId },
    });

    if (!device) {
      return res.status(404).json({ error: "Device not found" });
    }

    if (device.userId !== apiKeyRecord.user.id) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Update API key last used
    await prisma.apiKey.update({
      where: { id: apiKeyRecord.id },
      data: { lastUsedAt: new Date() },
    });

    // Process readings
    const sensorDataRecords = [];

    for (const reading of readings) {
      const { metric, value, unit, timestamp } = reading;

      if (!metric || value === undefined) {
        continue;
      }

      const sensorData = await prisma.sensorData.create({
        data: {
          deviceId,
          metric,
          value,
          unit,
          timestamp: timestamp ? new Date(timestamp) : new Date(),
        },
      });

      sensorDataRecords.push(sensorData);
    }

    // Update device last seen
    await prisma.device.update({
      where: { id: deviceId },
      data: {
        lastSeen: new Date(),
        status: "ONLINE",
      },
    });

    res.status(201).json({
      message: "Data ingested successfully",
      count: sensorDataRecords.length,
    });
  } catch (error) {
    console.error("Ingest sensor data error:", error);
    res.status(500).json({ error: "Failed to ingest sensor data" });
  }
});

export default router;
