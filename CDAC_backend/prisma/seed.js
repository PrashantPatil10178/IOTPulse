import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  // Create admin user
  const adminPassword = await bcrypt.hash("admin123", 10);
  const admin = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      email: "admin@example.com",
      password: adminPassword,
      fullName: "Admin User",
      role: "ADMIN",
      userPreference: {
        create: {},
      },
    },
  });

  console.log("Admin user created:", admin.id);

  // Create regular user
  const userPassword = await bcrypt.hash("user123", 10);
  const user = await prisma.user.upsert({
    where: { email: "user@example.com" },
    update: {},
    create: {
      email: "user@example.com",
      password: userPassword,
      fullName: "Demo User",
      role: "USER",
      userPreference: {
        create: {},
      },
    },
  });

  console.log("Demo user created:", user.id);

  // Create devices for demo user
  const devices = [
    {
      name: "Living Room Temperature",
      type: "TEMPERATURE_SENSOR",
      status: "ONLINE",
      location: "Living Room",
      latitude: 12.9716,
      longitude: 77.5946,
      batteryLevel: 85,
      firmware: "v1.2.0",
      lastSeen: new Date(),
    },
    {
      name: "Kitchen Humidity",
      type: "HUMIDITY_SENSOR",
      status: "ONLINE",
      location: "Kitchen",
      latitude: 12.9716,
      longitude: 77.5948,
      batteryLevel: 72,
      firmware: "v1.1.5",
      lastSeen: new Date(),
    },
    {
      name: "Bedroom Motion",
      type: "MOTION_DETECTOR",
      status: "OFFLINE",
      location: "Bedroom",
      latitude: 12.9718,
      longitude: 77.5946,
      batteryLevel: 15,
      firmware: "v1.0.0",
      lastSeen: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
    },
    {
      name: "Garage Smart Light",
      type: "SMART_LIGHT",
      status: "ONLINE",
      location: "Garage",
      latitude: 12.972,
      longitude: 77.595,
      batteryLevel: null, // Mains powered
      firmware: "v2.0.1",
      lastSeen: new Date(),
    },
    {
      name: "Office Energy Meter",
      type: "ENERGY_METER",
      status: "ONLINE",
      location: "Office",
      latitude: 12.9715,
      longitude: 77.594,
      batteryLevel: null, // Mains powered
      firmware: "v1.3.2",
      lastSeen: new Date(),
    },
  ];

  for (const deviceData of devices) {
    const device = await prisma.device.create({
      data: {
        ...deviceData,
        userId: user.id,
      },
    });

    console.log(`Device created: ${device.name} (${device.id})`);

    // Generate sample sensor data for each device
    if (device.type === "TEMPERATURE_SENSOR") {
      // Generate temperature readings for the past 24 hours
      const now = new Date();
      for (let i = 0; i < 24; i++) {
        const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000);
        const value = 22 + Math.random() * 5; // Random temperature between 22-27°C

        await prisma.sensorData.create({
          data: {
            deviceId: device.id,
            metric: "temperature",
            value,
            unit: "°C",
            timestamp,
          },
        });
      }
    } else if (device.type === "HUMIDITY_SENSOR") {
      // Generate humidity readings for the past 24 hours
      const now = new Date();
      for (let i = 0; i < 24; i++) {
        const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000);
        const value = 40 + Math.random() * 20; // Random humidity between 40-60%

        await prisma.sensorData.create({
          data: {
            deviceId: device.id,
            metric: "humidity",
            value,
            unit: "%",
            timestamp,
          },
        });
      }
    } else if (device.type === "MOTION_DETECTOR") {
      // Generate motion events (0 or 1) for the past 24 hours
      const now = new Date();
      for (let i = 0; i < 24; i++) {
        const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000);
        const value = Math.random() > 0.7 ? 1 : 0; // 30% chance of motion

        await prisma.sensorData.create({
          data: {
            deviceId: device.id,
            metric: "motion",
            value,
            unit: "event",
            timestamp,
          },
        });
      }
    } else if (device.type === "ENERGY_METER") {
      // Generate energy consumption readings
      const now = new Date();
      for (let i = 0; i < 24; i++) {
        const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000);
        const value = 0.5 + Math.random() * 1.5; // Random energy between 0.5-2 kWh

        await prisma.sensorData.create({
          data: {
            deviceId: device.id,
            metric: "energy",
            value,
            unit: "kWh",
            timestamp,
          },
        });
      }
    } else if (device.type === "SMART_LIGHT") {
      // Generate light status readings
      const now = new Date();
      for (let i = 0; i < 24; i++) {
        const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000);
        const value = Math.random() > 0.6 ? 1 : 0; // 40% chance of being on

        await prisma.sensorData.create({
          data: {
            deviceId: device.id,
            metric: "status",
            value,
            unit: "boolean",
            timestamp,
          },
        });
      }
    }
  }

  // Create sample alerts
  const alerts = [
    {
      deviceId: devices[2].id, // Bedroom Motion
      title: "Low Battery",
      message:
        "Device battery level is critically low (15%). Please replace batteries soon.",
      severity: "HIGH",
      status: "ACTIVE",
    },
    {
      deviceId: devices[0].id, // Living Room Temperature
      title: "High Temperature",
      message: "Temperature exceeded threshold (26°C).",
      severity: "MEDIUM",
      status: "ACKNOWLEDGED",
      acknowledgedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    },
    {
      deviceId: devices[3].id, // Garage Smart Light
      title: "Device Offline",
      message: "Device was offline for more than 30 minutes.",
      severity: "LOW",
      status: "RESOLVED",
      acknowledgedAt: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago
      resolvedAt: new Date(Date.now() - 10 * 60 * 60 * 1000), // 10 hours ago
      resolutionNotes: "Power outage resolved.",
    },
  ];

  for (const alertData of alerts) {
    const alert = await prisma.alert.create({
      data: {
        ...alertData,
        userId: user.id,
      },
    });

    console.log(`Alert created: ${alert.title} (${alert.id})`);
  }

  console.log("Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
