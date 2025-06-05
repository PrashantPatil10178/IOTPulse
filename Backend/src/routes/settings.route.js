import express from "express";
import { prisma } from "../lib/prisma.js";
import { isAdmin } from "../middleware/auth.js";
import crypto from "crypto";

const router = express.Router();

// Get appearance settings
router.get("/appearance", async (req, res) => {
  try {
    const userPreference = await prisma.userPreference.findUnique({
      where: { userId: req.user.id },
    });

    if (!userPreference) {
      return res.status(404).json({ error: "User preferences not found" });
    }

    res.json({
      themeMode: userPreference.themeMode,
      colorScheme: userPreference.colorScheme,
      animationsEnabled: userPreference.animationsEnabled,
      density: userPreference.density,
      roundedCorners: userPreference.roundedCorners,
      fontSize: userPreference.fontSize,
    });
  } catch (error) {
    console.error("Get appearance settings error:", error);
    res.status(500).json({ error: "Failed to get appearance settings" });
  }
});

// Update appearance settings
router.put("/appearance", async (req, res) => {
  try {
    const {
      themeMode,
      colorScheme,
      animationsEnabled,
      density,
      roundedCorners,
      fontSize,
    } = req.body;

    const updatedPreference = await prisma.userPreference.update({
      where: { userId: req.user.id },
      data: {
        themeMode,
        colorScheme,
        animationsEnabled,
        density,
        roundedCorners,
        fontSize,
      },
    });

    res.json({
      themeMode: updatedPreference.themeMode,
      colorScheme: updatedPreference.colorScheme,
      animationsEnabled: updatedPreference.animationsEnabled,
      density: updatedPreference.density,
      roundedCorners: updatedPreference.roundedCorners,
      fontSize: updatedPreference.fontSize,
    });
  } catch (error) {
    console.error("Update appearance settings error:", error);
    res.status(500).json({ error: "Failed to update appearance settings" });
  }
});

// Get notification settings
router.get("/notifications", async (req, res) => {
  try {
    const userPreference = await prisma.userPreference.findUnique({
      where: { userId: req.user.id },
    });

    if (!userPreference) {
      return res.status(404).json({ error: "User preferences not found" });
    }

    res.json({
      email: userPreference.emailNotifications,
      push: userPreference.pushNotifications,
      sms: userPreference.smsNotifications,
      alertsOnly: userPreference.alertsOnly,
      notificationSounds: userPreference.notificationSounds,
    });
  } catch (error) {
    console.error("Get notification settings error:", error);
    res.status(500).json({ error: "Failed to get notification settings" });
  }
});

// Update notification settings
router.put("/notifications", async (req, res) => {
  try {
    const { email, push, sms, alertsOnly, notificationSounds } = req.body;

    const updatedPreference = await prisma.userPreference.update({
      where: { userId: req.user.id },
      data: {
        emailNotifications: email,
        pushNotifications: push,
        smsNotifications: sms,
        alertsOnly,
        notificationSounds,
      },
    });

    res.json({
      email: updatedPreference.emailNotifications,
      push: updatedPreference.pushNotifications,
      sms: updatedPreference.smsNotifications,
      alertsOnly: updatedPreference.alertsOnly,
      notificationSounds: updatedPreference.notificationSounds,
    });
  } catch (error) {
    console.error("Update notification settings error:", error);
    res.status(500).json({ error: "Failed to update notification settings" });
  }
});

// Get account settings
router.get("/account", async (req, res) => {
  try {
    const userPreference = await prisma.userPreference.findUnique({
      where: { userId: req.user.id },
    });

    if (!userPreference) {
      return res.status(404).json({ error: "User preferences not found" });
    }

    res.json({
      language: userPreference.language,
      timezone: userPreference.timezone,
    });
  } catch (error) {
    console.error("Get account settings error:", error);
    res.status(500).json({ error: "Failed to get account settings" });
  }
});

// Update account settings
router.put("/account", async (req, res) => {
  try {
    const { language, timezone } = req.body;

    const updatedPreference = await prisma.userPreference.update({
      where: { userId: req.user.id },
      data: {
        language,
        timezone,
      },
    });

    res.json({
      language: updatedPreference.language,
      timezone: updatedPreference.timezone,
    });
  } catch (error) {
    console.error("Update account settings error:", error);
    res.status(500).json({ error: "Failed to update account settings" });
  }
});

// Get system settings (admin only)
router.get("/system", isAdmin, async (req, res) => {
  try {
    // In a real system, these would be stored in a system settings table
    // For simplicity, we'll return mock data
    res.json({
      dataRetention: 90, // days
      backupFrequency: "daily",
      analyticsEnabled: true,
      maxDevicesPerUser: 50,
      maxApiKeysPerUser: 5,
    });
  } catch (error) {
    console.error("Get system settings error:", error);
    res.status(500).json({ error: "Failed to get system settings" });
  }
});

// Update system settings (admin only)
router.put("/system", isAdmin, async (req, res) => {
  try {
    const {
      dataRetention,
      backupFrequency,
      analyticsEnabled,
      maxDevicesPerUser,
      maxApiKeysPerUser,
    } = req.body;

    // In a real system, these would be stored in a system settings table
    // For simplicity, we'll just return the input data
    res.json({
      dataRetention,
      backupFrequency,
      analyticsEnabled,
      maxDevicesPerUser,
      maxApiKeysPerUser,
    });
  } catch (error) {
    console.error("Update system settings error:", error);
    res.status(500).json({ error: "Failed to update system settings" });
  }
});

// Get API keys
router.get("/api-keys", async (req, res) => {
  try {
    const apiKeys = await prisma.apiKey.findMany({
      where: { userId: req.user.id },
      select: {
        id: true,
        name: true,
        prefix: true,
        key: true,
        createdAt: true,
        lastUsedAt: true,
      },
    });

    res.json(apiKeys);
  } catch (error) {
    console.error("Get API keys error:", error);
    res.status(500).json({ error: "Failed to get API keys" });
  }
});

// Create API key
router.post("/api-keys", async (req, res) => {
  try {
    const { name } = req.body;

    // Generate a random API key
    const apiKeyValue = crypto.randomBytes(32).toString("hex");
    const prefix = apiKeyValue.substring(0, 8);

    // Create API key
    const apiKey = await prisma.apiKey.create({
      data: {
        name,
        key: apiKeyValue,
        prefix,
        userId: req.user.id,
      },
    });

    res.status(201).json({
      id: apiKey.id,
      name: apiKey.name,
      apiKey: apiKeyValue, // Only show the full key once
      prefix: apiKey.prefix,
      createdAt: apiKey.createdAt,
    });
  } catch (error) {
    console.error("Create API key error:", error);
    res.status(500).json({ error: "Failed to create API key" });
  }
});

// Delete API key
router.delete("/api-keys/:keyId", async (req, res) => {
  try {
    const { keyId } = req.params;

    // Check if API key exists and user owns it
    const apiKey = await prisma.apiKey.findUnique({
      where: { id: keyId },
    });

    if (!apiKey) {
      return res.status(404).json({ error: "API key not found" });
    }

    if (apiKey.userId !== req.user.id && req.user.role !== "ADMIN") {
      return res.status(403).json({ error: "Access denied" });
    }

    // Delete API key
    await prisma.apiKey.delete({
      where: { id: keyId },
    });

    res.json({ message: "API key deleted successfully" });
  } catch (error) {
    console.error("Delete API key error:", error);
    res.status(500).json({ error: "Failed to delete API key" });
  }
});

export default router;
