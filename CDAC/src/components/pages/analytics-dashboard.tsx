"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Database,
  TrendingUp,
  BarChart3,
  Download,
  RefreshCw,
  Zap,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useSocket, useDeviceStats } from "@/context/SocketContext";

// Import our new components with updated paths
import DeviceTypeSelector from "@/components/Analytics/device-type-selector";
import MetricsOverview from "@/components/Analytics/metrics-overview";
import VisualizationGrid from "@/components/Analytics/visualization-grid";
import RealTimeMonitor from "@/components/Analytics/real-time-monitor";
import HistoricalAnalytics from "@/components/Analytics/historical-analytics";
import { useAnalyticsData } from "@/hooks/use-analytics-data";
import { useVisualizationConfig } from "@/hooks/use-visualization-config";
import { useDeviceData } from "@/hooks/use-device-data";
import AdvancedVisualizations from "../Analytics/D3";

// Device types from backend
export const DEVICE_TYPES = {
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

// Animation variants
const pageVariants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: {
      when: "beforeChildren",
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export default function AnalyticsDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedDeviceTypes, setSelectedDeviceTypes] = useState<string[]>([
    "all",
  ]);
  const [timeRange, setTimeRange] = useState("24h");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { user } = useAuth();
  const { isConnected, subscribeToAllDevices, getReceivingDataDevices } =
    useSocket();
  const { deviceData } = useDeviceData(user?.username);
  const { stats, deviceErrors } = useDeviceStats();

  // Custom hooks for data management
  const { devices, loadingDevices, fetchDevices, handleExportData } =
    useAnalyticsData();
  const { visualizationConfigs } = useVisualizationConfig();

  const currentUser = user?.username;
  const currentDateTime = new Date().toLocaleString();

  // Subscribe to all devices when they're loaded
  useEffect(() => {
    if (devices.length > 0 && isConnected) {
      const deviceIds = devices.map((d) => d.id);
      subscribeToAllDevices(deviceIds);
    }
  }, [devices, isConnected, subscribeToAllDevices]);

  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchDevices();
    } finally {
      setIsRefreshing(false);
    }
  };

  // Filter devices by selected types
  const filteredDevices = devices.filter(
    (device) =>
      selectedDeviceTypes.includes("all") ||
      selectedDeviceTypes.includes(device.type)
  );

  // Get device statistics using Socket Context
  const deviceStats = {
    totalDevices: devices.length,
    activeDevices: stats.activeDevices,
    devicesByType: devices.reduce((acc, device) => {
      acc[device.type] = (acc[device.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    receivingDataDevices: getReceivingDataDevices(),
    errorDevices: deviceErrors.length,
  };

  if (loadingDevices) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <RefreshCw className="w-8 h-8 animate-spin text-primary mx-auto" />
          <div>
            <h3 className="text-lg font-medium">Loading Analytics</h3>
            <p className="text-muted-foreground">
              Fetching device data and establishing real-time connections...
            </p>
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
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            IoT Analytics Hub
          </h1>
          <p className="text-muted-foreground mt-2">
            Real-time visualization and monitoring for{" "}
            {Object.keys(DEVICE_TYPES).length} device types • User:{" "}
            {currentUser}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {currentDateTime} • {deviceStats.activeDevices} active •{" "}
            {deviceStats.receivingDataDevices.length} live data streams
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Badge variant="outline" className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                isConnected ? "bg-green-500 animate-pulse" : "bg-red-500"
              }`}
            />
            Socket: {isConnected ? "Connected" : "Disconnected"}
          </Badge>
          <Badge variant="outline" className="flex items-center gap-2">
            <Database className="w-3 h-3" />
            API: Connected
          </Badge>
          {deviceErrors.length > 0 && (
            <Badge variant="destructive" className="flex items-center gap-2">
              {deviceErrors.length} Errors
            </Badge>
          )}
          <Button variant="outline" size="sm" onClick={handleExportData}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw
              className={`w-4 h-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>
      </div>

      {/* Device Type Selector */}
      <motion.div variants={itemVariants}>
        <DeviceTypeSelector
          selectedTypes={selectedDeviceTypes}
          onTypesChange={setSelectedDeviceTypes}
          deviceStats={deviceStats.devicesByType}
          visualizationConfigs={visualizationConfigs}
        />
      </motion.div>

      {/* Metrics Overview */}
      <motion.div variants={itemVariants}>
        <MetricsOverview devices={filteredDevices} deviceStats={deviceStats} />
      </motion.div>

      {/* Main Tabs */}
      <motion.div variants={itemVariants}>
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Live Overview
            </TabsTrigger>
            <TabsTrigger
              value="visualizations"
              className="flex items-center gap-2"
            >
              <BarChart3 className="w-4 h-4" />
              Visualizations
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Historical Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <RealTimeMonitor
              devices={filteredDevices}
              timeRange={timeRange}
              onTimeRangeChange={setTimeRange}
            />
          </TabsContent>

          <TabsContent value="visualizations" className="space-y-6">
            <VisualizationGrid
              devices={filteredDevices}
              deviceData={deviceData}
              visualizationConfigs={visualizationConfigs}
            />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <HistoricalAnalytics
              devices={filteredDevices}
              username={currentUser || "Anonymous"}
              timeRange={timeRange}
              onTimeRangeChange={setTimeRange}
            />
          </TabsContent>
        </Tabs>
      </motion.div>
    </motion.div>
  );
}
