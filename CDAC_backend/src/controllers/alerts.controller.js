import { prisma } from "../lib/prisma.js";

export const alertsController = {
  async getAllAlerts(req, res) {
    try {
      const { status, severity, deviceId, page = 1, limit = 10 } = req.query;

      const skip = (Number.parseInt(page) - 1) * Number.parseInt(limit);

      const where = {
        userId: req.user.id,
        ...(status && { status }),
        ...(severity && { severity }),
        ...(deviceId && { deviceId }),
      };

      const [alerts, totalCount] = await Promise.all([
        prisma.alert.findMany({
          where,
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
          skip,
          take: Number.parseInt(limit),
        }),
        prisma.alert.count({ where }),
      ]);

      const totalPages = Math.ceil(totalCount / Number.parseInt(limit));

      res.json({
        alerts,
        pagination: {
          total: totalCount,
          page: Number.parseInt(page),
          limit: Number.parseInt(limit),
          totalPages,
        },
      });
    } catch (error) {
      console.error("Get alerts error:", error);
      res.status(500).json({ error: "Failed to get alerts" });
    }
  },

  async getAlert(req, res) {
    try {
      const { alertId } = req.params;

      const alert = await prisma.alert.findUnique({
        where: { id: alertId },
        include: {
          device: {
            select: {
              id: true,
              name: true,
              type: true,
              location: true,
            },
          },
        },
      });

      if (!alert) {
        return res.status(404).json({ error: "Alert not found" });
      }

      if (alert.userId !== req.user.id && req.user.role !== "ADMIN") {
        return res.status(403).json({ error: "Access denied" });
      }

      res.json(alert);
    } catch (error) {
      console.error("Get alert error:", error);
      res.status(500).json({ error: "Failed to get alert" });
    }
  },

  async acknowledgeAlert(req, res) {
    try {
      const { alertId } = req.params;

      const alert = await prisma.alert.findUnique({
        where: { id: alertId },
      });

      if (!alert) {
        return res.status(404).json({ error: "Alert not found" });
      }

      if (alert.userId !== req.user.id && req.user.role !== "ADMIN") {
        return res.status(403).json({ error: "Access denied" });
      }

      const updatedAlert = await prisma.alert.update({
        where: { id: alertId },
        data: {
          status: "ACKNOWLEDGED",
          acknowledgedAt: new Date(),
        },
      });

      res.json(updatedAlert);
    } catch (error) {
      console.error("Acknowledge alert error:", error);
      res.status(500).json({ error: "Failed to acknowledge alert" });
    }
  },

  async resolveAlert(req, res) {
    try {
      const { alertId } = req.params;
      const { resolutionNotes } = req.body;

      const alert = await prisma.alert.findUnique({
        where: { id: alertId },
      });

      if (!alert) {
        return res.status(404).json({ error: "Alert not found" });
      }

      if (alert.userId !== req.user.id && req.user.role !== "ADMIN") {
        return res.status(403).json({ error: "Access denied" });
      }

      const updatedAlert = await prisma.alert.update({
        where: { id: alertId },
        data: {
          status: "RESOLVED",
          resolvedAt: new Date(),
          resolutionNotes,
        },
      });

      res.json(updatedAlert);
    } catch (error) {
      console.error("Resolve alert error:", error);
      res.status(500).json({ error: "Failed to resolve alert" });
    }
  },

  async createAlert(req, res) {
    try {
      const { deviceId, title, message, severity } = req.body;

      const device = await prisma.device.findUnique({
        where: { id: deviceId },
      });

      if (!device) {
        return res.status(404).json({ error: "Device not found" });
      }

      if (device.userId !== req.user.id && req.user.role !== "ADMIN") {
        return res.status(403).json({ error: "Access denied" });
      }

      const alert = await prisma.alert.create({
        data: {
          deviceId,
          userId: req.user.id,
          title,
          message,
          severity,
        },
      });

      res.status(201).json(alert);
    } catch (error) {
      console.error("Create alert error:", error);
      res.status(500).json({ error: "Failed to create alert" });
    }
  },
};
