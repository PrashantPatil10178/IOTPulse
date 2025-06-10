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
  Wifi,
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
import AlertsCard from "@/components/dashboard/AlertCard";
import MapView from "@/components/dashboard/MapView";
import type { Device, Alert } from "@/types";
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

  const fetchAlerts = useCallback(async (): Promise<Alert[]> => {
    try {
      const token = localStorage.getItem("iot-dashboard-token");
      if (!token) {
        throw new Error("No authentication token found");
      }

      const response = await api.get("/alerts", {
        headers: {
          "Content-Type": "application/json",
        },
      });

      return response.data?.alerts || [];
    } catch (error) {
      console.error("Error fetching alerts:", error);
      // Return empty array if alerts endpoint fails
      return [];
    }
  }, []);

  const loadDashboardData = useCallback(async () => {
    if (!mountedRef.current) return;

    try {
      setLoading(true);

      // Fetch devices and alerts in parallel
      const [fetchedDevices, fetchedAlerts] = await Promise.allSettled([
        fetchDevices(),
        fetchAlerts(),
      ]);

      if (!mountedRef.current) return;

      // Handle devices
      if (fetchedDevices.status === "fulfilled") {
        setDevices(fetchedDevices.value);
      } else {
        console.error("Failed to fetch devices:", fetchedDevices.reason);
        setDevices([]);
      }

      // Handle alerts
      if (fetchedAlerts.status === "fulfilled") {
        setAlerts(fetchedAlerts.value);
      } else {
        console.error("Failed to fetch alerts:", fetchedAlerts.reason);
        setAlerts([]);
      }

      setLastUpdated(new Date());

      if (
        fetchedDevices.status === "fulfilled" &&
        fetchedDevices.value.length > 0
      ) {
        toast.success(
          `Dashboard loaded successfully! Found ${fetchedDevices.value.length} devices.`
        );
      } else if (fetchedDevices.status === "fulfilled") {
        toast.info("No devices found. Add some devices to get started.");
      }
    } catch (error) {
      console.error("Error loading dashboard data:", error);
      if (mountedRef.current) {
        toast.error(
          "Failed to load dashboard data. Please check your connection and try again."
        );
        setDevices([]);
        setAlerts([]);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [fetchDevices, fetchAlerts]);

  useEffect(() => {
    mountedRef.current = true;

    loadDashboardData();

    // Refresh every 5 minutes
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((_, i) => (
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
        </div>
      </div>

      {/* Real Data Metrics - Now 3 cards instead of 4 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <MetricCard
          title="Total Devices"
          value={deviceAnalytics.totalDevices}
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

      {/* System Status Panel */}
      <div className="bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 dark:from-slate-800 dark:via-blue-800 dark:to-slate-800 rounded-xl p-6 text-white overflow-hidden relative">
        <div className="absolute -right-10 -top-10 w-32 h-32 bg-blue-500 rounded-full opacity-20 blur-xl" />
        <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-purple-500 rounded-full opacity-20 blur-xl" />

        <div className="relative z-10">
          <h3 className="text-lg font-semibold text-white flex items-center mb-4">
            <Calendar className="w-5 h-5 mr-2" />
            C-DAC IoT Platform 2025
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <p className="text-3xl font-bold mb-1 bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
                {deviceAnalytics.totalDevices}
              </p>
              <p className="text-slate-200 text-sm">Total Devices Managed</p>
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
            <div>
              <p className="text-3xl font-bold mb-1 bg-gradient-to-r from-white to-amber-200 bg-clip-text text-transparent">
                {alerts.filter((a) => a.status === AlertStatus.ACTIVE).length}
              </p>
              <p className="text-slate-200 text-sm">Active Alerts</p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-cyan-400 to-blue-500 flex items-center justify-center">
                <Cloud className="w-4 h-4 text-white" />
              </div>
              <div className="text-sm font-medium">Real-time monitoring</div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-emerald-400 to-green-500 flex items-center justify-center">
                <LineChart className="w-4 h-4 text-white" />
              </div>
              <div className="text-sm font-medium">Live analytics</div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-amber-400 to-orange-500 flex items-center justify-center">
                <AlertCircle className="w-4 h-4 text-white" />
              </div>
              <div className="text-sm font-medium">Smart alerts</div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
