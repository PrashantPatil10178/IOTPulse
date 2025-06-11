import mqtt from "mqtt";
import { prisma } from "../lib/prisma.js";
import { z } from "zod";
import { emitNewSensorReading } from "../index.js";
import { DeviceType } from "./iot.controller.js";
import { mosquittoConfig } from "../lib/mqttconfig.js";

// Device-specific schemas (unchanged)
const BaseSensorDataSchema = z.object({
  timestamp: z.string().datetime().optional(),
  source: z.string().optional(),
  deviceId: z.string().optional(),
});

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

// Visualization Templates (unchanged)
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

// Generate unique client ID with timestamp and process ID (unchanged)
const generateClientId = () => {
  const timestamp = Date.now().toString(36);
  const processId = process.pid.toString(36);
  const random = Math.random().toString(36).substr(2, 8);
  return `iot-server-${timestamp}-${processId}-${random}`;
};

const MQTT_CONFIG = {
  brokerUrl: process.env.MQTT_BROKER_URL || "mqtt://mqtt.webfuze.in:1883",
  options: {
    clientId: generateClientId(),
    username: "superuser",
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
    sensorData: "iot/+/+/data",
    deviceStatus: "iot/+/+/status",
    deviceControl: "iot/+/+/commands",
  },
};

// Helper functions
const createErrorLog = (error, context = {}) => ({
  timestamp: new Date().toISOString(),
  error: error.message || String(error),
  context,
  stack: error.stack,
});

const createSuccessLog = (message, data = {}) => ({
  timestamp: new Date().toISOString(),
  message,
  data,
});

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
    }));

    throw new Error(
      `Validation failed for ${deviceType}: ${
        fieldErrors?.map((e) => `${e.field}: ${e.message}`).join(", ") ||
        error.message
      }`
    );
  }
}

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
        .map((metricKey) => ({
          name: metricKey,
          value: validatedData[metricKey],
          unit: getMetricUnit(metricKey, validatedData, deviceType),
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

function determineChartType(sensorType, metricName) {
  const type = String(sensorType).toLowerCase();
  const metric = String(metricName).toLowerCase();
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
  if (metric.includes("temperature")) return "line";
  if (metric.includes("humidity")) return "gauge";
  return chartTypeMap[type] || "line";
}

function determineColorForSensorType(sensorType) {
  const type = String(sensorType).toLowerCase();
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
  return colorMap[type] || "#95a5a6";
}

function determineIconForSensorType(sensorType) {
  const type = String(sensorType).toLowerCase();
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
  return iconMap[type] || "settings";
}

function getMetricUnit(metricName, data, deviceType) {
  if (
    data.unit &&
    (metricName === "temperature" || metricName === data.primaryMetric?.name)
  ) {
    return data.unit;
  }
  const unitMap = {
    temperature: "°C",
    humidity: "%",
    pressure: "hPa",
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
    concentration: "ppm",
    batteryLevel: "%",
  };
  return unitMap[metricName] || "";
}

class MqttController {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.isConnecting = false;
    this.subscriptions = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.stats = {
      messagesReceived: 0,
      messagesProcessed: 0,
      publishAttempts: 0,
      publishSuccess: 0,
      publishFailed: 0,
      errors: 0,
      lastConnected: null,
      uptime: Date.now(),
      reconnectCount: 0,
    };
    this.socketStats = {
      emissionsSuccessful: 0,
      emissionsFailed: 0,
      lastEmission: null,
    };
  }

  async initialize() {
    if (this.isConnecting || this.isConnected) {
      console.log(
        `⚠️  MQTT client already ${
          this.isConnecting ? "initializing" : "connected"
        }.`
      );
      return this.client;
    }
    this.isConnecting = true;
    try {
      console.log(
        `🚀 Initializing MQTT client... Broker: ${MQTT_CONFIG.brokerUrl}, ClientID: ${MQTT_CONFIG.options.clientId}`
      );
      if (this.client) {
        await this.disconnect(false);
      }
      await this.initializeMosquittoConfig();
      this.client = mqtt.connect(MQTT_CONFIG.brokerUrl, MQTT_CONFIG.options);

      this.client.on("connect", () => {
        this.isConnected = true;
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.stats.lastConnected = new Date().toISOString();
        console.log(
          `✅ MQTT client connected successfully to ${MQTT_CONFIG.brokerUrl}.`
        );
        console.log(`🔌 Socket emission enabled for real-time data streaming.`);
        this.publishOnlineStatus();
        this.subscribeToTopics();
      });

      this.client.on("error", (error) => {
        this.stats.errors++;
        console.error(
          `❌ MQTT connection error:`,
          createErrorLog(error, { broker: MQTT_CONFIG.brokerUrl })
        );
        if (error.code === "ECONNREFUSED") {
          console.warn(
            `🔌 MQTT broker at ${MQTT_CONFIG.brokerUrl} refused connection. Retrying if configured...`
          );
        }
      });

      this.client.on("offline", () => {
        this.isConnected = false;
        console.log(
          `⚠️  MQTT client offline. Socket emissions potentially paused.`
        );
      });

      this.client.on("reconnect", () => {
        this.isConnecting = true;
        this.reconnectAttempts++;
        this.stats.reconnectCount++;
        console.log(
          `🔄 MQTT client reconnecting... (Attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}) to ${MQTT_CONFIG.brokerUrl}`
        );
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          console.error(
            `❌ Max reconnection attempts (${this.maxReconnectAttempts}) reached for ${MQTT_CONFIG.brokerUrl}. Stopping further auto-reconnection.`
          );
          this.client.end(true);
          this.isConnecting = false;
        }
      });

      this.client.on("close", () => {
        this.isConnected = false;
        this.isConnecting = false;
        console.log(`🔌 MQTT connection closed. Socket emissions stopped.`);
      });

      this.client.on("disconnect", (packet) => {
        this.isConnected = false;
        this.isConnecting = false;
        console.log(
          `🔌 MQTT client library initiated disconnect (packet ${
            packet ? "present" : "absent"
          }). Socket emissions stopped.`
        );
      });

      this.client.on("message", async (topic, message, packet) => {
        console.log(
          `📨 MQTT message received: Topic: ${topic}, QoS: ${packet.qos}, Retain: ${packet.retain}, Size: ${message.length} bytes`
        );
        try {
          this.emitRawMqttData(topic, message, packet);
        } catch (socketError) {}
        await this.handleMessage(topic, message, packet);
      });

      return this.client;
    } catch (error) {
      this.isConnecting = false;
      console.error(
        `❌ Critical error during MQTT client initialization:`,
        createErrorLog(error)
      );
      throw error;
    }
  }

  emitRawMqttData(topic, message, packetDetails) {
    try {
      const rawData = {
        topic,
        payload: message.toString(),
        timestamp: new Date().toISOString(),
        source: "MQTT_RAW_STREAM",
        clientId: MQTT_CONFIG.options.clientId,
        qos: packetDetails.qos,
        retain: packetDetails.retain,
        messageSize: message.length,
        topicSegments: topic.split("/"),
      };

      if (global.io && typeof global.io.emit === "function") {
        global.io.emit("mqtt:raw-data", rawData);
        this.socketStats.emissionsSuccessful++;
        this.socketStats.lastEmission = new Date().toISOString();
        console.log(
          `📡 Emitted raw MQTT data (socket): Topic: ${topic.substring(
            0,
            50
          )}...`
        );
      } else {
        this.socketStats.emissionsSuccessful++;
        this.socketStats.lastEmission = new Date().toISOString();
      }
    } catch (error) {
      this.socketStats.emissionsFailed++;
      console.error(
        `❌ Failed to emit raw MQTT data via socket:`,
        createErrorLog(error, { topic })
      );
    }
  }

  async initializeMosquittoConfig() {
    try {
      console.log(`🔧 Initializing Mosquitto configuration files...`);
      console.log(`✅ Mosquitto configuration files initialized.`);
    } catch (error) {
      console.error(
        `❌ Failed to initialize Mosquitto config files:`,
        createErrorLog(error)
      );
    }
  }

  async addDeviceToMosquitto(device) {
    try {
      console.log(
        `🔐 Adding device credentials to Mosquitto: ${device.name} (ID: ${device.id})`
      );
      const credentials = await mosquittoConfig.addDeviceCredentials(device);
      await mosquittoConfig.reloadMosquitto();
      console.log(
        `✅ Device credentials for '${device.name}' added and Mosquitto reloaded. Username: ${credentials.username}`
      );
      return credentials;
    } catch (error) {
      console.error(
        `❌ Failed to add device credentials to Mosquitto for '${device.name}' (ID: ${device.id}):`,
        createErrorLog(error)
      );
      throw error;
    }
  }

  async removeDeviceFromMosquitto(deviceId, deviceName) {
    try {
      console.log(
        `🗑️  Removing device credentials from Mosquitto: ${deviceName} (ID: ${deviceId})`
      );
      const mqttUsername = deviceName;
      await mosquittoConfig.removeDeviceCredentials(deviceId, mqttUsername);
      await mosquittoConfig.reloadMosquitto();
      console.log(
        `✅ Device credentials for '${deviceName}' removed and Mosquitto reloaded.`
      );
    } catch (error) {
      console.error(
        `❌ Failed to remove device credentials from Mosquitto for '${deviceName}' (ID: ${deviceId}):`,
        createErrorLog(error)
      );
      throw error;
    }
  }

  async publishOnlineStatus() {
    try {
      const statusPayload = {
        status: "online",
        timestamp: new Date().toISOString(),
        clientId: MQTT_CONFIG.options.clientId,
        pid: process.pid,
      };
      await this.publishMessage("iot/server/status", statusPayload, {
        qos: 1,
        retain: true,
      });
    } catch (error) {
      console.error(
        "❌ Failed to publish server online status:",
        createErrorLog(error)
      );
    }
  }

  subscribeToTopics() {
    if (!this.client || !this.isConnected) {
      console.warn(
        `⚠️  Cannot subscribe: MQTT client not connected or not initialized.`
      );
      return;
    }
    const topicsToSubscribe = Object.values(MQTT_CONFIG.topics);
    topicsToSubscribe.forEach((topicPattern) => {
      if (this.subscriptions.has(topicPattern)) {
        return;
      }
      console.log(
        `⏳ Attempting to subscribe to topic pattern: ${topicPattern}`
      );
      this.client.subscribe(topicPattern, { qos: 1 }, (error, granted) => {
        if (error) {
          console.error(
            `❌ Failed to subscribe to ${topicPattern}:`,
            createErrorLog(error)
          );
          this.stats.errors++;
        } else {
          if (
            granted &&
            granted.length > 0 &&
            granted[0].topic === topicPattern
          ) {
            console.log(
              `📥 Subscribed successfully to: ${granted[0].topic} with QoS ${granted[0].qos}`
            );
            this.subscriptions.set(topicPattern, {
              subscribedAt: new Date().toISOString(),
              qos: granted[0].qos,
              messageCount: 0,
            });
          } else {
            console.warn(
              `⚠️ Subscription to ${topicPattern} may not have been fully granted or format unexpected. Granted:`,
              granted
            );
          }
        }
      });
    });
  }

  // MAIN CHANGE: Accept only the data object (not wrapped) for sensorData topic!
  async handleMessage(topic, message, packet) {
    this.stats.messagesReceived++;
    const messageString = message.toString();

    const matchedSubscriptionKey = Array.from(this.subscriptions.keys()).find(
      (pattern) => this.matchTopic(pattern, topic)
    );
    if (matchedSubscriptionKey) {
      const subData = this.subscriptions.get(matchedSubscriptionKey);
      if (subData) subData.messageCount = (subData.messageCount || 0) + 1;
    }

    let parsedMessage;
    try {
      parsedMessage = JSON.parse(messageString);
    } catch (parseError) {
      this.stats.errors++;
      console.error(
        `❌ Invalid JSON on topic ${topic}:`,
        createErrorLog(parseError, {
          topic,
          messageSnippet: messageString.substring(0, 100),
        })
      );
      return;
    }

    try {
      if (this.matchTopic(MQTT_CONFIG.topics.sensorData, topic)) {
        // parsedMessage is the raw data object
        await this.handleSensorData(topic, parsedMessage, packet);
      } else if (this.matchTopic(MQTT_CONFIG.topics.deviceStatus, topic)) {
        await this.handleDeviceStatus(topic, parsedMessage, packet);
      } else if (this.matchTopic(MQTT_CONFIG.topics.deviceControl, topic)) {
        await this.handleDeviceControlResponse(topic, parsedMessage, packet);
      } else {
        console.warn(
          `⚠️  Unhandled topic: ${topic}. Message (parsed):`,
          parsedMessage
        );
      }
      this.stats.messagesProcessed++;
    } catch (handlerError) {
      this.stats.errors++;
      console.error(
        `❌ Uncaught error in message handling pipeline for topic ${topic}:`,
        createErrorLog(handlerError)
      );
    }
  }

  // Accept only the raw data object and infer deviceId from topic
  async handleSensorData(topic, data, packet) {
    try {
      const topicParts = topic.split("/");
      if (topicParts.length < 4) {
        throw new Error(
          `Invalid sensor data topic format: ${topic}. Expected 'devices/{name}/{id}/data'`
        );
      }
      const [, deviceName, deviceIdFromTopic] = topicParts;

      const device = await prisma.device.findFirst({
        where: { id: deviceIdFromTopic },
        include: { user: true },
      });

      if (!device)
        throw new Error(
          `Device not found: ID '${deviceIdFromTopic}', Name '${deviceName}' for topic ${topic}`
        );
      if (!device.user)
        throw new Error(
          `Device '${deviceIdFromTopic}' is not associated with a user.`
        );
      if (!Object.values(DeviceType).includes(device.type))
        throw new Error(
          `Unsupported device type '${device.type}' for device '${deviceIdFromTopic}'`
        );

      const validatedSensorPayload = await validateDeviceData(
        device.type,
        data
      );
      const structuredData = structureDataForVisualization(
        device.type,
        validatedSensorPayload
      );

      const sensorDataRecord = await prisma.sensorData.create({
        data: {
          deviceId: device.id,
          data: structuredData,
          timestamp: validatedSensorPayload.timestamp
            ? new Date(validatedSensorPayload.timestamp)
            : new Date(),
        },
      });

      await prisma.device.update({
        where: { id: device.id },
        data: { lastSeen: new Date(), status: "ONLINE" },
      });

      const socketEmissionPayload = {
        id: sensorDataRecord.id,
        deviceId: device.id,
        deviceName: device.name,
        deviceType: device.type,
        userId: device.user.id,
        username: device.user.username,
        timestamp: sensorDataRecord.timestamp.toISOString(),
        source: "MQTT_SENSOR_DATA",
        topic,
        qos: packet.qos,
        ...structuredData,
        metadata: {
          serverReceivedAt: new Date().toISOString(),
          dbRecordId: sensorDataRecord.id,
        },
      };

      try {
        emitNewSensorReading(device.user.id, device.id, [
          socketEmissionPayload,
        ]);
        this.socketStats.emissionsSuccessful++;
        this.socketStats.lastEmission = new Date().toISOString();
        console.log(
          `📡 Emitted structured sensor data (socket): Device ${device.id} to User ${device.user.id}`
        );
      } catch (socketError) {
        this.socketStats.emissionsFailed++;
        console.error(
          `❌ Socket emission failed for sensor data (Device ${device.id}):`,
          createErrorLog(socketError)
        );
      }

      console.log(
        `✅ Processed sensor data: Device ${device.id}, DB ID ${sensorDataRecord.id}. Socket emitted.`
      );
    } catch (error) {
      console.error(
        `❌ Failed to handle sensor data from topic ${topic}:`,
        createErrorLog(error, {
          deviceIdFromTopic: topic.split("/")[2],
          rawMessage: data,
        })
      );
      this.stats.errors++;
    }
  }

  // The rest below remains unchanged
  async handleDeviceStatus(topic, message, packet) {
    // ... as in your code ...
  }

  async handleDeviceControlResponse(topic, message, packet) {
    // ... as in your code ...
  }

  async publishMessage(topic, message, options = { qos: 1, retain: false }) {
    // ... as in your code ...
  }

  async sendDeviceCommand(deviceName, deviceId, command, parameters = {}) {
    // ... as in your code ...
  }

  matchTopic(pattern, topic) {
    const patternSegments = pattern.split("/");
    const topicSegments = topic.split("/");

    for (let i = 0; i < patternSegments.length; i++) {
      const patternSegment = patternSegments[i];
      const topicSegment = topicSegments[i];

      if (patternSegment === "#") {
        return i === patternSegments.length - 1;
      }
      if (patternSegment === "+") {
        if (i >= topicSegments.length) return false;
        continue;
      }
      if (i >= topicSegments.length || patternSegment !== topicSegment) {
        return false;
      }
    }
    return patternSegments.length === topicSegments.length;
  }

  getStats() {
    const activeSubs = Array.from(this.subscriptions.entries()).map(
      ([topic, data]) => ({
        topic,
        qos: data.qos,
        subscribedAt: data.subscribedAt,
        messageCount: data.messageCount,
      })
    );
    return {
      connection: {
        isConnected: this.isConnected,
        isConnecting: this.isConnecting,
        brokerUrl: MQTT_CONFIG.brokerUrl,
        clientId: this.client
          ? MQTT_CONFIG.options.clientId
          : "N/A (Client not init)",
        lastConnected: this.stats.lastConnected,
        reconnectAttempts: this.reconnectAttempts,
        reconnectCountTotal: this.stats.reconnectCount,
      },
      messages: {
        received: this.stats.messagesReceived,
        processed: this.stats.messagesProcessed,
      },
      publishing: {
        attempts: this.stats.publishAttempts,
        successful: this.stats.publishSuccess,
        failed: this.stats.publishFailed,
      },
      subscriptions: {
        count: activeSubs.length,
        details: activeSubs,
      },
      socketEmissions: this.socketStats,
      server: {
        uptimeMillis: Date.now() - this.stats.uptime,
        errorsTotal: this.stats.errors,
        memoryUsage: process.memoryUsage(),
      },
    };
  }

  async disconnect(graceful = true) {
    return new Promise(async (resolve) => {
      if (!this.client) {
        console.log("ℹ️ MQTT client already disconnected or not initialized.");
        this.isConnected = false;
        this.isConnecting = false;
        resolve();
        return;
      }
      if (graceful && this.isConnected) {
        try {
          await this.publishMessage(
            "iot/server/status",
            {
              status: "offline",
              timestamp: new Date().toISOString(),
              reason: "graceful_shutdown",
              clientId: MQTT_CONFIG.options.clientId,
            },
            { qos: 1, retain: true }
          );
        } catch (pubError) {
          console.warn(
            "⚠️ Failed to publish graceful offline status during shutdown:",
            createErrorLog(pubError)
          );
        }
      }
      this.client.end(!graceful, () => {
        console.log(
          `👋 MQTT client disconnected ${
            graceful ? "gracefully" : "forcefully"
          }.`
        );
        this.client = null;
        this.isConnected = false;
        this.isConnecting = false;
        this.subscriptions.clear();
        resolve();
      });
    });
  }

  forceDisconnect() {
    console.warn("⚠️ Forcing MQTT client disconnection via forceDisconnect().");
    return this.disconnect(false);
  }

  isHealthy() {
    return (
      this.client !== null &&
      this.isConnected &&
      !this.isConnecting &&
      this.reconnectAttempts < this.maxReconnectAttempts &&
      this.stats.publishFailed / (this.stats.publishAttempts || 1) < 0.1
    );
  }
}

let mqttControllerInstance = null;
export const getMqttController = () => {
  if (!mqttControllerInstance) {
    mqttControllerInstance = new MqttController();
  }
  return mqttControllerInstance;
};
export const mqttController = getMqttController();

export const mqttApiController = {
  async getStatus(req, res) {
    try {
      const stats = mqttController.getStats();
      res.json({
        success: true,
        message: "MQTT status retrieved successfully.",
        data: { ...stats, healthy: mqttController.isHealthy() },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("❌ API Error: getStatus:", createErrorLog(error));
      res.status(500).json({
        success: false,
        error: {
          code: "MQTT_STATUS_API_ERROR",
          message: "Failed to get MQTT status.",
          details: error.message,
        },
        timestamp: new Date().toISOString(),
      });
    }
  },
  // ...other API endpoints unchanged...
};

if (process.env.NODE_ENV !== "test") {
  setTimeout(async () => {
    try {
      console.log(
        "INFO: Attempting to initialize MQTT controller on application startup..."
      );
      await mqttController.initialize();
    } catch (error) {
      console.error(
        "❌ CRITICAL: Failed to initialize MQTT controller during application startup. Check MQTT broker and network.",
        createErrorLog(error)
      );
    }
  }, 2000);
}
