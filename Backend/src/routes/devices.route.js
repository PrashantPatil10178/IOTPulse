import express from "express";
import { prisma } from "../lib/prisma.js";
import { mqttController } from "../controllers/mqtt.controller.js";
import { mosquittoConfig } from "../lib/mqttconfig.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const {
      search,
      type,
      status,
      sortBy = "name",
      order = "asc",
      page = 1,
      limit = 20,
    } = req.query;

    const skip = (Number.parseInt(page) - 1) * Number.parseInt(limit);

    // Build filter conditions
    const where = {
      userId: req.user.id,
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { location: { contains: search, mode: "insensitive" } },
        ],
      }),
      ...(type && { type }),
      ...(status && { status }),
    };

    // Get devices with pagination
    const [devices, totalCount] = await Promise.all([
      prisma.device.findMany({
        where,
        orderBy: { [sortBy]: order.toLowerCase() },
        skip,
        take: Number.parseInt(limit),
      }),
      prisma.device.count({ where }),
    ]);

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / Number.parseInt(limit));

    res.json({
      devices,
      pagination: {
        total: totalCount,
        page: Number.parseInt(page),
        limit: Number.parseInt(limit),
        totalPages,
      },
    });
  } catch (error) {
    console.error("Get devices error:", error);
    res.status(500).json({ error: "Failed to get devices" });
  }
});

// Create a new device
router.post("/", async (req, res) => {
  try {
    const {
      name,
      type,
      status,
      location,
      latitude,
      longitude,
      batteryLevel,
      firmware,
    } = req.body;

    const device = await prisma.device.create({
      data: {
        name,
        type,
        status,
        location,
        latitude,
        longitude,
        batteryLevel,
        firmware,
        userId: req.user.id,
      },
    });
    await mosquittoConfig.addDeviceCredentials(device);

    res.status(201).json(device);
  } catch (error) {
    console.error("Create device error:", error);
    res.status(500).json({ error: "Failed to create device" });
  }
});

// Get a specific device
router.get("/:deviceId", async (req, res) => {
  try {
    const { deviceId } = req.params;

    const device = await prisma.device.findUnique({
      where: { id: deviceId },
    });

    if (!device) {
      return res.status(404).json({ error: "Device not found" });
    }

    // Check if user owns the device or is admin
    if (device.userId !== req.user.id && req.user.role !== "ADMIN") {
      return res.status(403).json({ error: "Access denied" });
    }

    res.json(device);
  } catch (error) {
    console.error("Get device error:", error);
    res.status(500).json({ error: "Failed to get device" });
  }
});

// Update a device
router.put("/:deviceId", async (req, res) => {
  try {
    const { deviceId } = req.params;
    const {
      name,
      type,
      status,
      location,
      latitude,
      longitude,
      batteryLevel,
      firmware,
    } = req.body;

    // Check if device exists and user owns it
    const existingDevice = await prisma.device.findUnique({
      where: { id: deviceId },
    });

    if (!existingDevice) {
      return res.status(404).json({ error: "Device not found" });
    }

    if (existingDevice.userId !== req.user.id && req.user.role !== "ADMIN") {
      return res.status(403).json({ error: "Access denied" });
    }

    // Update device
    const updatedDevice = await prisma.device.update({
      where: { id: deviceId },
      data: {
        name,
        type,
        status,
        location,
        latitude,
        longitude,
        batteryLevel,
        firmware,
        lastSeen: status === "ONLINE" ? new Date() : existingDevice.lastSeen,
      },
    });

    res.json(updatedDevice);
  } catch (error) {
    console.error("Update device error:", error);
    res.status(500).json({ error: "Failed to update device" });
  }
});

// Delete a device
router.delete("/:deviceId", async (req, res) => {
  try {
    const { deviceId } = req.params;

    // Check if device exists and user owns it
    const existingDevice = await prisma.device.findUnique({
      where: { id: deviceId },
    });

    if (!existingDevice) {
      return res.status(404).json({ error: "Device not found" });
    }

    if (existingDevice.userId !== req.user.id && req.user.role !== "ADMIN") {
      return res.status(403).json({ error: "Access denied" });
    }

    // Delete device
    await prisma.device.delete({
      where: { id: deviceId },
    });

    res.json({ message: "Device deleted successfully" });
  } catch (error) {
    console.error("Delete device error:", error);
    res.status(500).json({ error: "Failed to delete device" });
  }
});

// Send action to a device
router.post("/:deviceId/action", async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { action, value } = req.body;

    // Check if device exists and user owns it
    const existingDevice = await prisma.device.findUnique({
      where: { id: deviceId },
    });

    if (!existingDevice) {
      return res.status(404).json({ error: "Device not found" });
    }

    if (existingDevice.userId !== req.user.id && req.user.role !== "ADMIN") {
      return res.status(403).json({ error: "Access denied" });
    }

    // Process action (in a real system, this would send a command to the device)
    let updatedDevice = existingDevice;

    switch (action) {
      case "reboot":
        // Simulate a reboot by setting status to OFFLINE then ONLINE
        updatedDevice = await prisma.device.update({
          where: { id: deviceId },
          data: { status: "OFFLINE" },
        });

        // After a delay, set back to ONLINE (in a real system, the device would report back)
        setTimeout(async () => {
          await prisma.device.update({
            where: { id: deviceId },
            data: {
              status: "ONLINE",
              lastSeen: new Date(),
            },
          });
        }, 5000);

        break;

      case "update_firmware":
        // Simulate firmware update
        updatedDevice = await prisma.device.update({
          where: { id: deviceId },
          data: {
            status: "MAINTENANCE",
            firmware: `v${
              Number.parseFloat(
                existingDevice.firmware?.replace("v", "") || "1.0"
              ) + 0.1
            }`,
          },
        });

        // After a delay, set back to ONLINE
        setTimeout(async () => {
          await prisma.device.update({
            where: { id: deviceId },
            data: {
              status: "ONLINE",
              lastSeen: new Date(),
            },
          });
        }, 10000);

        break;

      default:
        // For other actions like set_brightness, just update the device
        // In a real system, this would send a command to the device
        updatedDevice = await prisma.device.update({
          where: { id: deviceId },
          data: {
            lastSeen: new Date(),
          },
        });
    }

    res.json({
      message: `Action ${action} sent to device`,
      device: updatedDevice,
    });
  } catch (error) {
    console.error("Device action error:", error);
    res.status(500).json({ error: "Failed to send action to device" });
  }
});

export default router;
