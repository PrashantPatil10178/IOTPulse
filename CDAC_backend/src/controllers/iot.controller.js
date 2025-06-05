import { prisma } from "../lib/prisma.js";
import axios from "axios";
import { z } from "zod";
import { emitNewSensorReading } from "../index.js";

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

// --- Visualization Templates ---
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

// --- Helper Functions ---
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
async function validateDeviceData(deviceType, data) {
  const schema = DEVICE_SCHEMAS[deviceType];
  if (!schema) throw new Error(`Unsupported device type: ${deviceType}`);
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

// --- Controller ---
export const iotController = {
  async postSensorData(req, res) {
    const { username, deviceId } = req.params;
    const ipAddress = getRealIP(req);

    const [user, device] = await Promise.all([
      prisma.user.findFirst({ where: { username } }),
      prisma.device.findFirst({ where: { id: deviceId } }),
    ]);
    if (!user)
      return res
        .status(404)
        .json(createErrorResponse("User not found.", "USER_NOT_FOUND"));
    if (!device || device.userId !== user.id)
      return res
        .status(404)
        .json(
          createErrorResponse(
            "Device not found or not owned by user.",
            "DEVICE_NOT_FOUND"
          )
        );
    if (!Object.values(DeviceType).includes(device.type)) {
      return res
        .status(400)
        .json(
          createErrorResponse(
            `Device type '${device.type}' is not supported.`,
            "DEVICE_TYPE_INVALID",
            { supportedTypes: Object.values(DeviceType) },
            [
              `Change device type to one of: ${Object.values(DeviceType).join(
                ", "
              )}`,
            ]
          )
        );
    }

    let validatedData;
    try {
      validatedData = await validateDeviceData(device.type, req.body);
    } catch (validationError) {
      return res.status(400).json(
        createErrorResponse(
          `Invalid data for ${device.type} sensor.`,
          "SENSOR_DATA_VALIDATION_ERROR",
          {
            deviceType: device.type,
            expectedSchema: DATA_STRUCTURE_TEMPLATES[device.type],
            receivedData: req.body,
            validationError: validationError.message,
          },
          [
            `Ensure data matches ${device.type} sensor requirements`,
            "Check required fields and data types",
            "Verify numeric ranges are within acceptable limits",
            device.type === DeviceType.OTHER
              ? "For generic sensors, include sensorType and primaryMetric fields"
              : null,
          ].filter(Boolean)
        )
      );
    }

    const locationPromise = getLocationFromIP(ipAddress);
    const structuredData = structureDataForVisualization(
      device.type,
      validatedData
    );

    let sensorData;
    try {
      sensorData = await prisma.sensorData.create({
        data: {
          deviceId: device.id,
          data: structuredData,
          timestamp: validatedData.timestamp
            ? new Date(validatedData.timestamp)
            : new Date(),
        },
      });
    } catch (dbError) {
      return res
        .status(500)
        .json(
          createErrorResponse(
            "Failed to save sensor data to database.",
            "SENSOR_DATA_SAVE_ERROR",
            { error: dbError.message },
            [
              "Check database connection",
              "Verify sensor data table permissions",
            ]
          )
        );
    }

    let locationData = await locationPromise;
    try {
      await prisma.device.update({
        where: { id: deviceId },
        data: {
          lastKnownLocation: device.currentLocation ?? device.location ?? null,
          lastKnownLatitude: device.currentLatitude ?? device.latitude ?? null,
          lastKnownLongitude:
            device.currentLongitude ?? device.longitude ?? null,
          currentLocation: locationData.location,
          currentLatitude: locationData.latitude,
          currentLongitude: locationData.longitude,
          locationUpdatedAt: new Date(),
          ipAddress,
          lastSeen: new Date(),
          status: "ONLINE",
        },
      });
    } catch (dbError) {
      console.error("Device update failed:", dbError);
    }

    try {
      emitNewSensorReading(user.id, device.id, [
        {
          id: sensorData.id,
          deviceId: device.id,
          deviceName: device.name,
          deviceType: device.type,
          timestamp: sensorData.timestamp.toISOString(),
          location: locationData,
          ...structuredData,
        },
      ]);
    } catch (socketError) {
      console.error("Socket emission failed:", socketError);
    }

    return res.status(201).json(
      createSuccessResponse(
        {
          deviceId: device.id,
          deviceName: device.name,
          deviceType: device.type,
          location: locationData,
          validatedData,
          structuredData,
          sensorDataId: sensorData.id,
          dataStructure: DATA_STRUCTURE_TEMPLATES[device.type],
        },
        `${device.type} sensor data processed and structured successfully`
      )
    );
  },

  async getSupportedDeviceTypes(req, res) {
    try {
      const supportedTypes = Object.values(DeviceType).map((type) => ({
        type,
        schema: DATA_STRUCTURE_TEMPLATES[type],
        sampleData: getSampleDataForDeviceType(type),
      }));
      return res.json(
        createSuccessResponse(
          {
            supportedDeviceTypes: supportedTypes,
            totalTypes: supportedTypes.length,
            availableTypes: Object.values(DeviceType),
          },
          "Supported device types retrieved successfully"
        )
      );
    } catch (error) {
      return res
        .status(500)
        .json(
          createErrorResponse(
            "Failed to fetch supported device types.",
            "DEVICE_TYPES_FETCH_ERROR",
            { error: error.message }
          )
        );
    }
  },

  async getLatestSensorData(req, res) {
    const { username, deviceId } = req.params;
    const { limit = 10 } = req.query;
    const [user, device] = await Promise.all([
      prisma.user.findFirst({ where: { username } }),
      prisma.device.findFirst({ where: { id: deviceId } }),
    ]);
    if (!user)
      return res
        .status(404)
        .json(createErrorResponse("User not found.", "USER_NOT_FOUND"));
    if (!device || device.userId !== user.id)
      return res
        .status(404)
        .json(
          createErrorResponse(
            "Device not found or not owned by user.",
            "DEVICE_NOT_FOUND"
          )
        );
    const sensorData = await prisma.sensorData.findMany({
      where: { deviceId: device.id },
      orderBy: { timestamp: "desc" },
      take: parseInt(limit),
    });
    if (!sensorData.length) {
      return res
        .status(404)
        .json(
          createErrorResponse(
            "No sensor data found for device.",
            "NO_SENSOR_DATA",
            null,
            ["Send some sensor data first", "Check if device is active"]
          )
        );
    }
    return res.json(
      createSuccessResponse(
        {
          device: {
            id: device.id,
            name: device.name,
            type: device.type,
            status: device.status,
            currentLocation: device.currentLocation,
            coordinates:
              device.currentLatitude && device.currentLongitude
                ? `${device.currentLatitude}, ${device.currentLongitude}`
                : null,
            lastSeen: device.lastSeen,
          },
          dataStructure: DATA_STRUCTURE_TEMPLATES[device.type],
          sensorData,
          totalEntries: sensorData.length,
          latest: sensorData[0],
          summary: {
            oldestReading: sensorData[sensorData.length - 1]?.timestamp,
            newestReading: sensorData[0]?.timestamp,
            deviceType: device.type,
          },
        },
        `Latest ${device.type} data retrieved successfully`
      )
    );
  },

  async getDeviceLocations(req, res) {
    const { username, deviceId } = req.params;
    const [user, device] = await Promise.all([
      prisma.user.findFirst({ where: { username } }),
      prisma.device.findFirst({
        where: { id: deviceId },
        select: {
          id: true,
          name: true,
          type: true,
          currentLocation: true,
          currentLatitude: true,
          currentLongitude: true,
          lastKnownLocation: true,
          lastKnownLatitude: true,
          lastKnownLongitude: true,
          locationUpdatedAt: true,
          userId: true,
        },
      }),
    ]);
    if (!user)
      return res
        .status(404)
        .json(createErrorResponse("User not found.", "USER_NOT_FOUND"));
    if (!device || device.userId !== user.id)
      return res
        .status(404)
        .json(
          createErrorResponse(
            "Device not found or not owned by user.",
            "DEVICE_NOT_FOUND"
          )
        );
    if (
      !device.currentLocation &&
      !device.currentLatitude &&
      !device.currentLongitude
    ) {
      return res
        .status(404)
        .json(
          createErrorResponse(
            "Device has no location data.",
            "NO_LOCATION_DATA",
            null,
            [
              "Send sensor data to update device location",
              "Check device connectivity",
            ]
          )
        );
    }
    res.json(
      createSuccessResponse(
        {
          deviceId: device.id,
          deviceName: device.name,
          deviceType: device.type,
          currentLocation: {
            address: device.currentLocation,
            coordinates:
              device.currentLatitude && device.currentLongitude
                ? `${device.currentLatitude}, ${device.currentLongitude}`
                : null,
            updatedAt: device.locationUpdatedAt,
          },
          previousLocation: {
            address: device.lastKnownLocation,
            coordinates:
              device.lastKnownLatitude && device.lastKnownLongitude
                ? `${device.lastKnownLatitude}, ${device.lastKnownLongitude}`
                : null,
          },
        },
        "Location information retrieved successfully"
      )
    );
  },

  async getNearbyDevices(req, res) {
    const { username, deviceId } = req.params;
    const { radius = 1.0 } = req.query;
    const [user, targetDevice] = await Promise.all([
      prisma.user.findFirst({ where: { username } }),
      prisma.device.findFirst({
        where: { id: deviceId },
        select: {
          id: true,
          name: true,
          type: true,
          currentLatitude: true,
          currentLongitude: true,
          userId: true,
        },
      }),
    ]);
    if (!user)
      return res
        .status(404)
        .json(createErrorResponse("User not found.", "USER_NOT_FOUND"));
    if (!targetDevice || targetDevice.userId !== user.id)
      return res
        .status(404)
        .json(
          createErrorResponse(
            "Device not found or not owned by user.",
            "DEVICE_NOT_FOUND"
          )
        );
    if (!targetDevice.currentLatitude || !targetDevice.currentLongitude) {
      return res
        .status(404)
        .json(
          createErrorResponse(
            "Device has no location data.",
            "NO_LOCATION_DATA",
            null,
            ["Send sensor data to update device location"]
          )
        );
    }
    const radiusInDegrees = parseFloat(radius) / 111;
    const nearbyDevices = await prisma.device.findMany({
      where: {
        userId: user.id,
        id: { not: deviceId },
        currentLatitude: {
          gte: targetDevice.currentLatitude - radiusInDegrees,
          lte: targetDevice.currentLatitude + radiusInDegrees,
        },
        currentLongitude: {
          gte: targetDevice.currentLongitude - radiusInDegrees,
          lte: targetDevice.currentLongitude + radiusInDegrees,
        },
      },
      select: {
        id: true,
        name: true,
        type: true,
        status: true,
        currentLocation: true,
        currentLatitude: true,
        currentLongitude: true,
        lastSeen: true,
      },
    });
    if (!nearbyDevices.length) {
      return res
        .status(404)
        .json(
          createErrorResponse(
            "No nearby devices found within the specified radius.",
            "NO_NEARBY_DEVICES",
            null,
            ["Increase search radius", "Add more devices to the area"]
          )
        );
    }
    res.json(
      createSuccessResponse(
        {
          targetDevice: {
            id: targetDevice.id,
            name: targetDevice.name,
            type: targetDevice.type,
            coordinates: `${targetDevice.currentLatitude}, ${targetDevice.currentLongitude}`,
          },
          searchRadius: `${radius} km`,
          nearbyDevices: nearbyDevices.map((device) => ({
            id: device.id,
            name: device.name,
            type: device.type,
            status: device.status,
            location: device.currentLocation,
            coordinates: `${device.currentLatitude}, ${device.currentLongitude}`,
            lastSeen: device.lastSeen,
            dataStructure: DATA_STRUCTURE_TEMPLATES[device.type],
          })),
          totalFound: nearbyDevices.length,
        },
        "Nearby devices found successfully"
      )
    );
  },
};
