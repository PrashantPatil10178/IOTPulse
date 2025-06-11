import mqtt from "mqtt";
import axios from "axios";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { emitNewSensorReading } from "../index.js";

// Device Types Enum
export const DeviceType = {
  TEMPERATURE_SENSOR: "TEMPERATURE_SENSOR",
  HUMIDITY_SENSOR: "HUMIDITY_SENSOR",
  MOTION_DETECTOR: "MOTION_DETECTOR",
  SMART_LIGHT: "SMART_LIGHT",
  SMART_PLUG: "SMART_PLUG",
  CAMERA: "CAMERA",
  ENERGY_METER: "ENERGY_METER",
  WATER_METER: "WATER_METER",
  AIR_QUALITY_SENSOR: "AIR_QUALITY_SENSOR",
  OTHER: "OTHER",
};

// Base Schema for all sensor data
const BaseSensorDataSchema = z.object({
  timestamp: z.string().datetime().optional(),
  source: z.string().optional(),
  deviceId: z.string().optional(),
  messageId: z.string().optional(),
  qos: z.number().min(0).max(2).optional(),
});

// MQTT Message Schema
const MqttMessageSchema = z.object({
  deviceId: z.string().min(1, "Device ID is required"),
  username: z.string().min(1, "Username is required"),
  timestamp: z.string().datetime().optional(),
  data: z.record(z.any()), // Will be validated against device-specific schema
  messageId: z.string().optional(),
  qos: z.number().min(0).max(2).optional(),
  source: z.string().default("MQTT"),
});

// Device-specific schemas
const TemperatureSensorSchema = BaseSensorDataSchema.extend({
  temperature: z
    .number()
    .min(-273.15)
    .max(1000, "Temperature exceeds maximum limit"),
  unit: z.enum(["celsius", "fahrenheit", "kelvin"]).default("celsius"),
  humidity: z.number().min(0).max(100).optional(),
  pressure: z.number().min(0).optional(),
});

const HumiditySensorSchema = BaseSensorDataSchema.extend({
  humidity: z.number().min(0).max(100, "Humidity must be between 0-100%"),
  unit: z.string().default("percent"),
  temperature: z.number().min(-50).max(80).optional(),
  dewPoint: z.number().optional(),
});

const MotionDetectorSchema = BaseSensorDataSchema.extend({
  motion: z.boolean().or(z.number().min(0).max(1)),
  confidence: z.number().min(0).max(100).optional(),
  duration: z.number().min(0).optional(),
  sensitivity: z.number().min(1).max(10).optional(),
  zone: z.string().optional(),
});

const SmartLightSchema = BaseSensorDataSchema.extend({
  status: z.enum(["on", "off"]),
  brightness: z.number().min(0).max(100).optional(),
  color: z
    .object({
      r: z.number().min(0).max(255),
      g: z.number().min(0).max(255),
      b: z.number().min(0).max(255),
    })
    .optional(),
  colorTemperature: z.number().min(1000).max(10000).optional(),
  powerConsumption: z.number().min(0).optional(),
  dimLevel: z.number().min(0).max(100).optional(),
});

const SmartPlugSchema = BaseSensorDataSchema.extend({
  status: z.enum(["on", "off"]),
  powerConsumption: z.number().min(0),
  voltage: z.number().min(0).max(300).optional(),
  current: z.number().min(0).optional(),
  totalEnergyUsed: z.number().min(0).optional(),
  schedule: z
    .object({
      enabled: z.boolean(),
      onTime: z.string().optional(),
      offTime: z.string().optional(),
    })
    .optional(),
});

const CameraSchema = BaseSensorDataSchema.extend({
  status: z.enum(["recording", "idle", "offline"]),
  resolution: z.string().optional(),
  fps: z.number().min(1).max(60).optional(),
  motionDetected: z.boolean().optional(),
  nightVision: z.boolean().optional(),
  storageUsed: z.number().min(0).optional(),
  batteryLevel: z.number().min(0).max(100).optional(),
  recordingDuration: z.number().min(0).optional(),
});

const EnergyMeterSchema = BaseSensorDataSchema.extend({
  powerUsage: z.number().min(0),
  totalEnergy: z.number().min(0),
  voltage: z.number().min(0).max(300),
  current: z.number().min(0),
  frequency: z.number().min(45).max(65).optional(),
  powerFactor: z.number().min(0).max(1).optional(),
  cost: z.number().min(0).optional(),
  peakDemand: z.number().min(0).optional(),
});

const WaterMeterSchema = BaseSensorDataSchema.extend({
  flowRate: z.number().min(0),
  totalVolume: z.number().min(0),
  pressure: z.number().min(0).optional(),
  temperature: z.number().optional(),
  quality: z
    .object({
      ph: z.number().min(0).max(14).optional(),
      turbidity: z.number().min(0).optional(),
      tds: z.number().min(0).optional(),
    })
    .optional(),
  leakDetected: z.boolean().optional(),
});

const AirQualitySensorSchema = BaseSensorDataSchema.extend({
  pm25: z.number().min(0),
  pm10: z.number().min(0),
  co2: z.number().min(0).max(5000),
  humidity: z.number().min(0).max(100).optional(),
  temperature: z.number().optional(),
  voc: z.number().min(0).optional(),
  aqi: z.number().min(0).max(500).optional(),
  co: z.number().min(0).optional(),
  no2: z.number().min(0).optional(),
  o3: z.number().min(0).optional(),
});

const GenericSensorSchema = BaseSensorDataSchema.extend({
  sensorType: z.string().min(1, "Sensor type is required for generic sensors"),
  primaryMetric: z.object({
    name: z.string().min(1, "Primary metric name is required"),
    value: z.number(),
    unit: z.string().min(1, "Unit is required"),
    min: z.number().optional(),
    max: z.number().optional(),
  }),
  secondaryMetrics: z
    .array(
      z.object({
        name: z.string().min(1),
        value: z.number(),
        unit: z.string(),
        min: z.number().optional(),
        max: z.number().optional(),
      })
    )
    .optional(),
  status: z.enum(["active", "inactive", "error", "calibrating"]).optional(),
  batteryLevel: z.number().min(0).max(100).optional(),
  signalStrength: z.number().min(0).max(100).optional(),
  metadata: z
    .object({
      location: z.string().optional(),
      notes: z.string().optional(),
      calibrationDate: z.string().optional(),
      firmware: z.string().optional(),
    })
    .optional(),
}).strict();

// Device Schemas Mapping
const DEVICE_SCHEMAS = {
  [DeviceType.TEMPERATURE_SENSOR]: TemperatureSensorSchema,
  [DeviceType.HUMIDITY_SENSOR]: HumiditySensorSchema,
  [DeviceType.MOTION_DETECTOR]: MotionDetectorSchema,
  [DeviceType.SMART_LIGHT]: SmartLightSchema,
  [DeviceType.SMART_PLUG]: SmartPlugSchema,
  [DeviceType.CAMERA]: CameraSchema,
  [DeviceType.ENERGY_METER]: EnergyMeterSchema,
  [DeviceType.WATER_METER]: WaterMeterSchema,
  [DeviceType.AIR_QUALITY_SENSOR]: AirQualitySensorSchema,
  [DeviceType.OTHER]: GenericSensorSchema,
};

// Visualization Templates
const DATA_STRUCTURE_TEMPLATES = {
  [DeviceType.TEMPERATURE_SENSOR]: {
    primaryMetric: "temperature",
    secondaryMetrics: ["humidity", "pressure"],
    chartType: "line",
    unit: "°C",
    icon: "thermometer",
    color: "#ff6b6b",
    category: "Environment",
  },
  [DeviceType.HUMIDITY_SENSOR]: {
    primaryMetric: "humidity",
    secondaryMetrics: ["temperature", "dewPoint"],
    chartType: "gauge",
    unit: "%",
    icon: "droplet",
    color: "#4ecdc4",
    category: "Environment",
  },
  [DeviceType.MOTION_DETECTOR]: {
    primaryMetric: "motion",
    secondaryMetrics: ["confidence", "duration"],
    chartType: "timeline",
    unit: "boolean",
    icon: "activity",
    color: "#ffe66d",
    category: "Security",
  },
  [DeviceType.SMART_LIGHT]: {
    primaryMetric: "status",
    secondaryMetrics: ["brightness", "powerConsumption"],
    chartType: "status",
    unit: "on/off",
    icon: "lightbulb",
    color: "#ffd93d",
    category: "Smart Home",
  },
  [DeviceType.SMART_PLUG]: {
    primaryMetric: "powerConsumption",
    secondaryMetrics: ["voltage", "current", "totalEnergyUsed"],
    chartType: "bar",
    unit: "W",
    icon: "plug",
    color: "#6bcf7f",
    category: "Smart Home",
  },
  [DeviceType.CAMERA]: {
    primaryMetric: "status",
    secondaryMetrics: ["motionDetected", "batteryLevel"],
    chartType: "status",
    unit: "status",
    icon: "camera",
    color: "#4d96ff",
    category: "Security",
  },
  [DeviceType.ENERGY_METER]: {
    primaryMetric: "powerUsage",
    secondaryMetrics: ["totalEnergy", "voltage", "current"],
    chartType: "multiline",
    unit: "W",
    icon: "zap",
    color: "#ff9f43",
    category: "Energy",
  },
  [DeviceType.WATER_METER]: {
    primaryMetric: "flowRate",
    secondaryMetrics: ["totalVolume", "pressure"],
    chartType: "area",
    unit: "L/min",
    icon: "droplets",
    color: "#54a0ff",
    category: "Utilities",
  },
  [DeviceType.AIR_QUALITY_SENSOR]: {
    primaryMetric: "aqi",
    secondaryMetrics: ["pm25", "pm10", "co2"],
    chartType: "multibar",
    unit: "AQI",
    icon: "wind",
    color: "#5f27cd",
    category: "Environment",
  },
  [DeviceType.OTHER]: {
    primaryMetric: "primaryMetric.value",
    secondaryMetrics: ["secondaryMetrics"],
    chartType: "dynamic",
    unit: "dynamic",
    icon: "settings",
    color: "#95a5a6",
    category: "Generic",
  },
};

// Generate unique client ID
const generateClientId = () => {
  const timestamp = Date.now().toString(36);
  const processId = process.pid.toString(36);
  const random = Math.random().toString(36).substr(2, 8);
  return `iot-server-${timestamp}-${processId}-${random}`;
};

// MQTT Configuration
const MQTT_CONFIG = {
  brokerUrl: process.env.MQTT_BROKER_URL || "mqtt://localhost:1883",
  options: {
    clientId: generateClientId(),
    username: "Prashant178",
    password: "Prashant178",
    clean: true,
    reconnectPeriod: 5000,
    connectTimeout: 30000,
    keepalive: 60,
    protocolVersion: 4,
    reschedulePings: true,
    resubscribe: true,
    will: {
      topic: "iot/server/status",
      payload: JSON.stringify({
        status: "offline",
        timestamp: new Date().toISOString(),
        reason: "unexpected_disconnect",
      }),
      qos: 1,
      retain: true,
    },
  },
  topics: {
    sensorData: "iot/+/+/data", // iot/{username}/{deviceId}/data
    deviceStatus: "iot/+/+/status", // iot/{username}/{deviceId}/status
    deviceControl: "iot/+/+/control", // iot/{username}/{deviceId}/control
    deviceCommand: "iot/+/+/command", // iot/{username}/{deviceId}/command
  },
};

// Helper Functions
const createErrorLog = (error, context = {}) => ({
  timestamp: new Date().toISOString(),
  error: error.message || error,
  context,
  stack: error.stack,
});

const createSuccessLog = (message, data = {}) => ({
  timestamp: new Date().toISOString(),
  message,
  data,
});

const createErrorResponse = (
  message,
  code = "VALIDATION_ERROR",
  details = null,
  suggestions = null
) => ({
  success: false,
  error: {
    code,
    message,
    details,
    suggestions,
    timestamp: new Date().toISOString(),
  },
});

const createSuccessResponse = (data, message = "Success") => ({
  success: true,
  message,
  data,
  timestamp: new Date().toISOString(),
});

// Validation function
async function validateDeviceData(deviceType, data) {
  const schema = DEVICE_SCHEMAS[deviceType];
  if (!schema) {
    throw new Error(`Unsupported device type: ${deviceType}`);
  }

  try {
    return schema.parse(data);
  } catch (error) {
    const fieldErrors = error.errors?.map((err) => ({
      field: err.path.join("."),
      message: err.message,
      received: err.received,
      expected: err.expected || "Valid value",
    }));

    throw new Error(
      `Validation failed for ${deviceType}: ${
        fieldErrors?.map((e) => `${e.field}: ${e.message}`).join(", ") ||
        error.message
      }`
    );
  }
}

// Data structuring function
function structureDataForVisualization(deviceType, validatedData) {
  const template = DATA_STRUCTURE_TEMPLATES[deviceType];
  if (!template) return validatedData;

  if (deviceType === DeviceType.OTHER) {
    return {
      deviceType,
      template: {
        ...template,
        primaryMetric: validatedData.primaryMetric.name,
        unit: validatedData.primaryMetric.unit,
        chartType: determineChartType(
          validatedData.sensorType,
          validatedData.primaryMetric.name
        ),
        color: determineColorForSensorType(validatedData.sensorType),
        icon: determineIconForSensorType(validatedData.sensorType),
      },
      metrics: {
        primary: {
          name: validatedData.primaryMetric.name,
          value: validatedData.primaryMetric.value,
          unit: validatedData.primaryMetric.unit,
          min: validatedData.primaryMetric.min,
          max: validatedData.primaryMetric.max,
        },
        secondary:
          validatedData.secondaryMetrics?.map((metric) => ({
            name: metric.name,
            value: metric.value,
            unit: metric.unit,
            min: metric.min,
            max: metric.max,
          })) || [],
      },
      sensorType: validatedData.sensorType,
      status: validatedData.status,
      batteryLevel: validatedData.batteryLevel,
      signalStrength: validatedData.signalStrength,
      metadata: validatedData.metadata,
      rawData: validatedData,
      timestamp: validatedData.timestamp || new Date().toISOString(),
    };
  }

  return {
    deviceType,
    template,
    metrics: {
      primary: {
        name: template.primaryMetric,
        value: validatedData[template.primaryMetric],
        unit: template.unit,
      },
      secondary: template.secondaryMetrics
        .map((metric) => ({
          name: metric,
          value: validatedData[metric],
          unit: getMetricUnit(metric, validatedData),
        }))
        .filter((metric) => metric.value !== undefined),
    },
    rawData: validatedData,
    visualization: {
      chartType: template.chartType,
      color: template.color,
      icon: template.icon,
      category: template.category,
    },
    timestamp: validatedData.timestamp || new Date().toISOString(),
  };
}

// Helper functions for generic sensors
function determineChartType(sensorType, metricName) {
  const chartTypeMap = {
    soil: "gauge",
    light: "line",
    sound: "line",
    vibration: "line",
    pressure: "gauge",
    ph: "gauge",
    distance: "line",
    weight: "bar",
    speed: "line",
    acceleration: "multiline",
  };
  return chartTypeMap[sensorType?.toLowerCase()] || "line";
}

function determineColorForSensorType(sensorType) {
  const colorMap = {
    soil: "#8B4513",
    light: "#FFD700",
    sound: "#9370DB",
    vibration: "#FF4500",
    pressure: "#4682B4",
    ph: "#32CD32",
    distance: "#FF69B4",
    weight: "#2E8B57",
    speed: "#DC143C",
    acceleration: "#FF6347",
  };
  return colorMap[sensorType?.toLowerCase()] || "#95a5a6";
}

function determineIconForSensorType(sensorType) {
  const iconMap = {
    soil: "leaf",
    light: "sun",
    sound: "volume-2",
    vibration: "radio",
    pressure: "gauge",
    ph: "beaker",
    distance: "ruler",
    weight: "scale",
    speed: "gauge",
    acceleration: "trending-up",
  };
  return iconMap[sensorType?.toLowerCase()] || "settings";
}

function getMetricUnit(metricName, data) {
  const unitMap = {
    temperature: data.unit || "°C",
    humidity: "%",
    pressure: "bar",
    brightness: "%",
    powerConsumption: "W",
    voltage: "V",
    current: "A",
    flowRate: "L/min",
    totalVolume: "L",
    pm25: "µg/m³",
    pm10: "µg/m³",
    co2: "ppm",
    aqi: "AQI",
    moisture: "%",
    ph: "pH",
    concentration: data.unit || "ppm",
    batteryLevel: "%",
  };
  return unitMap[metricName] || "";
}

// IP and Location functions
function getRealIP(req) {
  let ip =
    req.headers["x-forwarded-for"] ||
    req.headers["x-real-ip"] ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    req.ip ||
    "127.0.0.1";
  if (ip.includes(",")) ip = ip.split(",")[0].trim();
  if (ip.startsWith("::ffff:")) ip = ip.replace("::ffff:", "");
  return ip || "127.0.0.1";
}

function isPrivateIP(ip) {
  if (!ip) return true;
  if (ip === "127.0.0.1" || ip === "::1" || ip === "localhost") return true;
  const privateRanges = [
    /^10\./,
    /^172\.(1[6-9]|2[0-9]|3[01])\./,
    /^192\.168\./,
    /^169\.254\./,
    /^fc00:/,
    /^fe80:/,
  ];
  return privateRanges.some((range) => range.test(ip));
}

const DEFAULT_LOCATION = {
  latitude: 18.5204,
  longitude: 73.8567,
  city: "Pune",
  country: "India",
  location: "Pune, India",
  isPrivateIP: true,
  note: "Default location for localhost/private IP",
};

async function getLocationFromIP(ipAddress) {
  if (
    !ipAddress ||
    ipAddress === "undefined" ||
    ipAddress === "null" ||
    isPrivateIP(ipAddress)
  ) {
    return DEFAULT_LOCATION;
  }

  try {
    const { data } = await axios.get(
      `http://ip-api.com/json/${ipAddress}?fields=status,message,country,city,lat,lon,query`,
      { timeout: 4000 }
    );

    if (data.status === "success") {
      return {
        latitude: data.lat,
        longitude: data.lon,
        city: data.city || "Unknown City",
        country: data.country || "Unknown Country",
        location: `${data.city || "Unknown City"}, ${
          data.country || "Unknown Country"
        }`,
        isPrivateIP: false,
        service: "ip-api.com",
      };
    }

    return {
      ...DEFAULT_LOCATION,
      note: "Fallback location due to API failure",
    };
  } catch {
    return { ...DEFAULT_LOCATION, note: "Fallback location due to error" };
  }
}

// MQTT Controller Class
class MqttController {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.isConnecting = false;
    this.subscriptions = new Map();
    this.messageQueue = [];
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.connectionTimeout = null;
    this.stats = {
      messagesReceived: 0,
      messagesProcessed: 0,
      errors: 0,
      lastConnected: null,
      uptime: Date.now(),
      reconnectCount: 0,
      lastError: null,
      deviceUpdates: 0,
      sensorDataSaved: 0,
      socketEmissions: 0,
    };
  }

  // Initialize MQTT client and connect
  async initialize() {
    if (this.isConnecting) {
      console.log("🔄 MQTT client already connecting...");
      return;
    }

    this.isConnecting = true;

    try {
      console.log(`🚀 Initializing MQTT client...`);
      console.log(`📡 Broker URL: ${MQTT_CONFIG.brokerUrl}`);
      console.log(`🆔 Client ID: ${MQTT_CONFIG.options.clientId}`);

      // Clean up existing client if any
      if (this.client) {
        await this.disconnect();
      }

      this.client = mqtt.connect(MQTT_CONFIG.brokerUrl, MQTT_CONFIG.options);

      // Set connection timeout
      this.connectionTimeout = setTimeout(() => {
        if (!this.isConnected) {
          console.error("❌ MQTT connection timeout");
          this.isConnecting = false;
          this.client?.end(true);
        }
      }, MQTT_CONFIG.options.connectTimeout);

      this.client.on("connect", () => {
        clearTimeout(this.connectionTimeout);
        this.isConnected = true;
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.stats.lastConnected = new Date().toISOString();
        console.log(`✅ MQTT client connected successfully`);

        // Publish online status
        this.publishOnlineStatus();

        // Subscribe to topics
        this.subscribeToTopics();
      });

      this.client.on("error", (error) => {
        clearTimeout(this.connectionTimeout);
        this.stats.errors++;
        this.stats.lastError = error.message;
        this.isConnecting = false;
        console.error(`❌ MQTT connection error:`, createErrorLog(error));

        // Handle specific error types
        if (error.code === "ECONNREFUSED") {
          console.log(`🔌 MQTT broker not available, will retry...`);
        }
      });

      this.client.on("offline", () => {
        this.isConnected = false;
        console.log(`⚠️  MQTT client offline`);
      });

      this.client.on("reconnect", () => {
        this.reconnectAttempts++;
        this.stats.reconnectCount++;
        console.log(
          `🔄 MQTT client reconnecting... (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`
        );

        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          console.error(
            `❌ Max reconnection attempts reached. Stopping reconnection.`
          );
          this.client.end(true);
        }
      });

      this.client.on("close", () => {
        this.isConnected = false;
        this.isConnecting = false;
        console.log(`🔌 MQTT connection closed`);
      });

      this.client.on("disconnect", () => {
        this.isConnected = false;
        console.log(`🔌 MQTT client disconnected`);
      });

      this.client.on("message", (topic, message) => {
        this.handleMessage(topic, message);
      });

      return this.client;
    } catch (error) {
      clearTimeout(this.connectionTimeout);
      this.isConnecting = false;
      this.stats.lastError = error.message;
      console.error(
        `❌ Failed to initialize MQTT client:`,
        createErrorLog(error)
      );
      throw error;
    }
  }

  // Publish online status
  async publishOnlineStatus() {
    try {
      const status = {
        status: "online",
        timestamp: new Date().toISOString(),
        clientId: MQTT_CONFIG.options.clientId,
        pid: process.pid,
        version: process.env.npm_package_version || "1.0.0",
        node_version: process.version,
        uptime: process.uptime(),
      };

      await this.publishMessage("iot/server/status", status, {
        qos: 1,
        retain: true,
      });
    } catch (error) {
      console.error("Failed to publish online status:", error);
    }
  }

  // Subscribe to all required topics
  subscribeToTopics() {
    if (!this.isConnected) {
      console.log(`⚠️  Cannot subscribe: MQTT client not connected`);
      return;
    }

    const topics = Object.values(MQTT_CONFIG.topics);

    topics.forEach((topic) => {
      this.client.subscribe(topic, { qos: 1 }, (error) => {
        if (error) {
          console.error(
            `❌ Failed to subscribe to ${topic}:`,
            createErrorLog(error)
          );
          this.stats.errors++;
        } else {
          console.log(`📥 Subscribed to topic: ${topic}`);
          this.subscriptions.set(topic, {
            subscribedAt: new Date().toISOString(),
            messageCount: 0,
            lastMessage: null,
          });
        }
      });
    });
  }

  // Handle incoming MQTT messages
  async handleMessage(topic, message) {
    this.stats.messagesReceived++;

    try {
      console.log(`📨 Received message on topic: ${topic}`);

      // Update subscription stats
      const matchedPattern = Array.from(this.subscriptions.keys()).find(
        (pattern) => this.matchTopic(pattern, topic)
      );

      if (matchedPattern) {
        const subscriptionData = this.subscriptions.get(matchedPattern);
        if (subscriptionData) {
          subscriptionData.messageCount++;
          subscriptionData.lastMessage = new Date().toISOString();
        }
      }

      // Parse message
      let parsedMessage;
      try {
        parsedMessage = JSON.parse(message.toString());
      } catch (parseError) {
        throw new Error(`Invalid JSON message: ${parseError.message}`);
      }

      // Route message based on topic pattern
      if (this.matchTopic(MQTT_CONFIG.topics.sensorData, topic)) {
        await this.handleSensorData(topic, parsedMessage);
      } else if (this.matchTopic(MQTT_CONFIG.topics.deviceStatus, topic)) {
        await this.handleDeviceStatus(topic, parsedMessage);
      } else if (this.matchTopic(MQTT_CONFIG.topics.deviceControl, topic)) {
        await this.handleDeviceControl(topic, parsedMessage);
      } else if (this.matchTopic(MQTT_CONFIG.topics.deviceCommand, topic)) {
        await this.handleDeviceCommand(topic, parsedMessage);
      } else {
        console.warn(`⚠️  Unhandled topic: ${topic}`);
      }

      this.stats.messagesProcessed++;
    } catch (error) {
      this.stats.errors++;
      this.stats.lastError = error.message;
      console.error(
        `❌ Error processing message:`,
        createErrorLog(error, {
          topic,
          messagePreview: message.toString().substring(0, 200),
        })
      );
    }
  }

  // Handle sensor data messages
  async handleSensorData(topic, message) {
    try {
      // Extract username and deviceId from topic: iot/{username}/{deviceId}/data
      const topicParts = topic.split("/");
      if (topicParts.length !== 4) {
        throw new Error(`Invalid sensor data topic format: ${topic}`);
      }

      const [, username, deviceId] = topicParts;

      // Validate message structure
      const validatedMessage = MqttMessageSchema.parse({
        ...message,
        username,
        deviceId,
      });

      // Find user and device
      const [user, device] = await Promise.all([
        prisma.user.findFirst({ where: { username } }),
        prisma.device.findFirst({ where: { id: deviceId } }),
      ]);

      if (!user) {
        throw new Error(`User not found: ${username}`);
      }

      if (!device || device.userId !== user.id) {
        throw new Error(`Device not found or not owned by user: ${deviceId}`);
      }

      if (!Object.values(DeviceType).includes(device.type)) {
        throw new Error(`Unsupported device type: ${device.type}`);
      }

      // Validate sensor data
      const validatedData = await validateDeviceData(
        device.type,
        validatedMessage.data
      );

      // Structure data for visualization
      const structuredData = structureDataForVisualization(
        device.type,
        validatedData
      );

      // Get location data (if needed for mobile devices)
      let locationData = null;
      if (validatedMessage.ipAddress) {
        locationData = await getLocationFromIP(validatedMessage.ipAddress);
      }

      // Save to database
      const sensorData = await prisma.sensorData.create({
        data: {
          deviceId: device.id,
          data: structuredData,
          timestamp: validatedData.timestamp
            ? new Date(validatedData.timestamp)
            : new Date(),
        },
      });
      this.stats.sensorDataSaved++;

      // Update device status and location
      const updateData = {
        lastSeen: new Date(),
        status: "ONLINE",
      };

      // Update location if provided
      if (locationData) {
        updateData.lastKnownLocation =
          device.currentLocation || device.location;
        updateData.lastKnownLatitude =
          device.currentLatitude || device.latitude;
        updateData.lastKnownLongitude =
          device.currentLongitude || device.longitude;
        updateData.currentLocation = locationData.location;
        updateData.currentLatitude = locationData.latitude;
        updateData.currentLongitude = locationData.longitude;
        updateData.locationUpdatedAt = new Date();
      }

      // Update battery and signal if provided
      if (validatedData.batteryLevel !== undefined) {
        updateData.batteryLevel = validatedData.batteryLevel;
      }
      if (validatedData.signalStrength !== undefined) {
        updateData.signalStrength = validatedData.signalStrength;
      }

      await prisma.device.update({
        where: { id: deviceId },
        data: updateData,
      });
      this.stats.deviceUpdates++;

      // Emit to socket
      try {
        emitNewSensorReading(user.id, device.id, [
          {
            id: sensorData.id,
            deviceId: device.id,
            deviceName: device.name,
            deviceType: device.type,
            timestamp: sensorData.timestamp.toISOString(),
            source: "MQTT",
            topic,
            location: locationData,
            ...structuredData,
          },
        ]);
        this.stats.socketEmissions++;
      } catch (socketError) {
        console.error("Socket emission failed:", createErrorLog(socketError));
      }

      console.log(
        `✅ Processed sensor data:`,
        createSuccessLog("Sensor data processed successfully", {
          username,
          deviceId: device.id,
          deviceName: device.name,
          deviceType: device.type,
          sensorDataId: sensorData.id,
          topic,
        })
      );
    } catch (error) {
      console.error(
        `❌ Failed to handle sensor data:`,
        createErrorLog(error, { topic })
      );
      throw error;
    }
  }

  // Handle device status messages
  async handleDeviceStatus(topic, message) {
    try {
      const topicParts = topic.split("/");
      const [, username, deviceId] = topicParts;

      const [user, device] = await Promise.all([
        prisma.user.findFirst({ where: { username } }),
        prisma.device.findFirst({ where: { id: deviceId } }),
      ]);

      if (!user || !device || device.userId !== user.id) {
        throw new Error(`Invalid user or device: ${username}/${deviceId}`);
      }

      // Update device status
      const updateData = {
        status: message.status || "ONLINE",
        lastSeen: new Date(),
      };

      // Update optional fields if provided
      if (message.batteryLevel !== undefined) {
        updateData.batteryLevel = message.batteryLevel;
      }
      if (message.signalStrength !== undefined) {
        updateData.signalStrength = message.signalStrength;
      }
      if (message.firmware) {
        updateData.firmware = message.firmware;
      }
      if (message.version) {
        updateData.version = message.version;
      }

      await prisma.device.update({
        where: { id: deviceId },
        data: updateData,
      });
      this.stats.deviceUpdates++;

      console.log(
        `✅ Updated device status:`,
        createSuccessLog("Device status updated", {
          username,
          deviceId,
          status: message.status,
        })
      );
    } catch (error) {
      console.error(
        `❌ Failed to handle device status:`,
        createErrorLog(error, { topic })
      );
      throw error;
    }
  }

  // Handle device control messages
  async handleDeviceControl(topic, message) {
    try {
      const topicParts = topic.split("/");
      const [, username, deviceId] = topicParts;

      console.log(
        `🎮 Device control message:`,
        createSuccessLog("Control message received", {
          username,
          deviceId,
          command: message.command,
          parameters: message.parameters,
        })
      );

      // Here you can implement device control logic
      // For example, updating device settings in database
      if (message.command && message.parameters) {
        // Save control command to database for audit
        await prisma.deviceCommand
          .create({
            data: {
              deviceId,
              command: message.command,
              parameters: message.parameters,
              source: "MQTT",
              timestamp: new Date(),
            },
          })
          .catch(() => {
            // Ignore if table doesn't exist
          });
      }
    } catch (error) {
      console.error(
        `❌ Failed to handle device control:`,
        createErrorLog(error, { topic })
      );
      throw error;
    }
  }

  // Handle device command messages
  async handleDeviceCommand(topic, message) {
    try {
      const topicParts = topic.split("/");
      const [, username, deviceId] = topicParts;

      console.log(
        `📝 Device command message:`,
        createSuccessLog("Command message received", {
          username,
          deviceId,
          command: message.command,
          messageId: message.messageId,
        })
      );

      // Process device commands (like firmware updates, config changes, etc.)
      // This could trigger responses back to the device
    } catch (error) {
      console.error(
        `❌ Failed to handle device command:`,
        createErrorLog(error, { topic })
      );
      throw error;
    }
  }

  // Publish message to a topic
  async publishMessage(topic, message, options = { qos: 1, retain: false }) {
    return new Promise((resolve, reject) => {
      if (!this.isConnected) {
        // Queue message if not connected
        this.messageQueue.push({ topic, message, options, resolve, reject });
        console.log(`📤 Queued message for ${topic} (client not connected)`);
        return;
      }

      const messageString =
        typeof message === "string" ? message : JSON.stringify(message);

      this.client.publish(topic, messageString, options, (error) => {
        if (error) {
          console.error(
            `❌ Failed to publish to ${topic}:`,
            createErrorLog(error)
          );
          reject(error);
        } else {
          console.log(`📤 Published to ${topic}`);
          resolve();
        }
      });
    });
  }

  // Process queued messages
  processMessageQueue() {
    if (!this.isConnected || this.messageQueue.length === 0) {
      return;
    }

    console.log(`📤 Processing ${this.messageQueue.length} queued messages`);

    const queue = [...this.messageQueue];
    this.messageQueue = [];

    queue.forEach(({ topic, message, options, resolve, reject }) => {
      this.publishMessage(topic, message, options).then(resolve).catch(reject);
    });
  }

  // Send command to device
  async sendDeviceCommand(username, deviceId, command, parameters = {}) {
    const topic = `iot/${username}/${deviceId}/command`;
    const message = {
      command,
      parameters,
      timestamp: new Date().toISOString(),
      messageId: `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      source: "server",
    };

    await this.publishMessage(topic, message);
  }

  // Send status request to device
  async requestDeviceStatus(username, deviceId) {
    const topic = `iot/${username}/${deviceId}/status/request`;
    const message = {
      request: "status",
      timestamp: new Date().toISOString(),
      messageId: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };

    await this.publishMessage(topic, message);
  }

  // Match topic patterns (supports + wildcard)
  matchTopic(pattern, topic) {
    const patternParts = pattern.split("/");
    const topicParts = topic.split("/");

    if (patternParts.length !== topicParts.length) {
      return false;
    }

    return patternParts.every((part, index) => {
      return part === "+" || part === topicParts[index];
    });
  }

  // Get MQTT statistics
  getStats() {
    return {
      ...this.stats,
      isConnected: this.isConnected,
      isConnecting: this.isConnecting,
      reconnectAttempts: this.reconnectAttempts,
      clientId: MQTT_CONFIG.options.clientId,
      queuedMessages: this.messageQueue.length,
      subscriptions: Array.from(this.subscriptions.entries()).map(
        ([topic, data]) => ({
          topic,
          ...data,
        })
      ),
      uptime: Date.now() - this.stats.uptime,
      brokerUrl: MQTT_CONFIG.brokerUrl,
    };
  }

  // Health check
  isHealthy() {
    return (
      this.isConnected &&
      !this.isConnecting &&
      this.reconnectAttempts < this.maxReconnectAttempts &&
      this.stats.errors < 100 // Arbitrary threshold
    );
  }

  // Graceful shutdown
  async disconnect() {
    return new Promise((resolve) => {
      if (this.connectionTimeout) {
        clearTimeout(this.connectionTimeout);
      }

      if (this.client && this.isConnected) {
        // Publish offline status before disconnecting
        this.publishMessage(
          "iot/server/status",
          {
            status: "offline",
            timestamp: new Date().toISOString(),
            reason: "graceful_shutdown",
          },
          { qos: 1, retain: true }
        ).catch(() => {
          // Ignore errors during shutdown
        });

        setTimeout(() => {
          this.client.end(false, () => {
            console.log(`👋 MQTT client disconnected gracefully`);
            this.client = null;
            this.isConnected = false;
            this.isConnecting = false;
            resolve();
          });
        }, 1000); // Give time for offline status to be sent
      } else {
        this.client = null;
        this.isConnected = false;
        this.isConnecting = false;
        resolve();
      }
    });
  }

  // Force disconnect
  forceDisconnect() {
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
    }

    if (this.client) {
      this.client.end(true);
      this.client = null;
      this.isConnected = false;
      this.isConnecting = false;
      console.log(`🔌 MQTT client force disconnected`);
    }
  }

  // Reset stats
  resetStats() {
    this.stats = {
      messagesReceived: 0,
      messagesProcessed: 0,
      errors: 0,
      lastConnected: this.stats.lastConnected,
      uptime: Date.now(),
      reconnectCount: 0,
      lastError: null,
      deviceUpdates: 0,
      sensorDataSaved: 0,
      socketEmissions: 0,
    };
  }
}

// Create singleton instance
let mqttControllerInstance = null;

// Get singleton instance
export const getMqttController = () => {
  if (!mqttControllerInstance) {
    mqttControllerInstance = new MqttController();
  }
  return mqttControllerInstance;
};

// Export the singleton instance
export const mqttController = getMqttController();

// REST API endpoints for MQTT management
export const mqttApiController = {
  // Get MQTT connection status and statistics
  async getStatus(req, res) {
    try {
      const stats = mqttController.getStats();

      res.json(
        createSuccessResponse(
          {
            ...stats,
            healthy: mqttController.isHealthy(),
            topics: MQTT_CONFIG.topics,
          },
          "MQTT status retrieved successfully"
        )
      );
    } catch (error) {
      res
        .status(500)
        .json(
          createErrorResponse(
            "Failed to get MQTT status",
            "MQTT_STATUS_ERROR",
            { error: error.message }
          )
        );
    }
  },

  // Send command to device via MQTT
  async sendCommand(req, res) {
    try {
      const { username, deviceId } = req.params;
      const { command, parameters } = req.body;

      if (!command) {
        return res
          .status(400)
          .json(createErrorResponse("Command is required", "MISSING_COMMAND"));
      }

      // Verify user and device exist
      const [user, device] = await Promise.all([
        prisma.user.findFirst({ where: { username } }),
        prisma.device.findFirst({ where: { id: deviceId } }),
      ]);

      if (!user) {
        return res
          .status(404)
          .json(createErrorResponse("User not found", "USER_NOT_FOUND"));
      }

      if (!device || device.userId !== user.id) {
        return res
          .status(404)
          .json(
            createErrorResponse(
              "Device not found or not owned by user",
              "DEVICE_NOT_FOUND"
            )
          );
      }

      await mqttController.sendDeviceCommand(
        username,
        deviceId,
        command,
        parameters
      );

      res.json(
        createSuccessResponse(
          {
            username,
            deviceId,
            deviceName: device.name,
            command,
            parameters,
            sentAt: new Date().toISOString(),
          },
          "Command sent successfully"
        )
      );
    } catch (error) {
      res.status(500).json(
        createErrorResponse("Failed to send command", "COMMAND_SEND_ERROR", {
          error: error.message,
        })
      );
    }
  },

  // Request device status
  async requestStatus(req, res) {
    try {
      const { username, deviceId } = req.params;

      // Verify user and device exist
      const [user, device] = await Promise.all([
        prisma.user.findFirst({ where: { username } }),
        prisma.device.findFirst({ where: { id: deviceId } }),
      ]);

      if (!user) {
        return res
          .status(404)
          .json(createErrorResponse("User not found", "USER_NOT_FOUND"));
      }

      if (!device || device.userId !== user.id) {
        return res
          .status(404)
          .json(
            createErrorResponse(
              "Device not found or not owned by user",
              "DEVICE_NOT_FOUND"
            )
          );
      }

      await mqttController.requestDeviceStatus(username, deviceId);

      res.json(
        createSuccessResponse(
          {
            username,
            deviceId,
            deviceName: device.name,
            requestedAt: new Date().toISOString(),
          },
          "Status request sent successfully"
        )
      );
    } catch (error) {
      res
        .status(500)
        .json(
          createErrorResponse(
            "Failed to request device status",
            "STATUS_REQUEST_ERROR",
            { error: error.message }
          )
        );
    }
  },

  // Publish custom message to topic
  async publishMessage(req, res) {
    try {
      const { topic, message, qos = 1, retain = false } = req.body;

      if (!topic || !message) {
        return res
          .status(400)
          .json(
            createErrorResponse(
              "Topic and message are required",
              "MISSING_PARAMETERS"
            )
          );
      }

      await mqttController.publishMessage(topic, message, { qos, retain });

      res.json(
        createSuccessResponse(
          {
            topic,
            message,
            qos,
            retain,
            publishedAt: new Date().toISOString(),
          },
          "Message published successfully"
        )
      );
    } catch (error) {
      res.status(500).json(
        createErrorResponse("Failed to publish message", "PUBLISH_ERROR", {
          error: error.message,
        })
      );
    }
  },

  // Reconnect MQTT client
  async reconnect(req, res) {
    try {
      await mqttController.disconnect();
      await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2 seconds
      await mqttController.initialize();

      res.json(
        createSuccessResponse(
          mqttController.getStats(),
          "MQTT client reconnected successfully"
        )
      );
    } catch (error) {
      res
        .status(500)
        .json(
          createErrorResponse(
            "Failed to reconnect MQTT client",
            "RECONNECT_ERROR",
            { error: error.message }
          )
        );
    }
  },

  // Reset statistics
  async resetStats(req, res) {
    try {
      mqttController.resetStats();

      res.json(
        createSuccessResponse(
          mqttController.getStats(),
          "MQTT statistics reset successfully"
        )
      );
    } catch (error) {
      res
        .status(500)
        .json(
          createErrorResponse(
            "Failed to reset MQTT statistics",
            "RESET_STATS_ERROR",
            { error: error.message }
          )
        );
    }
  },

  // Get supported device types (for MQTT clients)
  async getSupportedDeviceTypes(req, res) {
    try {
      const supportedTypes = Object.values(DeviceType).map((type) => ({
        type,
        schema: DATA_STRUCTURE_TEMPLATES[type],
        mqttTopic: `iot/{username}/{deviceId}/data`,
        exampleMessage: {
          deviceId: "{deviceId}",
          username: "{username}",
          timestamp: new Date().toISOString(),
          data: getSampleDataForDeviceType(type),
        },
      }));

      res.json(
        createSuccessResponse(
          {
            supportedDeviceTypes: supportedTypes,
            totalTypes: supportedTypes.length,
            availableTypes: Object.values(DeviceType),
            mqttTopics: MQTT_CONFIG.topics,
          },
          "Supported device types for MQTT retrieved successfully"
        )
      );
    } catch (error) {
      res
        .status(500)
        .json(
          createErrorResponse(
            "Failed to fetch supported device types",
            "DEVICE_TYPES_FETCH_ERROR",
            { error: error.message }
          )
        );
    }
  },
};

// Sample data generator (reusing from original controller)
const getSampleDataForDeviceType = (() => {
  const cache = {};
  return (deviceType) => {
    if (cache[deviceType]) return cache[deviceType];
    const now = new Date().toISOString();
    const samples = {
      [DeviceType.TEMPERATURE_SENSOR]: {
        temperature: 23.5,
        unit: "celsius",
        humidity: 65.2,
        pressure: 1013.25,
        timestamp: now,
      },
      [DeviceType.HUMIDITY_SENSOR]: {
        humidity: 68.5,
        unit: "percent",
        temperature: 22.1,
        dewPoint: 15.2,
        timestamp: now,
      },
      [DeviceType.MOTION_DETECTOR]: {
        motion: true,
        confidence: 95,
        duration: 5.2,
        sensitivity: 8,
        zone: "entrance",
        timestamp: now,
      },
      [DeviceType.SMART_LIGHT]: {
        status: "on",
        brightness: 75,
        color: { r: 255, g: 200, b: 100 },
        colorTemperature: 3000,
        powerConsumption: 12.5,
        dimLevel: 80,
        timestamp: now,
      },
      [DeviceType.SMART_PLUG]: {
        status: "on",
        powerConsumption: 850.5,
        voltage: 230,
        current: 3.7,
        totalEnergyUsed: 12.45,
        schedule: { enabled: true, onTime: "06:00", offTime: "22:00" },
        timestamp: now,
      },
      [DeviceType.CAMERA]: {
        status: "recording",
        resolution: "1920x1080",
        fps: 30,
        motionDetected: false,
        nightVision: true,
        batteryLevel: 85,
        storageUsed: 45.2,
        recordingDuration: 120,
        timestamp: now,
      },
      [DeviceType.ENERGY_METER]: {
        powerUsage: 1250.75,
        totalEnergy: 456.32,
        voltage: 230,
        current: 5.43,
        frequency: 50,
        powerFactor: 0.95,
        cost: 125.5,
        peakDemand: 1500.25,
        timestamp: now,
      },
      [DeviceType.WATER_METER]: {
        flowRate: 12.5,
        totalVolume: 1523.75,
        pressure: 2.1,
        temperature: 18.5,
        quality: { ph: 7.2, turbidity: 1.1, tds: 180 },
        leakDetected: false,
        timestamp: now,
      },
      [DeviceType.AIR_QUALITY_SENSOR]: {
        pm25: 15.2,
        pm10: 22.8,
        co2: 420,
        humidity: 58.3,
        temperature: 24.1,
        voc: 250,
        aqi: 65,
        co: 2.1,
        no2: 18.5,
        o3: 45.2,
        timestamp: now,
      },
      [DeviceType.OTHER]: {
        sensorType: "soil",
        primaryMetric: {
          name: "moisture",
          value: 45.2,
          unit: "percent",
          min: 0,
          max: 100,
        },
        secondaryMetrics: [
          {
            name: "temperature",
            value: 16.8,
            unit: "celsius",
            min: -10,
            max: 60,
          },
          { name: "ph", value: 6.8, unit: "pH", min: 0, max: 14 },
        ],
        status: "active",
        batteryLevel: 92,
        signalStrength: 85,
        metadata: {
          location: "Garden Bed A",
          notes: "Calibrated on 2025-06-01",
          calibrationDate: "2025-06-01T00:00:00Z",
          firmware: "v1.2.3",
        },
        timestamp: now,
      },
    };
    cache[deviceType] = samples[deviceType] || {};
    return cache[deviceType];
  };
})();

// Initialize MQTT controller when module is loaded (only in production)
if (process.env.NODE_ENV !== "test") {
  // Add a small delay to ensure everything is loaded
  setTimeout(async () => {
    try {
      console.log("🔄 Starting MQTT controller initialization...");
      await mqttController.initialize();

      // Process any queued messages after connection
      setInterval(() => {
        mqttController.processMessageQueue();
      }, 5000);
    } catch (error) {
      console.error(
        `❌ Failed to initialize MQTT controller:`,
        createErrorLog(error)
      );
    }
  }, 2000);

  // Graceful shutdown handling
  process.on("SIGTERM", async () => {
    console.log("🛑 Received SIGTERM, shutting down MQTT client gracefully...");
    await mqttController.disconnect();
    process.exit(0);
  });

  process.on("SIGINT", async () => {
    console.log("🛑 Received SIGINT, shutting down MQTT client gracefully...");
    await mqttController.disconnect();
    process.exit(0);
  });
}

export default mqttController;
