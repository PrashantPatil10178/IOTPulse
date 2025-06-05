"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  AlertCircle,
  Calendar,
  Cloud,
  Cpu,
  LineChart,
  MessageSquarePlus,
  Wifi,
  Battery,
  Zap,
  Thermometer,
  Droplets,
  Lightbulb,
  Camera,
  Wind,
  Waves,
  Settings,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import DeviceStatusCard from "@/components/dashboard/DeviceStatusCard";
import MetricCard from "@/components/dashboard/MetricCard";
import DataChart from "@/components/dashboard/DataChart";
import AlertsCard from "@/components/dashboard/AlertCard";
import MapView from "@/components/dashboard/MapView";
import type {
  Device,
  SensorData,
  Alert,
  EnergyDataPoint,
  TrafficDataPoint,
} from "@/types";
import { DeviceType, DeviceStatus, AlertSeverity, AlertStatus } from "@/types";
import api from "@/lib/api";

const DEVICE_TYPE_ICONS: Record<
  DeviceType,
  React.ComponentType<{ className?: string }>
> = {
  [DeviceType.TEMPERATURE_SENSOR]: Thermometer,
  [DeviceType.HUMIDITY_SENSOR]: Droplets,
  [DeviceType.MOTION_DETECTOR]: Activity,
  [DeviceType.SMART_LIGHT]: Lightbulb,
  [DeviceType.SMART_PLUG]: Zap,
  [DeviceType.CAMERA]: Camera,
  [DeviceType.ENERGY_METER]: Zap,
  [DeviceType.WATER_METER]: Waves,
  [DeviceType.AIR_QUALITY_SENSOR]: Wind,
  [DeviceType.OTHER]: Activity,
};

// Device type colors
const DEVICE_TYPE_COLORS: Record<DeviceType, string> = {
  [DeviceType.TEMPERATURE_SENSOR]: "text-orange-600",
  [DeviceType.HUMIDITY_SENSOR]: "text-blue-600",
  [DeviceType.MOTION_DETECTOR]: "text-purple-600",
  [DeviceType.SMART_LIGHT]: "text-yellow-600",
  [DeviceType.SMART_PLUG]: "text-green-600",
  [DeviceType.CAMERA]: "text-gray-600",
  [DeviceType.ENERGY_METER]: "text-red-600",
  [DeviceType.WATER_METER]: "text-cyan-600",
  [DeviceType.AIR_QUALITY_SENSOR]: "text-emerald-600",
  [DeviceType.OTHER]: "text-slate-600",
};

const STATIC_SENSOR_DATA: SensorData[] = [
  {
    id: "sensor-0",
    deviceId: "mock-device",
    metric: "temperature",
    value: 23.5,
    unit: "°C",
    timestamp: "2025-05-29T12:41:19Z",
    temperature: 23.5,
    humidity: 52,
  },
  {
    id: "sensor-1",
    deviceId: "mock-device",
    metric: "temperature",
    value: 24.2,
    unit: "°C",
    timestamp: "2025-05-29T13:41:19Z",
    temperature: 24.2,
    humidity: 48,
  },
  {
    id: "sensor-2",
    deviceId: "mock-device",
    metric: "temperature",
    value: 25.8,
    unit: "°C",
    timestamp: "2025-05-29T14:41:19Z",
    temperature: 25.8,
    humidity: 45,
  },
  {
    id: "sensor-3",
    deviceId: "mock-device",
    metric: "temperature",
    value: 27.3,
    unit: "°C",
    timestamp: "2025-05-29T15:41:19Z",
    temperature: 27.3,
    humidity: 43,
  },
  {
    id: "sensor-4",
    deviceId: "mock-device",
    metric: "temperature",
    value: 29.1,
    unit: "°C",
    timestamp: "2025-05-29T16:41:19Z",
    temperature: 29.1,
    humidity: 41,
  },
  {
    id: "sensor-5",
    deviceId: "mock-device",
    metric: "temperature",
    value: 30.5,
    unit: "°C",
    timestamp: "2025-05-29T17:41:19Z",
    temperature: 30.5,
    humidity: 39,
  },
  {
    id: "sensor-6",
    deviceId: "mock-device",
    metric: "temperature",
    value: 28.7,
    unit: "°C",
    timestamp: "2025-05-29T18:41:19Z",
    temperature: 28.7,
    humidity: 42,
  },
  {
    id: "sensor-7",
    deviceId: "mock-device",
    metric: "temperature",
    value: 26.9,
    unit: "°C",
    timestamp: "2025-05-29T19:41:19Z",
    temperature: 26.9,
    humidity: 46,
  },
  {
    id: "sensor-8",
    deviceId: "mock-device",
    metric: "temperature",
    value: 25.1,
    unit: "°C",
    timestamp: "2025-05-29T20:41:19Z",
    temperature: 25.1,
    humidity: 50,
  },
  {
    id: "sensor-9",
    deviceId: "mock-device",
    metric: "temperature",
    value: 23.8,
    unit: "°C",
    timestamp: "2025-05-29T21:41:19Z",
    temperature: 23.8,
    humidity: 53,
  },
  {
    id: "sensor-10",
    deviceId: "mock-device",
    metric: "temperature",
    value: 22.5,
    unit: "°C",
    timestamp: "2025-05-29T22:41:19Z",
    temperature: 22.5,
    humidity: 56,
  },
  {
    id: "sensor-11",
    deviceId: "mock-device",
    metric: "temperature",
    value: 21.3,
    unit: "°C",
    timestamp: "2025-05-29T23:41:19Z",
    temperature: 21.3,
    humidity: 59,
  },
  {
    id: "sensor-12",
    deviceId: "mock-device",
    metric: "temperature",
    value: 20.8,
    unit: "°C",
    timestamp: "2025-05-30T00:41:19Z",
    temperature: 20.8,
    humidity: 62,
  },
  {
    id: "sensor-13",
    deviceId: "mock-device",
    metric: "temperature",
    value: 20.2,
    unit: "°C",
    timestamp: "2025-05-30T01:41:19Z",
    temperature: 20.2,
    humidity: 64,
  },
  {
    id: "sensor-14",
    deviceId: "mock-device",
    metric: "temperature",
    value: 19.7,
    unit: "°C",
    timestamp: "2025-05-30T02:41:19Z",
    temperature: 19.7,
    humidity: 66,
  },
  {
    id: "sensor-15",
    deviceId: "mock-device",
    metric: "temperature",
    value: 19.5,
    unit: "°C",
    timestamp: "2025-05-30T03:41:19Z",
    temperature: 19.5,
    humidity: 67,
  },
  {
    id: "sensor-16",
    deviceId: "mock-device",
    metric: "temperature",
    value: 19.8,
    unit: "°C",
    timestamp: "2025-05-30T04:41:19Z",
    temperature: 19.8,
    humidity: 65,
  },
  {
    id: "sensor-17",
    deviceId: "mock-device",
    metric: "temperature",
    value: 20.5,
    unit: "°C",
    timestamp: "2025-05-30T05:41:19Z",
    temperature: 20.5,
    humidity: 63,
  },
  {
    id: "sensor-18",
    deviceId: "mock-device",
    metric: "temperature",
    value: 21.8,
    unit: "°C",
    timestamp: "2025-05-30T06:41:19Z",
    temperature: 21.8,
    humidity: 60,
  },
  {
    id: "sensor-19",
    deviceId: "mock-device",
    metric: "temperature",
    value: 23.2,
    unit: "°C",
    timestamp: "2025-05-30T07:41:19Z",
    temperature: 23.2,
    humidity: 57,
  },
  {
    id: "sensor-20",
    deviceId: "mock-device",
    metric: "temperature",
    value: 24.8,
    unit: "°C",
    timestamp: "2025-05-30T08:41:19Z",
    temperature: 24.8,
    humidity: 54,
  },
  {
    id: "sensor-21",
    deviceId: "mock-device",
    metric: "temperature",
    value: 26.5,
    unit: "°C",
    timestamp: "2025-05-30T09:41:19Z",
    temperature: 26.5,
    humidity: 51,
  },
  {
    id: "sensor-22",
    deviceId: "mock-device",
    metric: "temperature",
    value: 28.1,
    unit: "°C",
    timestamp: "2025-05-30T10:41:19Z",
    temperature: 28.1,
    humidity: 48,
  },
  {
    id: "sensor-23",
    deviceId: "mock-device",
    metric: "temperature",
    value: 29.3,
    unit: "°C",
    timestamp: "2025-05-30T11:41:19Z",
    temperature: 29.3,
    humidity: 46,
  },
];

// Hard-coded static energy data (24 hours) - Updated timestamps
const STATIC_ENERGY_DATA: EnergyDataPoint[] = [
  { timestamp: "2025-05-29T12:41:19Z", consumption: 180, solar: 85 },
  { timestamp: "2025-05-29T13:41:19Z", consumption: 195, solar: 92 },
  { timestamp: "2025-05-29T14:41:19Z", consumption: 210, solar: 98 },
  { timestamp: "2025-05-29T15:41:19Z", consumption: 225, solar: 105 },
  { timestamp: "2025-05-29T16:41:19Z", consumption: 240, solar: 110 },
  { timestamp: "2025-05-29T17:41:19Z", consumption: 220, solar: 95 },
  { timestamp: "2025-05-29T18:41:19Z", consumption: 200, solar: 75 },
  { timestamp: "2025-05-29T19:41:19Z", consumption: 185, solar: 45 },
  { timestamp: "2025-05-29T20:41:19Z", consumption: 170, solar: 15 },
  { timestamp: "2025-05-29T21:41:19Z", consumption: 155, solar: 0 },
  { timestamp: "2025-05-29T22:41:19Z", consumption: 140, solar: 0 },
  { timestamp: "2025-05-29T23:41:19Z", consumption: 125, solar: 0 },
  { timestamp: "2025-05-30T00:41:19Z", consumption: 110, solar: 0 },
  { timestamp: "2025-05-30T01:41:19Z", consumption: 95, solar: 0 },
  { timestamp: "2025-05-30T02:41:19Z", consumption: 85, solar: 0 },
  { timestamp: "2025-05-30T03:41:19Z", consumption: 80, solar: 0 },
  { timestamp: "2025-05-30T04:41:19Z", consumption: 75, solar: 0 },
  { timestamp: "2025-05-30T05:41:19Z", consumption: 85, solar: 0 },
  { timestamp: "2025-05-30T06:41:19Z", consumption: 100, solar: 20 },
  { timestamp: "2025-05-30T07:41:19Z", consumption: 130, solar: 45 },
  { timestamp: "2025-05-30T08:41:19Z", consumption: 160, solar: 65 },
  { timestamp: "2025-05-30T09:41:19Z", consumption: 175, solar: 78 },
  { timestamp: "2025-05-30T10:41:19Z", consumption: 185, solar: 88 },
  { timestamp: "2025-05-30T11:41:19Z", consumption: 190, solar: 95 },
];

// Hard-coded static traffic data (24 hours) - Updated timestamps
const STATIC_TRAFFIC_DATA: TrafficDataPoint[] = [
  { timestamp: "2025-05-29T12:41:19Z", vehicles: 245, pedestrians: 120 },
  { timestamp: "2025-05-29T13:41:19Z", vehicles: 280, pedestrians: 140 },
  { timestamp: "2025-05-29T14:41:19Z", vehicles: 320, pedestrians: 165 },
  { timestamp: "2025-05-29T15:41:19Z", vehicles: 350, pedestrians: 180 },
  { timestamp: "2025-05-29T16:41:19Z", vehicles: 380, pedestrians: 195 },
  { timestamp: "2025-05-29T17:41:19Z", vehicles: 420, pedestrians: 220 },
  { timestamp: "2025-05-29T18:41:19Z", vehicles: 390, pedestrians: 200 },
  { timestamp: "2025-05-29T19:41:19Z", vehicles: 340, pedestrians: 175 },
  { timestamp: "2025-05-29T20:41:19Z", vehicles: 280, pedestrians: 145 },
  { timestamp: "2025-05-29T21:41:19Z", vehicles: 220, pedestrians: 110 },
  { timestamp: "2025-05-29T22:41:19Z", vehicles: 180, pedestrians: 85 },
  { timestamp: "2025-05-29T23:41:19Z", vehicles: 140, pedestrians: 65 },
  { timestamp: "2025-05-30T00:41:19Z", vehicles: 100, pedestrians: 45 },
  { timestamp: "2025-05-30T01:41:19Z", vehicles: 80, pedestrians: 30 },
  { timestamp: "2025-05-30T02:41:19Z", vehicles: 60, pedestrians: 20 },
  { timestamp: "2025-05-30T03:41:19Z", vehicles: 50, pedestrians: 15 },
  { timestamp: "2025-05-30T04:41:19Z", vehicles: 45, pedestrians: 12 },
  { timestamp: "2025-05-30T05:41:19Z", vehicles: 65, pedestrians: 25 },
  { timestamp: "2025-05-30T06:41:19Z", vehicles: 120, pedestrians: 55 },
  { timestamp: "2025-05-30T07:41:19Z", vehicles: 180, pedestrians: 85 },
  { timestamp: "2025-05-30T08:41:19Z", vehicles: 240, pedestrians: 115 },
  { timestamp: "2025-05-30T09:41:19Z", vehicles: 300, pedestrians: 150 },
  { timestamp: "2025-05-30T10:41:19Z", vehicles: 340, pedestrians: 170 },
  { timestamp: "2025-05-30T11:41:19Z", vehicles: 360, pedestrians: 185 },
];

export default function TypeSafeDashboard() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [deviceView, setDeviceView] = useState<"grid" | "list">("grid");
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Use refs to prevent infinite re-renders
  const intervalRef = useRef<number | null>(null);
  const mountedRef = useRef(true);

  // Static hard-coded data - no more dynamic generation
  const sensorData: SensorData[] = STATIC_SENSOR_DATA;
  const energyData: EnergyDataPoint[] = STATIC_ENERGY_DATA;
  const trafficData: TrafficDataPoint[] = STATIC_TRAFFIC_DATA;

  // Device analytics using useMemo with proper dependencies
  const deviceAnalytics = useMemo(() => {
    const totalDevices = devices.length;
    const onlineDevices = devices.filter(
      (d) => d.status === DeviceStatus.ONLINE
    ).length;
    const offlineDevices = devices.filter(
      (d) => d.status === DeviceStatus.OFFLINE
    ).length;
    const devicesWithBattery = devices.filter(
      (d) => (d as any).battery !== null && (d as any).battery !== undefined
    );
    const lowBatteryDevices = devices.filter(
      (d) => (d as any).battery && (d as any).battery < 20
    ).length;

    // Device type distribution
    const deviceTypes = devices.reduce((acc, device) => {
      acc[device.type] = (acc[device.type] || 0) + 1;
      return acc;
    }, {} as Record<DeviceType, number>);

    // Location distribution
    const locations = devices.reduce((acc, device) => {
      if (device.location) {
        acc[device.location] = (acc[device.location] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    // Devices with coordinates (for mapping)
    const devicesWithCoordinates = devices.filter(
      (d) => d.latitude && d.longitude
    );

    // Recent activity (devices updated in last 24 hours)
    const recentlyUpdated = devices.filter((d) => {
      if (!d.lastSeen) return false;
      const lastSeen = new Date(d.lastSeen);
      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      return lastSeen > dayAgo;
    }).length;

    // Average battery level
    const avgBatteryLevel =
      devicesWithBattery.length > 0
        ? Math.round(
            devicesWithBattery.reduce(
              (sum, d) => sum + ((d as any).battery || 0),
              0
            ) / devicesWithBattery.length
          )
        : 0;

    return {
      totalDevices,
      onlineDevices,
      offlineDevices,
      lowBatteryDevices,
      deviceTypes,
      locations,
      devicesWithCoordinates,
      recentlyUpdated,
      avgBatteryLevel,
      uptimePercentage:
        totalDevices > 0 ? Math.round((onlineDevices / totalDevices) * 100) : 0,
    };
  }, [devices]);

  const generateStaticAlerts = useCallback((devices: Device[]): Alert[] => {
    const staticAlerts: Alert[] = [
      {
        id: "alert-1",
        deviceId: devices[0]?.id || "unknown",
        userId: "01d842d8-2825-41d7-afe0-eaccd5ce2758",
        title: "High Temperature Alert",
        message: "Temperature sensor reading 35°C - above normal threshold",
        severity: AlertSeverity.HIGH,
        status: AlertStatus.ACTIVE,
        createdAt: "2025-05-29T10:15:00Z",
        updatedAt: "2025-05-30T07:46:15Z",
        timestamp: "2025-05-29T10:15:00Z",
      },
      {
        id: "alert-2",
        deviceId: devices[1]?.id || "unknown",
        userId: "01d842d8-2825-41d7-afe0-eaccd5ce2758",
        title: "Low Battery Warning",
        message: "Device battery level at 15% - replacement recommended",
        severity: AlertSeverity.MEDIUM,
        status: AlertStatus.ACTIVE,
        createdAt: "2025-05-29T09:30:00Z",
        updatedAt: "2025-05-30T07:46:15Z",
        timestamp: "2025-05-29T09:30:00Z",
      },
      {
        id: "alert-3",
        deviceId: devices[2]?.id || "unknown",
        userId: "01d842d8-2825-41d7-afe0-eaccd5ce2758",
        title: "Device Connectivity Issue",
        message: "Smart light connection unstable - intermittent responses",
        severity: AlertSeverity.LOW,
        status: AlertStatus.ACKNOWLEDGED,
        createdAt: "2025-05-29T08:45:00Z",
        updatedAt: "2025-05-30T07:46:15Z",
        timestamp: "2025-05-29T08:45:00Z",
      },
    ];

    // Only return alerts for existing devices
    return staticAlerts.filter((alert) =>
      devices.some((device) => device.id === alert.deviceId)
    );
  }, []);

  const fetchDevices = useCallback(async (): Promise<Device[]> => {
    try {
      const token = localStorage.getItem("iot-dashboard-token");
      if (!token) {
        throw new Error("No authentication token found");
      }

      const response = await api.get("/devices", {
        headers: {
          "Content-Type": "application/json",
        },
      });
      console.log(response);

      return response.data?.devices || [];
    } catch (error) {
      console.error("Error fetching devices:", error);
      throw error;
    }
  }, []);

  const loadDashboardData = useCallback(async () => {
    if (!mountedRef.current) return;

    try {
      setLoading(true);

      const fetchedDevices: Device[] = await fetchDevices();

      if (!mountedRef.current) return;

      setDevices(fetchedDevices);

      // Generate static alerts based on fetched devices
      const staticAlerts = generateStaticAlerts(fetchedDevices);
      setAlerts(staticAlerts);

      setLastUpdated(new Date());

      if (fetchedDevices.length > 0) {
        toast.success(
          `Dashboard loaded successfully! Found ${fetchedDevices.length} devices.`
        );
      } else {
        toast.info("No devices found. Add some devices to get started.");
      }
    } catch (error) {
      console.error("Error loading dashboard data:", error);
      if (mountedRef.current) {
        toast.error(
          "Failed to load dashboard data. Please check your connection and try again."
        );
        setDevices([]);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [fetchDevices, generateStaticAlerts]);

  useEffect(() => {
    mountedRef.current = true;

    loadDashboardData();

    intervalRef.current = setInterval(() => {
      if (mountedRef.current) {
        loadDashboardData();
      }
    }, 5 * 60 * 1000);

    return () => {
      mountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [loadDashboardData]);

  // Event handlers
  const handleDeviceSelect = useCallback((device: Device) => {
    setSelectedDevice(device);
    toast.info(`Selected device: ${device.name}`, {
      duration: 2000,
    });
  }, []);

  const handleRefresh = useCallback(async () => {
    await loadDashboardData();
  }, [loadDashboardData]);

  const handleShowDemoToast = useCallback(() => {
    const types = ["info", "success", "warning", "error"] as const;
    const messages = [
      "This is an informational message.",
      "Operation completed successfully!",
      "Warning: Disk space is low.",
      "Error: Failed to connect to server.",
    ];
    const randomIndex = Math.floor(Math.random() * types.length);
    const type = types[randomIndex];
    const message = messages[randomIndex];

    switch (type) {
      case "info":
        toast.info(message);
        break;
      case "success":
        toast.success(message);
        break;
      case "warning":
        toast.warning(message);
        break;
      case "error":
        toast.error(message);
        break;
    }
  }, []);

  // Page animation variants
  const pageVariants = {
    initial: { opacity: 0, y: 20 },
    animate: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.4,
        when: "beforeChildren" as const,
        staggerChildren: 0.07,
      },
    },
  };

  // Show loading skeleton
  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
          <div className="space-y-2">
            <Skeleton className="h-8 w-80" />
            <Skeleton className="h-5 w-96" />
          </div>
          <div className="flex gap-3">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-40" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Skeleton className="h-96 rounded-lg" />
          </div>
          <div>
            <Skeleton className="h-96 rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      className="space-y-6 p-6"
    >
      {/* Enhanced Header */}
      <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              C-DAC Urban IoT Dashboard
            </h1>
          </div>
          <p className="text-muted-foreground text-lg">
            Real-time monitoring for {deviceAnalytics.totalDevices} IoT devices
            • Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        </div>
        <div className="flex gap-3 w-full lg:w-auto">
          <Button
            onClick={handleRefresh}
            variant="outline"
            className="flex-1 lg:flex-none"
          >
            <Activity className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Link to="/add-device" className="flex-1 lg:flex-none">
            <Button className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg">
              <Activity className="w-4 h-4 mr-2" />
              Add Device
            </Button>
          </Link>
          <Link to="/alerts" className="flex-1 lg:flex-none">
            <Button
              variant="outline"
              className="w-full border-2 hover:bg-muted/50"
            >
              <AlertCircle className="w-4 h-4 mr-2" />
              View Alerts (
              {alerts.filter((a) => a.status === AlertStatus.ACTIVE).length})
            </Button>
          </Link>
          <Button
            variant="outline"
            onClick={handleShowDemoToast}
            className="hidden lg:flex border-2 hover:bg-muted/50"
          >
            <MessageSquarePlus className="w-4 h-4 mr-2" />
            Test Notifications
          </Button>
        </div>
      </div>

      {/* Real Data Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Devices"
          value={deviceAnalytics.totalDevices}
          change={3.2}
          icon={Cpu}
          colorClass="text-blue-600"
        />
        <MetricCard
          title="Online Status"
          value={deviceAnalytics.onlineDevices}
          change={deviceAnalytics.uptimePercentage > 90 ? 1.5 : -2.1}
          icon={Wifi}
          colorClass="text-emerald-600"
          formatter={(value) =>
            `${value}/${deviceAnalytics.totalDevices} (${deviceAnalytics.uptimePercentage}%)`
          }
        />
        <MetricCard
          title="Active Alerts"
          value={alerts.filter((a) => a.status === AlertStatus.ACTIVE).length}
          change={-2.1}
          icon={AlertCircle}
          colorClass="text-red-600"
        />
        <MetricCard
          title="Avg Battery"
          value={`${deviceAnalytics.avgBatteryLevel}%`}
          change={deviceAnalytics.avgBatteryLevel > 70 ? 0.8 : -1.2}
          icon={Battery}
          colorClass="text-violet-600"
        />
      </div>

      {/* Device Types Overview */}
      {Object.keys(deviceAnalytics.deviceTypes).length > 0 && (
        <div className="bg-card rounded-lg p-6 border">
          <h3 className="text-lg font-semibold mb-4">Device Distribution</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {Object.entries(deviceAnalytics.deviceTypes).map(
              ([type, count]) => {
                const deviceType = type as DeviceType;
                const Icon = DEVICE_TYPE_ICONS[deviceType];
                const colorClass = DEVICE_TYPE_COLORS[deviceType];

                return (
                  <div
                    key={type}
                    className="flex items-center gap-2 p-2 rounded-lg bg-muted/50"
                  >
                    <Icon className={`w-4 h-4 ${colorClass}`} />
                    <div className="text-sm">
                      <div className="font-medium">{count}</div>
                      <div className="text-xs text-muted-foreground">
                        {type.replace(/_/g, " ").toLowerCase()}
                      </div>
                    </div>
                  </div>
                );
              }
            )}
          </div>
        </div>
      )}

      {/* Map and Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <MapView devices={deviceAnalytics.devicesWithCoordinates} />
        </div>
        <div>
          <AlertsCard alerts={alerts} />
        </div>
      </div>

      {/* Device Status Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">
              Device Status
            </h2>
            <p className="text-muted-foreground">
              {deviceAnalytics.recentlyUpdated} devices active in last 24 hours
            </p>
          </div>
          <Tabs
            value={deviceView}
            onValueChange={(value) => setDeviceView(value as "grid" | "list")}
            className="w-full sm:w-auto mt-4 sm:mt-0"
          >
            <TabsList className="grid grid-cols-2 w-full sm:w-auto">
              <TabsTrigger value="grid">Grid View</TabsTrigger>
              <TabsTrigger value="list">List View</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {devices.length === 0 ? (
          <div className="border-2 border-dashed border-muted rounded-xl p-12 text-center">
            <Cpu className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold text-xl mb-2">No devices found</h3>
            <p className="text-muted-foreground mb-6">
              Welcome to your IoT dashboard! Add your first device to start
              monitoring your smart infrastructure.
            </p>
            <Link to="/add-device">
              <Button
                size="lg"
                className="bg-gradient-to-r from-blue-600 to-blue-700"
              >
                <Activity className="w-4 h-4 mr-2" />
                Add Your First Device
              </Button>
            </Link>
          </div>
        ) : (
          <>
            {/* Grid View */}
            {deviceView === "grid" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {devices.map((device) => (
                  <DeviceStatusCard
                    key={device.id}
                    device={device}
                    onSelect={handleDeviceSelect}
                  />
                ))}
              </div>
            )}

            {/* List View */}
            {deviceView === "list" && (
              <div className="space-y-3">
                {devices.map((device) => {
                  const Icon = DEVICE_TYPE_ICONS[device.type];
                  const colorClass = DEVICE_TYPE_COLORS[device.type];

                  return (
                    <motion.div
                      key={device.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3 }}
                      className="bg-card border rounded-lg p-4 hover:shadow-md transition-all duration-200 cursor-pointer hover:border-primary/20"
                      onClick={() => handleDeviceSelect(device)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          <div className={`p-2 rounded-lg bg-muted/50`}>
                            <Icon className={`w-5 h-5 ${colorClass}`} />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-lg truncate">
                                {device.name}
                              </h3>
                              <div
                                className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                                  device.status === DeviceStatus.ONLINE
                                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                    : device.status === DeviceStatus.OFFLINE
                                    ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                    : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                                }`}
                              >
                                <div
                                  className={`w-2 h-2 rounded-full ${
                                    device.status === DeviceStatus.ONLINE
                                      ? "bg-emerald-500"
                                      : device.status === DeviceStatus.OFFLINE
                                      ? "bg-red-500"
                                      : "bg-yellow-500"
                                  }`}
                                />
                                {device.status}
                              </div>
                            </div>

                            <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                              <span className="flex items-center gap-1">
                                <Activity className="w-3 h-3" />
                                {device.type.replace(/_/g, " ").toLowerCase()}
                              </span>
                              {device.location && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {device.location}
                                </span>
                              )}
                              {device.lastSeen && (
                                <span className="flex items-center gap-1">
                                  <Wifi className="w-3 h-3" />
                                  {new Date(device.lastSeen).toLocaleString()}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 ml-4">
                          {/* Battery Level (if available) */}
                          {(device as any).battery !== undefined &&
                            (device as any).battery !== null && (
                              <div className="flex items-center gap-2 text-sm">
                                <Battery
                                  className={`w-4 h-4 ${
                                    (device as any).battery > 50
                                      ? "text-emerald-600"
                                      : (device as any).battery > 20
                                      ? "text-yellow-600"
                                      : "text-red-600"
                                  }`}
                                />
                                <span className="font-medium">
                                  {(device as any).battery}%
                                </span>
                              </div>
                            )}

                          {/* Signal Strength (if available) */}
                          {(device as any).signalStrength !== undefined && (
                            <div className="flex items-center gap-2 text-sm">
                              <Wifi
                                className={`w-4 h-4 ${
                                  (device as any).signalStrength > 70
                                    ? "text-emerald-600"
                                    : (device as any).signalStrength > 40
                                    ? "text-yellow-600"
                                    : "text-red-600"
                                }`}
                              />
                              <span className="font-medium">
                                {(device as any).signalStrength}%
                              </span>
                            </div>
                          )}

                          {/* Actions */}
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 hover:bg-primary/10"
                              onClick={(e) => {
                                e.stopPropagation();
                                toast.info(
                                  `Viewing details for ${device.name}`
                                );
                              }}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 hover:bg-primary/10"
                              onClick={(e) => {
                                e.stopPropagation();
                                toast.info(
                                  `Managing settings for ${device.name}`
                                );
                              }}
                            >
                              <Settings className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Static Charts with Hard-coded Data */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DataChart
          title="Environmental Monitoring"
          description="Temperature & humidity readings from Pune sensors (Last 24 hours)"
          data={sensorData}
          type="line"
          colors={["#06B6D4", "#8B5CF6"]}
        />
        <DataChart
          title="Energy Management"
          description="Power consumption vs solar generation (Last 24 hours)"
          data={energyData}
          type="area"
          colors={["#EF4444", "#10B981"]}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <DataChart
            title="Smart Traffic Analytics"
            description="Vehicle and pedestrian flow patterns (Last 24 hours)"
            data={trafficData}
            type="bar"
            colors={["#3B82F6", "#F59E0B"]}
          />
        </div>
        <div>
          {/* Enhanced Info Panel */}
          <div className="bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 dark:from-slate-800 dark:via-blue-800 dark:to-slate-800 h-full rounded-xl p-6 text-white overflow-hidden relative">
            <div className="absolute -right-10 -top-10 w-32 h-32 bg-blue-500 rounded-full opacity-20 blur-xl" />
            <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-purple-500 rounded-full opacity-20 blur-xl" />

            <div className="relative z-10">
              <h3 className="text-lg font-semibold text-white flex items-center mb-4">
                <Calendar className="w-5 h-5 mr-2" />
                C-DAC IoT Platform 2025
              </h3>

              <p className="text-2xl font-bold mb-3 bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
                Dashboard Overview
              </p>

              <div className="space-y-4">
                <div>
                  <p className="text-3xl font-bold mb-1 bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
                    {deviceAnalytics.totalDevices}
                  </p>
                  <p className="text-slate-200 text-sm">
                    Total Devices Managed
                  </p>
                </div>
                <div>
                  <p className="text-3xl font-bold mb-1 bg-gradient-to-r from-white to-green-200 bg-clip-text text-transparent">
                    {Object.keys(deviceAnalytics.locations).length}
                  </p>
                  <p className="text-slate-200 text-sm">Locations Monitored</p>
                </div>
                <div>
                  <p className="text-3xl font-bold mb-1 bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
                    {deviceAnalytics.uptimePercentage}%
                  </p>
                  <p className="text-slate-200 text-sm">System Uptime</p>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-cyan-400 to-blue-500 flex items-center justify-center">
                    <Cloud className="w-4 h-4 text-white" />
                  </div>
                  <div className="text-sm font-medium">
                    Real-time data processing
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-emerald-400 to-green-500 flex items-center justify-center">
                    <LineChart className="w-4 h-4 text-white" />
                  </div>
                  <div className="text-sm font-medium">
                    Static demo analytics
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-amber-400 to-orange-500 flex items-center justify-center">
                    <AlertCircle className="w-4 h-4 text-white" />
                  </div>
                  <div className="text-sm font-medium">
                    Smart alerting system
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
