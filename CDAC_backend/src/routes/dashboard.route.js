import express from "express";
import { prisma } from "../lib/prisma.js";

const router = express.Router();

router.get("/summary", async (req, res) => {
  try {
    // Get user's devices
    const devices = await prisma.device.findMany({
      where: { userId: req.user.id },
    });

    const totalDevices = devices.length;
    const onlineDevices = devices.filter(
      (device) => device.status === "ONLINE"
    ).length;

    // Calculate average battery level
    let batteryHealthAvg = 0;
    const devicesWithBattery = devices.filter(
      (device) => device.batteryLevel !== null
    );

    if (devicesWithBattery.length > 0) {
      const totalBattery = devicesWithBattery.reduce(
        (sum, device) => sum + device.batteryLevel,
        0
      );
      batteryHealthAvg = totalBattery / devicesWithBattery.length;
    }

    // Get active alerts
    const activeAlerts = await prisma.alert.count({
      where: {
        userId: req.user.id,
        status: { in: ["ACTIVE", "ACKNOWLEDGED"] },
      },
    });

    // Get recent alerts
    const recentAlerts = await prisma.alert.findMany({
      where: { userId: req.user.id },
      include: {
        device: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    // Get device locations for map
    const deviceLocations = devices
      .filter((device) => device.latitude !== null && device.longitude !== null)
      .map((device) => ({
        deviceId: device.id,
        name: device.name,
        type: device.type,
        status: device.status,
        lat: device.latitude,
        lon: device.longitude,
      }));

    res.json({
      totalDevices,
      onlineDevices,
      activeAlerts,
      batteryHealthAvg,
      recentAlerts,
      deviceLocations,
    });
  } catch (error) {
    console.error("Get dashboard summary error:", error);
    res.status(500).json({ error: "Failed to get dashboard summary" });
  }
});

export default router;
