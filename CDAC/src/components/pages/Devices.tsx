"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  AlertCircle,
  BatteryCharging,
  Calendar,
  Cloud,
  Cpu,
  LineChart,
  MessageSquarePlus,
  Wifi,
  Thermometer,
  Droplets,
  Lightbulb,
  Camera,
  Wind,
  Waves,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import DeviceStatusCard from "@/components/dashboard/DeviceStatusCard";
import MetricCard from "@/components/dashboard/MetricCard";
import DataChart from "@/components/dashboard/DataChart";
import AlertsCard from "@/components/dashboard/AlertCard";
import MapView from "@/components/dashboard/MapView";
import type {
  Device,
  DeviceType,
  SensorData,
  EnergyDataPoint,
  TrafficDataPoint,
  Alert,
  ApiResponse,
} from "@/types";
import { DeviceStatus, AlertSeverity, AlertStatus } from "@/types";
import api from "@/lib/api";

// Hard-coded static sensor data for consistency
const STATIC_SENSOR_DATA: SensorData[] = [
  {
    id: "sensor-0",
    deviceId: "mock-device",
    metric: "temperature",
    value: 24.5,
    unit: "°C",
    timestamp: "2025-05-29T12:19:10Z",
    temperature: 24.5,
    humidity: 55,
  },
  {
    id: "sensor-1",
    deviceId: "mock-device",
    metric: "temperature",
    value: 25.2,
    unit: "°C",
    timestamp: "2025-05-29T13:19:10Z",
    temperature: 25.2,
    humidity: 52,
  },
  {
    id: "sensor-2",
    deviceId: "mock-device",
    metric: "temperature",
    value: 26.8,
    unit: "°C",
    timestamp: "2025-05-29T14:19:10Z",
    temperature: 26.8,
    humidity: 48,
  },
  {
    id: "sensor-3",
    deviceId: "mock-device",
    metric: "temperature",
    value: 28.3,
    unit: "°C",
    timestamp: "2025-05-29T15:19:10Z",
    temperature: 28.3,
    humidity: 45,
  },
  {
    id: "sensor-4",
    deviceId: "mock-device",
    metric: "temperature",
    value: 30.1,
    unit: "°C",
    timestamp: "2025-05-29T16:19:10Z",
    temperature: 30.1,
    humidity: 42,
  },
  {
    id: "sensor-5",
    deviceId: "mock-device",
    metric: "temperature",
    value: 31.5,
    unit: "°C",
    timestamp: "2025-05-29T17:19:10Z",
    temperature: 31.5,
    humidity: 40,
  },
  {
    id: "sensor-6",
    deviceId: "mock-device",
    metric: "temperature",
    value: 29.7,
    unit: "°C",
    timestamp: "2025-05-29T18:19:10Z",
    temperature: 29.7,
    humidity: 43,
  },
  {
    id: "sensor-7",
    deviceId: "mock-device",
    metric: "temperature",
    value: 27.9,
    unit: "°C",
    timestamp: "2025-05-29T19:19:10Z",
    temperature: 27.9,
    humidity: 47,
  },
  {
    id: "sensor-8",
    deviceId: "mock-device",
    metric: "temperature",
    value: 26.1,
    unit: "°C",
    timestamp: "2025-05-29T20:19:10Z",
    temperature: 26.1,
    humidity: 51,
  },
  {
    id: "sensor-9",
    deviceId: "mock-device",
    metric: "temperature",
    value: 24.8,
    unit: "°C",
    timestamp: "2025-05-29T21:19:10Z",
    temperature: 24.8,
    humidity: 54,
  },
  {
    id: "sensor-10",
    deviceId: "mock-device",
    metric: "temperature",
    value: 23.5,
    unit: "°C",
    timestamp: "2025-05-29T22:19:10Z",
    temperature: 23.5,
    humidity: 57,
  },
  {
    id: "sensor-11",
    deviceId: "mock-device",
    metric: "temperature",
    value: 22.3,
    unit: "°C",
    timestamp: "2025-05-29T23:19:10Z",
    temperature: 22.3,
    humidity: 60,
  },
  {
    id: "sensor-12",
    deviceId: "mock-device",
    metric: "temperature",
    value: 21.8,
    unit: "°C",
    timestamp: "2025-05-30T00:19:10Z",
    temperature: 21.8,
    humidity: 63,
  },
  {
    id: "sensor-13",
    deviceId: "mock-device",
    metric: "temperature",
    value: 21.2,
    unit: "°C",
    timestamp: "2025-05-30T01:19:10Z",
    temperature: 21.2,
    humidity: 65,
  },
  {
    id: "sensor-14",
    deviceId: "mock-device",
    metric: "temperature",
    value: 20.7,
    unit: "°C",
    timestamp: "2025-05-30T02:19:10Z",
    temperature: 20.7,
    humidity: 67,
  },
  {
    id: "sensor-15",
    deviceId: "mock-device",
    metric: "temperature",
    value: 20.5,
    unit: "°C",
    timestamp: "2025-05-30T03:19:10Z",
    temperature: 20.5,
    humidity: 68,
  },
  {
    id: "sensor-16",
    deviceId: "mock-device",
    metric: "temperature",
    value: 20.8,
    unit: "°C",
    timestamp: "2025-05-30T04:19:10Z",
    temperature: 20.8,
    humidity: 66,
  },
  {
    id: "sensor-17",
    deviceId: "mock-device",
    metric: "temperature",
    value: 21.5,
    unit: "°C",
    timestamp: "2025-05-30T05:19:10Z",
    temperature: 21.5,
    humidity: 64,
  },
  {
    id: "sensor-18",
    deviceId: "mock-device",
    metric: "temperature",
    value: 22.8,
    unit: "°C",
    timestamp: "2025-05-30T06:19:10Z",
    temperature: 22.8,
    humidity: 61,
  },
  {
    id: "sensor-19",
    deviceId: "mock-device",
    metric: "temperature",
    value: 24.2,
    unit: "°C",
    timestamp: "2025-05-30T07:19:10Z",
    temperature: 24.2,
    humidity: 58,
  },
  {
    id: "sensor-20",
    deviceId: "mock-device",
    metric: "temperature",
    value: 25.8,
    unit: "°C",
    timestamp: "2025-05-30T08:19:10Z",
    temperature: 25.8,
    humidity: 55,
  },
  {
    id: "sensor-21",
    deviceId: "mock-device",
    metric: "temperature",
    value: 27.5,
    unit: "°C",
    timestamp: "2025-05-30T09:19:10Z",
    temperature: 27.5,
    humidity: 52,
  },
  {
    id: "sensor-22",
    deviceId: "mock-device",
    metric: "temperature",
    value: 29.1,
    unit: "°C",
    timestamp: "2025-05-30T10:19:10Z",
    temperature: 29.1,
    humidity: 49,
  },
  {
    id: "sensor-23",
    deviceId: "mock-device",
    metric: "temperature",
    value: 30.3,
    unit: "°C",
    timestamp: "2025-05-30T11:19:10Z",
    temperature: 30.3,
    humidity: 47,
  },
];

// Hard-coded static energy data
const STATIC_ENERGY_DATA: EnergyDataPoint[] = [
  { timestamp: "2025-05-29T12:19:10Z", consumption: 185, solar: 88 },
  { timestamp: "2025-05-29T13:19:10Z", consumption: 200, solar: 95 },
  { timestamp: "2025-05-29T14:19:10Z", consumption: 215, solar: 102 },
  { timestamp: "2025-05-29T15:19:10Z", consumption: 230, solar: 108 },
  { timestamp: "2025-05-29T16:19:10Z", consumption: 245, solar: 112 },
  { timestamp: "2025-05-29T17:19:10Z", consumption: 225, solar: 98 },
  { timestamp: "2025-05-29T18:19:10Z", consumption: 205, solar: 78 },
  { timestamp: "2025-05-29T19:19:10Z", consumption: 190, solar: 48 },
  { timestamp: "2025-05-29T20:19:10Z", consumption: 175, solar: 18 },
  { timestamp: "2025-05-29T21:19:10Z", consumption: 160, solar: 0 },
  { timestamp: "2025-05-29T22:19:10Z", consumption: 145, solar: 0 },
  { timestamp: "2025-05-29T23:19:10Z", consumption: 130, solar: 0 },
  { timestamp: "2025-05-30T00:19:10Z", consumption: 115, solar: 0 },
  { timestamp: "2025-05-30T01:19:10Z", consumption: 100, solar: 0 },
  { timestamp: "2025-05-30T02:19:10Z", consumption: 90, solar: 0 },
  { timestamp: "2025-05-30T03:19:10Z", consumption: 85, solar: 0 },
  { timestamp: "2025-05-30T04:19:10Z", consumption: 80, solar: 0 },
  { timestamp: "2025-05-30T05:19:10Z", consumption: 90, solar: 0 },
  { timestamp: "2025-05-30T06:19:10Z", consumption: 105, solar: 25 },
  { timestamp: "2025-05-30T07:19:10Z", consumption: 135, solar: 48 },
  { timestamp: "2025-05-30T08:19:10Z", consumption: 165, solar: 68 },
  { timestamp: "2025-05-30T09:19:10Z", consumption: 180, solar: 81 },
  { timestamp: "2025-05-30T10:19:10Z", consumption: 190, solar: 91 },
  { timestamp: "2025-05-30T11:19:10Z", consumption: 195, solar: 98 },
];

// Hard-coded static traffic data
const STATIC_TRAFFIC_DATA: TrafficDataPoint[] = [
  { timestamp: "2025-05-29T12:19:10Z", vehicles: 250, pedestrians: 125 },
  { timestamp: "2025-05-29T13:19:10Z", vehicles: 285, pedestrians: 145 },
  { timestamp: "2025-05-29T14:19:10Z", vehicles: 325, pedestrians: 170 },
  { timestamp: "2025-05-29T15:19:10Z", vehicles: 355, pedestrians: 185 },
  { timestamp: "2025-05-29T16:19:10Z", vehicles: 385, pedestrians: 200 },
  { timestamp: "2025-05-29T17:19:10Z", vehicles: 425, pedestrians: 225 },
  { timestamp: "2025-05-29T18:19:10Z", vehicles: 395, pedestrians: 205 },
  { timestamp: "2025-05-29T19:19:10Z", vehicles: 345, pedestrians: 180 },
  { timestamp: "2025-05-29T20:19:10Z", vehicles: 285, pedestrians: 150 },
  { timestamp: "2025-05-29T21:19:10Z", vehicles: 225, pedestrians: 115 },
  { timestamp: "2025-05-29T22:19:10Z", vehicles: 185, pedestrians: 90 },
  { timestamp: "2025-05-29T23:19:10Z", vehicles: 145, pedestrians: 70 },
  { timestamp: "2025-05-30T00:19:10Z", vehicles: 105, pedestrians: 50 },
  { timestamp: "2025-05-30T01:19:10Z", vehicles: 85, pedestrians: 35 },
  { timestamp: "2025-05-30T02:19:10Z", vehicles: 65, pedestrians: 25 },
  { timestamp: "2025-05-30T03:19:10Z", vehicles: 55, pedestrians: 20 },
  { timestamp: "2025-05-30T04:19:10Z", vehicles: 50, pedestrians: 15 },
  { timestamp: "2025-05-30T05:19:10Z", vehicles: 70, pedestrians: 30 },
  { timestamp: "2025-05-30T06:19:10Z", vehicles: 125, pedestrians: 60 },
  { timestamp: "2025-05-30T07:19:10Z", vehicles: 185, pedestrians: 90 },
  { timestamp: "2025-05-30T08:19:10Z", vehicles: 245, pedestrians: 120 },
  { timestamp: "2025-05-30T09:19:10Z", vehicles: 305, pedestrians: 155 },
  { timestamp: "2025-05-30T10:19:10Z", vehicles: 345, pedestrians: 175 },
  { timestamp: "2025-05-30T11:19:10Z", vehicles: 365, pedestrians: 190 },
];

export default function Devices() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [deviceView, setDeviceView] = useState<"grid" | "list">("grid");
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);

  const intervalRef = useRef<number | null>(null);
  const mountedRef = useRef(true);

  const sensorData: SensorData[] = STATIC_SENSOR_DATA;
  const energyData: EnergyDataPoint[] = STATIC_ENERGY_DATA;
  const trafficData: TrafficDataPoint[] = STATIC_TRAFFIC_DATA;

  const deviceAnalytics = useMemo(() => {
    const totalDevices = devices.length;
    const onlineDevices = devices.filter(
      (d) => d.status === DeviceStatus.ONLINE
    ).length;
    const offlineDevices = devices.filter(
      (d) => d.status === DeviceStatus.OFFLINE
    ).length;
    const devicesWithBattery = devices.filter(
      (d) =>
        "batteryLevel" in d &&
        d.batteryLevel !== null &&
        d.batteryLevel !== undefined
    );

    const avgBatteryLevel =
      devicesWithBattery.length > 0
        ? Math.round(
            devicesWithBattery.reduce(
              (sum, d) =>
                sum +
                ("batteryLevel" in d && typeof d.batteryLevel === "number"
                  ? d.batteryLevel
                  : 0),
              0
            ) / devicesWithBattery.length
          )
        : 0;

    return {
      totalDevices,
      onlineDevices,
      offlineDevices,
      avgBatteryLevel,
    };
  }, [devices]);

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

      return response.data?.devices || [];
    } catch (error) {
      console.error("Error fetching devices:", error);
      throw error;
    }
  }, []);

  // Generate static alerts based on devices
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
        updatedAt: "2025-05-29T12:19:10Z",
        timestamp: "2025-05-29T10:15:00Z",
      },
      {
        id: "alert-2",
        deviceId: devices[1]?.id || "unknown",
        userId: "01d842d8-2825-41d7-afe0-eaccd5ce2758",
        title: "Device Offline",
        message: "Traffic camera has been offline for 30 minutes",
        severity: AlertSeverity.MEDIUM,
        status: AlertStatus.ACKNOWLEDGED,
        createdAt: "2025-05-29T11:30:00Z",
        updatedAt: "2025-05-29T12:19:10Z",
        timestamp: "2025-05-29T11:30:00Z",
      },
      {
        id: "alert-3",
        deviceId: devices[2]?.id || "unknown",
        userId: "01d842d8-2825-41d7-afe0-eaccd5ce2758",
        title: "Low Battery Warning",
        message: "Device battery level at 18% - replacement recommended",
        severity: AlertSeverity.LOW,
        status: AlertStatus.ACTIVE,
        createdAt: "2025-05-29T09:45:00Z",
        updatedAt: "2025-05-29T12:19:10Z",
        timestamp: "2025-05-29T09:45:00Z",
      },
    ];

    // Only return alerts for existing devices
    return staticAlerts.filter((alert) =>
      devices.some((device) => device.id === alert.deviceId)
    );
  }, []);

  // Load dashboard data function
  const loadDashboardData = useCallback(async () => {
    if (!mountedRef.current) return;

    try {
      setLoading(true);

      const fetchedDevices = await fetchDevices();

      if (!mountedRef.current) return;

      setDevices(fetchedDevices);

      // Generate static alerts based on fetched devices
      const staticAlerts = generateStaticAlerts(fetchedDevices);
      setAlerts(staticAlerts);

      if (fetchedDevices.length > 0) {
        toast.success(
          `Device data loaded successfully! Found ${fetchedDevices.length} devices.`
        );
      } else {
        toast.info("No devices found. Add some devices to get started.");
      }
    } catch (error) {
      console.error("Error loading dashboard data:", error);
      if (mountedRef.current) {
        toast.error(
          "Failed to load device data. Please check your connection and try again."
        );
        setDevices([]);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [fetchDevices, generateStaticAlerts]);

  // Effect for initial load and cleanup
  useEffect(() => {
    mountedRef.current = true;

    // Initial load
    loadDashboardData();

    // Cleanup function
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

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      className="space-y-6 p-6"
    >
      {/* Header */}
      <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Device Management
          </h1>
          <p className="text-muted-foreground">
            Monitor and manage your IoT devices across the network
          </p>
        </div>
        <div className="flex gap-2 w-full lg:w-auto">
          <Link to="/add-device" className="flex-1 lg:flex-none">
            <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
              <Activity className="w-4 h-4 mr-2" />
              Add Device
            </Button>
          </Link>
          <Link to="/alerts" className="flex-1 lg:flex-none">
            <Button variant="outline" className="w-full">
              <AlertCircle className="w-4 h-4 mr-2" />
              View Alerts (
              {alerts.filter((a) => a.status === AlertStatus.ACTIVE).length})
            </Button>
          </Link>
          <Button
            variant="outline"
            onClick={handleShowDemoToast}
            className="hidden lg:flex"
          >
            <MessageSquarePlus className="w-4 h-4 mr-2" />
            Test Toast
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Devices"
          value={
            loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              deviceAnalytics.totalDevices
            )
          }
          change={3.2}
          icon={Cpu}
          colorClass="text-blue-500"
        />
        <MetricCard
          title="Online Devices"
          value={
            loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              deviceAnalytics.onlineDevices
            )
          }
          change={-1.5}
          icon={Wifi}
          colorClass="text-emerald-500"
          formatter={(value) => `${value}/${deviceAnalytics.totalDevices}`}
        />
        <MetricCard
          title="Active Alerts"
          value={
            loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              alerts.filter((a) => a.status === AlertStatus.ACTIVE).length
            )
          }
          change={5.2}
          icon={AlertCircle}
          colorClass="text-red-500"
        />
        <MetricCard
          title="Battery Health"
          value={
            loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              `${deviceAnalytics.avgBatteryLevel}%`
            )
          }
          icon={BatteryCharging}
          colorClass="text-violet-500"
        />
      </div>

      {/* Map and Alerts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <MapView devices={devices} />
        </div>
        <div>
          <AlertsCard alerts={alerts} />
        </div>
      </div>

      {/* Devices */}
      <div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
          <h2 className="text-xl font-semibold tracking-tight">
            Device Status
          </h2>
          <Tabs
            value={deviceView}
            onValueChange={(value) => setDeviceView(value as "grid" | "list")}
            className="w-full sm:w-auto mt-2 sm:mt-0"
          >
            <TabsList className="grid grid-cols-2 w-full sm:w-auto">
              <TabsTrigger value="grid" className="text-xs">
                Grid View
              </TabsTrigger>
              <TabsTrigger value="list" className="text-xs">
                List View
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((_, i) => (
              <Skeleton key={i} className="h-40" />
            ))}
          </div>
        ) : devices.length === 0 ? (
          <div className="border border-dashed rounded-lg p-8 text-center">
            <Cpu className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-medium text-lg mb-1">No devices found</h3>
            <p className="text-muted-foreground">
              Add new devices to start monitoring your IoT network
            </p>
            <Link to="/add-device">
              <Button className="mt-4">Add Device</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {devices.map((device) => (
              <DeviceStatusCard
                key={device.id}
                device={device}
                onSelect={handleDeviceSelect}
              />
            ))}
          </div>
        )}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DataChart
          title="Environmental Sensors"
          description="Temperature & humidity readings (Last 24 hours)"
          data={sensorData}
          type="line"
          colors={["#06B6D4", "#8B5CF6"]}
        />
        <DataChart
          title="Energy Consumption"
          description="Power usage and solar generation (Last 24 hours)"
          data={energyData}
          type="area"
          colors={["#EF4444", "#10B981"]}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <DataChart
            title="Traffic Patterns"
            description="Vehicles and pedestrians per hour (Last 24 hours)"
            data={trafficData}
            type="bar"
            colors={["#3B82F6", "#F59E0B"]}
          />
        </div>
        <div>
          <div className="h-full">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-slate-900 dark:bg-slate-800 h-full rounded-xl p-6 text-white overflow-hidden relative"
            >
              <div className="absolute -right-10 -top-10 w-24 h-24 bg-blue-500 rounded-full opacity-20" />
              <div className="absolute -left-10 -bottom-10 w-32 h-32 bg-violet-500 rounded-full opacity-20" />

              <h3 className="text-base font-medium text-slate-200 flex items-center mb-4">
                <Calendar className="w-4 h-4 mr-2" />
                Device Management Hub
              </h3>

              <p className="text-2xl font-bold mb-2">IoT Device Network</p>
              <p className="text-slate-300 text-sm mb-6">
                Comprehensive monitoring and management of your connected
                devices across multiple locations.
              </p>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Cloud className="w-4 h-4 text-cyan-400" />
                  <div className="text-sm">Real-time device monitoring</div>
                </div>
                <div className="flex items-center gap-2">
                  <LineChart className="w-4 h-4 text-emerald-400" />
                  <div className="text-sm">Performance analytics</div>
                </div>
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-400" />
                  <div className="text-sm">Proactive alert system</div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-700">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-cyan-400">
                      {deviceAnalytics.totalDevices}
                    </p>
                    <p className="text-xs text-slate-400">Total Devices</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-emerald-400">
                      {deviceAnalytics.onlineDevices}
                    </p>
                    <p className="text-xs text-slate-400">Online Now</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
