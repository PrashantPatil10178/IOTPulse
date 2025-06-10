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
  Plus,
  Search,
  Grid3X3,
  List,
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
import { Input } from "@/components/ui/input";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import DeviceStatusCard from "@/components/dashboard/DeviceStatusCard";
import MetricCard from "@/components/dashboard/MetricCard";
import AlertsCard from "@/components/dashboard/AlertCard";
import MapView from "@/components/dashboard/MapView";
import type { Device, Alert } from "@/types";
import { DeviceType, DeviceStatus, AlertStatus } from "@/types";
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

export default function Devices() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [deviceView, setDeviceView] = useState<"grid" | "list">("grid");
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const intervalRef = useRef<number | null>(null);
  const mountedRef = useRef(true);
  console.log(!selectedDevice);

  // Device analytics
  const deviceAnalytics = useMemo(() => {
    const totalDevices = devices.length;
    const onlineDevices = devices.filter(
      (d) => d.status === DeviceStatus.ONLINE
    ).length;
    const offlineDevices = devices.filter(
      (d) => d.status === DeviceStatus.OFFLINE
    ).length;
    const uptimePercentage =
      totalDevices > 0 ? Math.round((onlineDevices / totalDevices) * 100) : 0;

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

    return {
      totalDevices,
      onlineDevices,
      offlineDevices,
      uptimePercentage,
      deviceTypes,
      locations,
    };
  }, [devices]);

  // Filtered devices based on search
  const filteredDevices = useMemo(() => {
    if (!searchQuery.trim()) return devices;

    return devices.filter(
      (device) =>
        device.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        device.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
        device.location?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [devices, searchQuery]);

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
      return [];
    }
  }, []);

  const loadDeviceData = useCallback(async () => {
    if (!mountedRef.current) return;

    try {
      setLoading(true);

      const [fetchedDevices, fetchedAlerts] = await Promise.allSettled([
        fetchDevices(),
        fetchAlerts(),
      ]);

      if (!mountedRef.current) return;

      if (fetchedDevices.status === "fulfilled") {
        setDevices(fetchedDevices.value);
      } else {
        console.error("Failed to fetch devices:", fetchedDevices.reason);
        setDevices([]);
      }

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
          `${fetchedDevices.value.length} devices loaded successfully`
        );
      }
    } catch (error) {
      console.error("Error loading device data:", error);
      if (mountedRef.current) {
        toast.error("Failed to load device data. Please try again.");
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
    loadDeviceData();

    // Auto-refresh every 5 minutes
    intervalRef.current = setInterval(() => {
      if (mountedRef.current) {
        loadDeviceData();
      }
    }, 5 * 60 * 1000);

    return () => {
      mountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [loadDeviceData]);

  const handleDeviceSelect = useCallback((device: Device) => {
    setSelectedDevice(device);
    toast.info(`Selected: ${device.name}`, { duration: 2000 });
  }, []);

  const handleRefresh = useCallback(async () => {
    await loadDeviceData();
  }, [loadDeviceData]);

  const pageVariants = {
    initial: { opacity: 0, y: 20 },
    animate: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.4,
        when: "beforeChildren" as const,
        staggerChildren: 0.1,
      },
    },
  };

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-5 w-80" />
          </div>
          <div className="flex gap-3">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>

        <Skeleton className="h-48 rounded-lg" />

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
              Device Management
            </h1>
          </div>
          <p className="text-muted-foreground text-lg">
            Monitor and manage {deviceAnalytics.totalDevices} IoT devices • Last
            updated: {lastUpdated.toLocaleTimeString()}
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
              <Plus className="w-4 h-4 mr-2" />
              Add Device
            </Button>
          </Link>
        </div>
      </div>

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
      </div>

      {/* Device Types Distribution */}
      {Object.keys(deviceAnalytics.deviceTypes).length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-lg p-6 border shadow-sm"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Device Distribution</h3>
            <div className="text-sm text-muted-foreground">
              {Object.keys(deviceAnalytics.deviceTypes).length} device types
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {Object.entries(deviceAnalytics.deviceTypes).map(
              ([type, count]) => {
                const deviceType = type as DeviceType;
                const Icon = DEVICE_TYPE_ICONS[deviceType];
                const colorClass = DEVICE_TYPE_COLORS[deviceType];

                return (
                  <motion.div
                    key={type}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors border"
                  >
                    <div className={`p-2 rounded-lg bg-background shadow-sm`}>
                      <Icon className={`w-5 h-5 ${colorClass}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-lg">{count}</div>
                      <div className="text-xs text-muted-foreground capitalize truncate">
                        {type.replace(/_/g, " ").toLowerCase()}
                      </div>
                    </div>
                  </motion.div>
                );
              }
            )}
          </div>

          {/* Location Distribution (if available) */}
          {Object.keys(deviceAnalytics.locations).length > 0 && (
            <div className="mt-6 pt-6 border-t">
              <h4 className="text-md font-medium mb-3 text-muted-foreground">
                Location Distribution
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {Object.entries(deviceAnalytics.locations).map(
                  ([location, count]) => (
                    <div
                      key={location}
                      className="flex items-center justify-between p-2 rounded-md bg-muted/30 text-sm"
                    >
                      <span className="truncate font-medium">{location}</span>
                      <span className="text-muted-foreground ml-2">
                        {count}
                      </span>
                    </div>
                  )
                )}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Map and Alerts */}
      <div className="lg:col-span-2 w-full">
        <MapView devices={devices.filter((d) => d.latitude && d.longitude)} />
      </div>

      {/* Device Management Section */}
      <div className="space-y-6">
        {/* Search and Controls */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <div className="space-y-1">
            <h2 className="text-2xl font-semibold tracking-tight">
              Device Inventory
            </h2>
            <p className="text-muted-foreground">
              {filteredDevices.length} of {deviceAnalytics.totalDevices} devices
              {searchQuery && ` matching "${searchQuery}"`}
            </p>
          </div>

          <div className="flex gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search devices..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <Tabs
              value={deviceView}
              onValueChange={(value) => setDeviceView(value as "grid" | "list")}
            >
              <TabsList className="grid grid-cols-2">
                <TabsTrigger value="grid" className="flex items-center gap-2">
                  <Grid3X3 className="w-4 h-4" />
                  <span className="hidden sm:inline">Grid</span>
                </TabsTrigger>
                <TabsTrigger value="list" className="flex items-center gap-2">
                  <List className="w-4 h-4" />
                  <span className="hidden sm:inline">List</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* Device Grid/List */}
        {filteredDevices.length === 0 && searchQuery ? (
          <div className="border-2 border-dashed border-muted rounded-xl p-12 text-center">
            <Search className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold text-xl mb-2">No devices found</h3>
            <p className="text-muted-foreground mb-6">
              No devices match your search criteria "{searchQuery}"
            </p>
            <Button variant="outline" onClick={() => setSearchQuery("")}>
              Clear Search
            </Button>
          </div>
        ) : filteredDevices.length === 0 ? (
          <div className="border-2 border-dashed border-muted rounded-xl p-12 text-center">
            <Cpu className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold text-xl mb-2">No devices found</h3>
            <p className="text-muted-foreground mb-6">
              Get started by adding your first IoT device to the network
            </p>
            <Link to="/add-device">
              <Button
                size="lg"
                className="bg-gradient-to-r from-blue-600 to-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Device
              </Button>
            </Link>
          </div>
        ) : (
          <div
            className={
              deviceView === "grid"
                ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6"
                : "space-y-4"
            }
          >
            {filteredDevices.map((device, index) => (
              <motion.div
                key={device.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <DeviceStatusCard
                  device={device}
                  onSelect={handleDeviceSelect}
                  viewMode={deviceView}
                />
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Status Panel */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 dark:from-slate-800 dark:via-blue-800 dark:to-slate-800 rounded-xl p-6 text-white overflow-hidden relative"
      >
        <div className="absolute -right-10 -top-10 w-32 h-32 bg-blue-500 rounded-full opacity-20 blur-xl" />
        <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-purple-500 rounded-full opacity-20 blur-xl" />

        <div className="relative z-10">
          <h3 className="text-lg font-semibold text-white flex items-center mb-4">
            <Calendar className="w-5 h-5 mr-2" />
            Device Management Hub
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-3xl font-bold mb-1 bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
                {deviceAnalytics.totalDevices}
              </p>
              <p className="text-slate-200 text-sm">Total Devices</p>
            </div>
            <div>
              <p className="text-3xl font-bold mb-1 bg-gradient-to-r from-white to-green-200 bg-clip-text text-transparent">
                {deviceAnalytics.uptimePercentage}%
              </p>
              <p className="text-slate-200 text-sm">Network Uptime</p>
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
              <div className="text-sm font-medium">Performance analytics</div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-amber-400 to-orange-500 flex items-center justify-center">
                <AlertCircle className="w-4 h-4 text-white" />
              </div>
              <div className="text-sm font-medium">Smart notifications</div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
