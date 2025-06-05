import { z } from "zod";
import { prisma } from "../lib/prisma.js";

// Validation schemas
const queryParamsSchema = z.object({
  status: z.enum(["ACTIVE", "ACKNOWLEDGED", "RESOLVED"]).optional(),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  deviceId: z.string().uuid().optional(),
  page: z.string().regex(/^\d+$/).transform(Number).default("1"),
  limit: z.string().regex(/^\d+$/).transform(Number).default("10"),
});

const alertIdSchema = z.object({
  alertId: z.string().uuid("Invalid alert ID format"),
});

const createAlertSchema = z.object({
  deviceId: z.string().uuid("Device ID must be a valid UUID"),
  title: z
    .string()
    .min(1, "Title is required")
    .max(255, "Title must be less than 255 characters"),
  message: z
    .string()
    .min(1, "Message is required")
    .max(1000, "Message must be less than 1000 characters"),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"], {
    errorMap: () => ({
      message: "Severity must be one of: LOW, MEDIUM, HIGH, CRITICAL",
    }),
  }),
});

const resolveAlertSchema = z.object({
  resolutionNotes: z
    .string()
    .max(1000, "Resolution notes must be less than 1000 characters")
    .optional(),
});

// Helper function for validation error handling
const handleValidationError = (error, res) => {
  const errors = error.errors.map((err) => ({
    field: err.path.join("."),
    message: err.message,
  }));

  return res.status(400).json({
    error: "Validation failed",
    details: errors,
  });
};

// Helper function for database error handling
const handleDatabaseError = (error, res, operation) => {
  console.error(`${operation} error:`, error);

  if (error.code === "P2002") {
    return res.status(409).json({ error: "Duplicate entry" });
  }

  if (error.code === "P2025") {
    return res.status(404).json({ error: "Record not found" });
  }

  return res
    .status(500)
    .json({ error: `Failed to ${operation.toLowerCase()}` });
};

export const alertsController = {
  async getAllAlerts(req, res) {
    try {
      // Validate query parameters
      const validationResult = queryParamsSchema.safeParse(req.query);
      if (!validationResult.success) {
        return handleValidationError(validationResult.error, res);
      }

      const { status, severity, deviceId, page, limit } = validationResult.data;

      // Validate pagination limits
      if (limit > 100) {
        return res.status(400).json({
          error: "Limit cannot exceed 100 items per page",
        });
      }

      const skip = (page - 1) * limit;

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
          take: limit,
        }),
        prisma.alert.count({ where }),
      ]);

      const totalPages = Math.ceil(totalCount / limit);

      res.json({
        alerts,
        pagination: {
          total: totalCount,
          page,
          limit,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      });
    } catch (error) {
      return handleDatabaseError(error, res, "Get alerts");
    }
  },

  async getAlert(req, res) {
    try {
      // Validate alert ID parameter
      const validationResult = alertIdSchema.safeParse(req.params);
      if (!validationResult.success) {
        return handleValidationError(validationResult.error, res);
      }

      const { alertId } = validationResult.data;

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

      // Authorization check
      if (alert.userId !== req.user.id && req.user.role !== "ADMIN") {
        return res.status(403).json({ error: "Access denied" });
      }

      res.json(alert);
    } catch (error) {
      return handleDatabaseError(error, res, "Get alert");
    }
  },

  async acknowledgeAlert(req, res) {
    try {
      // Validate alert ID parameter
      const validationResult = alertIdSchema.safeParse(req.params);
      if (!validationResult.success) {
        return handleValidationError(validationResult.error, res);
      }

      const { alertId } = validationResult.data;

      const alert = await prisma.alert.findUnique({
        where: { id: alertId },
      });

      if (!alert) {
        return res.status(404).json({ error: "Alert not found" });
      }

      // Authorization check
      if (alert.userId !== req.user.id && req.user.role !== "ADMIN") {
        return res.status(403).json({ error: "Access denied" });
      }

      // Check if alert is already acknowledged or resolved
      if (alert.status === "ACKNOWLEDGED") {
        return res.status(400).json({ error: "Alert is already acknowledged" });
      }

      if (alert.status === "RESOLVED") {
        return res
          .status(400)
          .json({ error: "Cannot acknowledge a resolved alert" });
      }

      const updatedAlert = await prisma.alert.update({
        where: { id: alertId },
        data: {
          status: "ACKNOWLEDGED",
          acknowledgedAt: new Date(),
        },
        include: {
          device: {
            select: {
              id: true,
              name: true,
              type: true,
            },
          },
        },
      });

      res.json(updatedAlert);
    } catch (error) {
      return handleDatabaseError(error, res, "Acknowledge alert");
    }
  },

  async resolveAlert(req, res) {
    try {
      // Validate alert ID parameter
      const paramsValidation = alertIdSchema.safeParse(req.params);
      if (!paramsValidation.success) {
        return handleValidationError(paramsValidation.error, res);
      }

      // Validate request body
      const bodyValidation = resolveAlertSchema.safeParse(req.body);
      if (!bodyValidation.success) {
        return handleValidationError(bodyValidation.error, res);
      }

      const { alertId } = paramsValidation.data;
      const { resolutionNotes } = bodyValidation.data;

      const alert = await prisma.alert.findUnique({
        where: { id: alertId },
      });

      if (!alert) {
        return res.status(404).json({ error: "Alert not found" });
      }

      // Authorization check
      if (alert.userId !== req.user.id && req.user.role !== "ADMIN") {
        return res.status(403).json({ error: "Access denied" });
      }

      // Check if alert is already resolved
      if (alert.status === "RESOLVED") {
        return res.status(400).json({ error: "Alert is already resolved" });
      }

      const updatedAlert = await prisma.alert.update({
        where: { id: alertId },
        data: {
          status: "RESOLVED",
          resolvedAt: new Date(),
          ...(resolutionNotes && { resolutionNotes }),
        },
        include: {
          device: {
            select: {
              id: true,
              name: true,
              type: true,
            },
          },
        },
      });

      res.json(updatedAlert);
    } catch (error) {
      return handleDatabaseError(error, res, "Resolve alert");
    }
  },

  async createAlert(req, res) {
    try {
      // Validate request body
      const validationResult = createAlertSchema.safeParse(req.body);
      if (!validationResult.success) {
        return handleValidationError(validationResult.error, res);
      }

      const { deviceId, title, message, severity } = validationResult.data;

      // Check if device exists and user has access
      const device = await prisma.device.findUnique({
        where: { id: deviceId },
      });

      if (!device) {
        return res.status(404).json({ error: "Device not found" });
      }

      // Authorization check
      if (device.userId !== req.user.id && req.user.role !== "ADMIN") {
        return res.status(403).json({ error: "Access denied to this device" });
      }

      // Check for duplicate active alerts for the same device
      const existingAlert = await prisma.alert.findFirst({
        where: {
          deviceId,
          title,
          status: {
            in: ["ACTIVE", "ACKNOWLEDGED"],
          },
        },
      });

      if (existingAlert) {
        return res.status(409).json({
          error:
            "An active or acknowledged alert with the same title already exists for this device",
        });
      }

      const alert = await prisma.alert.create({
        data: {
          deviceId,
          userId: req.user.id,
          title,
          message,
          severity,
          status: "ACTIVE", // Explicitly set default status
        },
        include: {
          device: {
            select: {
              id: true,
              name: true,
              type: true,
            },
          },
        },
      });

      res.status(201).json(alert);
    } catch (error) {
      return handleDatabaseError(error, res, "Create alert");
    }
  },

  // Additional utility method for bulk operations
  async bulkAcknowledgeAlerts(req, res) {
    try {
      const bulkSchema = z.object({
        alertIds: z
          .array(z.string().uuid())
          .min(1, "At least one alert ID is required")
          .max(50, "Cannot process more than 50 alerts at once"),
      });

      const validationResult = bulkSchema.safeParse(req.body);
      if (!validationResult.success) {
        return handleValidationError(validationResult.error, res);
      }

      const { alertIds } = validationResult.data;

      // Check if all alerts exist and belong to the user
      const alerts = await prisma.alert.findMany({
        where: {
          id: { in: alertIds },
          userId: req.user.id,
          status: "ACTIVE",
        },
      });

      if (alerts.length !== alertIds.length) {
        return res.status(400).json({
          error: "Some alerts were not found or are not in ACTIVE status",
        });
      }

      const updatedAlerts = await prisma.alert.updateMany({
        where: {
          id: { in: alertIds },
          userId: req.user.id,
          status: "ACTIVE",
        },
        data: {
          status: "ACKNOWLEDGED",
          acknowledgedAt: new Date(),
        },
      });

      res.json({
        message: `Successfully acknowledged ${updatedAlerts.count} alerts`,
        acknowledgedCount: updatedAlerts.count,
      });
    } catch (error) {
      return handleDatabaseError(error, res, "Bulk acknowledge alerts");
    }
  },
};
