export interface Device {
  id: string;
  name: string;
  type: DeviceType;
  status: DeviceStatus;
  location?: string;
  latitude?: number;
  longitude?: number;
  currentLocation?: string;
  currentLatitude?: number;
  currentLongitude?: number;
  lastKnownLocation?: string;
  lastKnownLatitude?: number;
  lastKnownLongitude?: number;
  locationUpdatedAt?: string;
  ipAddress?: string;
  firmware?: string;
  lastSeen?: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
}

export enum DeviceType {
  TEMPERATURE_SENSOR = "TEMPERATURE_SENSOR",
  HUMIDITY_SENSOR = "HUMIDITY_SENSOR",
  MOTION_DETECTOR = "MOTION_DETECTOR",
  SMART_LIGHT = "SMART_LIGHT",
  SMART_PLUG = "SMART_PLUG",
  CAMERA = "CAMERA",
  ENERGY_METER = "ENERGY_METER",
  WATER_METER = "WATER_METER",
  AIR_QUALITY_SENSOR = "AIR_QUALITY_SENSOR",
  OTHER = "OTHER",
}

export enum DeviceStatus {
  ONLINE = "ONLINE",
  OFFLINE = "OFFLINE",
  MAINTENANCE = "MAINTENANCE",
  ERROR = "ERROR",
}

export enum AlertStatus {
  ACTIVE = "ACTIVE",
  ACKNOWLEDGED = "ACKNOWLEDGED",
  RESOLVED = "RESOLVED",
}

export enum AlertSeverity {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  CRITICAL = "CRITICAL",
}

export interface Alert {
  id: string;
  title: string;
  message: string;
  deviceId: string;
  userId: string;
  status: AlertStatus;
  severity: AlertSeverity;
  createdAt: string;
  updatedAt: string;
  timestamp?: string; // For backward compatibility
  acknowledgedAt?: string;
  resolvedAt?: string;
  resolutionNotes?: string;
  device?: {
    id: string;
    name: string;
    type: string;
    location?: string;
  };
}

export interface SensorData {
  id: string;
  deviceId: string;
  metric: string;
  value: number;
  unit?: string;
  timestamp: string;
  temperature?: number;
  humidity?: number;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}
export interface EnergyDataPoint {
  timestamp: string;
  consumption: number;
  solar: number;
}

export interface TrafficDataPoint {
  timestamp: string;
  vehicles: number;
  pedestrians: number;
}
