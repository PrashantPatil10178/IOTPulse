"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Grid3X3,
  Maximize2,
  Gauge,
  Activity,
  AlertTriangle,
  Wifi,
  WifiOff,
  RefreshCw,
  MapPin,
  Clock,
  Zap,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Thermometer,
  Droplets,
  Eye,
  Lightbulb,
  Plug,
  Radio,
} from "lucide-react";
import GaugeChart from "@/components/dashboard/GaugeChart";
import StatusIndicator from "@/components/dashboard/StatusIndicator";
import LiveMetricCard from "@/components/dashboard/LiveMetricCard";
import CircularProgress from "@/components/dashboard/CircularProgress";
import { getDeviceIcon, getDeviceColor } from "@/utils/device-utils";
import { useSocket, useMultipleDevicesData } from "@/context/SocketContext";
import { toast } from "sonner";

interface SensorData {
  id: string;
  deviceId: string;
  deviceName: string;
  deviceType: string;
  timestamp: string;
  location: {
    latitude: number;
    longitude: number;
    city: string;
    country: string;
    location: string;
    isPrivateIP: boolean;
    note?: string;
  };
  template: {
    primaryMetric: string;
    secondaryMetrics: string[];
    chartType: string;
    unit: string;
    icon: string;
    color: string;
    category: string;
  };
  metrics: {
    primary: {
      name: string;
      value: number;
      unit: string;
      min?: number;
      max?: number;
    };
    secondary: Array<{
      name: string;
      value: number;
      unit: string;
      min?: number;
      max?: number;
    }>;
  };
  rawData: any;
  visualization: {
    chartType: string;
    color: string;
    icon: string;
    category: string;
  };
}

interface LiveDataVisualizationProps {
  devices: Array<{
    id: string;
    name: string;
    type: string;
    status: string;
  }>;
}

export default function LiveDataVisualization({
  devices,
}: LiveDataVisualizationProps) {
  const [gridLayout, setGridLayout] = useState<"1" | "2" | "3">("2");
  const [visualizationType, setVisualizationType] = useState<
    "auto" | "gauge" | "status" | "metric"
  >("auto");
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const { subscribeToAllDevices, isConnected, forceDataSync } = useSocket();
  const { devicesData, getDeviceData, getDeviceStatus, getAllActiveDevices } =
    useMultipleDevicesData(devices.map((d) => d.id));

  // Process devices with real-time data
  const processedDevices = useMemo(() => {
    return devices.map((device) => {
      const socketData = getDeviceData(device.id);
      const deviceStatus = getDeviceStatus(device.id);
      const sensorData =
        socketData && "0" in socketData
          ? (socketData["0"] as SensorData)
          : undefined;

      return {
        ...device,
        sensorData,
        socketData,
        deviceStatus,
        isLive: deviceStatus?.connectionStatus === "RECEIVING_DATA",
        category: sensorData?.template?.category || "Generic",
        lastUpdate: sensorData?.timestamp || null,
      };
    });
  }, [devices, devicesData]);

  // Get unique categories
  const categories = useMemo(() => {
    const cats = ["all", ...new Set(processedDevices.map((d) => d.category))];
    return cats;
  }, [processedDevices]);

  // Subscribe to devices
  useEffect(() => {
    if (devices.length > 0 && isConnected) {
      subscribeToAllDevices(devices.map((d) => d.id));
    }
  }, [devices, isConnected, subscribeToAllDevices]);

  const getVisualizationType = (
    device: any
  ): "gauge" | "status" | "metric" | "circular" => {
    if (visualizationType !== "auto") {
      return visualizationType as "gauge" | "status" | "metric";
    }

    const { sensorData } = device;
    const primaryMetric = sensorData?.metrics?.primary;
    const deviceType = sensorData?.deviceType;

    // Auto-select best visualization based on device type and data
    if (!primaryMetric) return "status";

    // For numeric values, use gauge or circular progress
    if (typeof primaryMetric.value === "number") {
      // Percentage-based metrics use circular progress
      if (
        primaryMetric.unit === "%" ||
        primaryMetric.name.includes("level") ||
        primaryMetric.name.includes("humidity")
      ) {
        return "circular";
      }
      // Temperature, pressure, power etc use gauge
      if (
        [
          "temperature",
          "pressure",
          "powerUsage",
          "flowRate",
          "vibration_intensity",
        ].includes(primaryMetric.name)
      ) {
        return "gauge";
      }
      // Default numeric to metric card
      return "metric";
    }

    // Boolean and string values use status
    return "status";
  };

  const getGridColumns = () => {
    const colMap = {
      "1": "grid-cols-1",
      "2": "grid-cols-1 lg:grid-cols-2",
      "3": "grid-cols-1 md:grid-cols-2 xl:grid-cols-3",
    };
    return colMap[gridLayout];
  };

  const handleForceSync = async (deviceId: string) => {
    try {
      const success = await forceDataSync(deviceId);
      if (success) {
        toast.success(`Device ${deviceId} synced successfully`);
      } else {
        toast.error(`Failed to sync device ${deviceId}`);
      }
    } catch (error) {
      toast.error(`Error syncing device ${deviceId}`);
    }
  };

  const filteredDevices = processedDevices.filter((device) => {
    const categoryMatch =
      selectedCategory === "all" || device.category === selectedCategory;
    const onlineMatch = !showOnlineOnly || device.isLive;
    return categoryMatch && onlineMatch;
  });

  const activeDevices = getAllActiveDevices();

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              <h2 className="text-2xl font-bold">Live IoT Dashboard</h2>
              <Badge variant="outline">{devices.length} Devices</Badge>
              <Badge variant="default" className="bg-green-500">
                <Wifi className="w-3 h-3 mr-1" />
                {activeDevices.length} Live
              </Badge>
              <Badge variant="secondary" className="text-xs">
                <Clock className="w-3 h-3 mr-1" />
                {new Date().toLocaleTimeString()}
              </Badge>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Select
                value={selectedCategory}
                onValueChange={setSelectedCategory}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category === "all" ? "All Categories" : category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={gridLayout}
                onValueChange={(value: "1" | "2" | "3") => setGridLayout(value)}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 Column</SelectItem>
                  <SelectItem value="2">2 Columns</SelectItem>
                  <SelectItem value="3">3 Columns</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={visualizationType}
                onValueChange={(
                  value: "auto" | "gauge" | "status" | "metric"
                ) => setVisualizationType(value)}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto Select</SelectItem>
                  <SelectItem value="gauge">Force Gauges</SelectItem>
                  <SelectItem value="status">Force Status</SelectItem>
                  <SelectItem value="metric">Force Metrics</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowOnlineOnly(!showOnlineOnly)}
              >
                {showOnlineOnly ? "Show All" : "Live Only"}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Live Data Grid */}
      <div className={`grid ${getGridColumns()} gap-6`}>
        {filteredDevices.map((device) => {
          const IconComponent = getDeviceIcon(device.type);
          const { sensorData, deviceStatus, isLive } = device;

          const visualType = getVisualizationType(device);
          const deviceColor =
            sensorData?.template?.color || getDeviceColor(device.type);
          const hasError = deviceStatus?.error;
          const primaryMetric = sensorData?.metrics?.primary;
          const secondaryMetrics = sensorData?.metrics?.secondary || [];

          return (
            <Card
              key={device.id}
              className={`overflow-hidden transition-all duration-300 ${
                isLive
                  ? "border-2 border-green-200 shadow-lg shadow-green-100/50"
                  : hasError
                  ? "border-2 border-red-200 shadow-lg shadow-red-100/50"
                  : "border hover:shadow-md"
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="p-3 rounded-xl shadow-sm relative"
                      style={{
                        backgroundColor: `${deviceColor}15`,
                        border: `2px solid ${deviceColor}30`,
                      }}
                    >
                      <IconComponent
                        className="w-6 h-6"
                        style={{ color: deviceColor }}
                      />
                      {isLive && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                      )}
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-lg font-bold">
                        {sensorData?.deviceName || device.name}
                      </CardTitle>
                      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                        <span>{device.category}</span>
                        {sensorData?.location && (
                          <>
                            <span>•</span>
                            <div className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              <span>{sensorData.location.city}</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge
                      variant={isLive ? "default" : "secondary"}
                      className={isLive ? "bg-green-500" : ""}
                    >
                      {isLive ? "LIVE" : "OFFLINE"}
                    </Badge>
                    {hasError && (
                      <Badge variant="destructive" className="text-xs">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        ERROR
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-4">
                {sensorData && isLive ? (
                  <div className="space-y-4">
                    {/* Main Visualization */}
                    <div className="h-64 w-full flex items-center justify-center">
                      {visualType === "gauge" &&
                      typeof primaryMetric?.value === "number" ? (
                        <GaugeChart
                          value={primaryMetric.value}
                          min={primaryMetric.min || 0}
                          max={primaryMetric.max || primaryMetric.value * 1.5}
                          unit={primaryMetric.unit}
                          color={deviceColor}
                          title={primaryMetric.name?.replace(/_/g, " ")}
                          className="w-full h-full"
                        />
                      ) : visualType === "circular" &&
                        typeof primaryMetric?.value === "number" ? (
                        <CircularProgress
                          value={primaryMetric.value}
                          max={primaryMetric.max || 100}
                          unit={primaryMetric.unit}
                          color={deviceColor}
                          title={primaryMetric.name?.replace(/_/g, " ")}
                          className="w-full h-full"
                        />
                      ) : visualType === "status" ? (
                        <StatusIndicator
                          status={primaryMetric?.value}
                          deviceType={device.type}
                          color={deviceColor}
                          title={primaryMetric?.name?.replace(/_/g, " ")}
                          className="w-full h-full"
                        />
                      ) : (
                        <LiveMetricCard
                          value={primaryMetric?.value}
                          unit={primaryMetric?.unit}
                          title={primaryMetric?.name?.replace(/_/g, " ")}
                          color={deviceColor}
                          className="w-full h-full"
                        />
                      )}
                    </div>

                    {/* Secondary Metrics */}
                    {secondaryMetrics.length > 0 && (
                      <div className="grid grid-cols-2 gap-3">
                        {secondaryMetrics
                          .slice(0, 4)
                          .map((metric: any, index: number) => (
                            <div
                              key={metric.name || index}
                              className="text-center p-3 rounded-lg border"
                              style={{
                                backgroundColor: `${deviceColor}08`,
                                borderColor: `${deviceColor}30`,
                              }}
                            >
                              <div className="text-xs text-muted-foreground font-medium mb-1">
                                {metric.name?.replace(/_/g, " ")}
                              </div>
                              <div
                                className="font-bold text-lg"
                                style={{ color: deviceColor }}
                              >
                                {typeof metric.value === "number"
                                  ? metric.value.toFixed(2)
                                  : metric.value?.toString() || "N/A"}
                                {metric.unit && (
                                  <span className="text-xs ml-1">
                                    {metric.unit}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                      </div>
                    )}

                    {/* Energy Meter Specific Info */}
                    {sensorData.deviceType === "ENERGY_METER" &&
                      sensorData.rawData?.cost && (
                        <div
                          className="p-3 rounded-lg flex items-center justify-between"
                          style={{ backgroundColor: `${deviceColor}10` }}
                        >
                          <div className="flex items-center gap-2">
                            <DollarSign
                              className="w-5 h-5"
                              style={{ color: deviceColor }}
                            />
                            <span className="font-medium">Current Cost</span>
                          </div>
                          <div
                            className="text-xl font-bold"
                            style={{ color: deviceColor }}
                          >
                            ₹{sensorData.rawData.cost.toFixed(2)}
                          </div>
                        </div>
                      )}

                    {/* Last Update */}
                    <div className="text-center text-xs text-muted-foreground">
                      <Clock className="w-3 h-3 inline mr-1" />
                      Updated:{" "}
                      {new Date(sensorData.timestamp).toLocaleTimeString()}
                    </div>

                    {/* Actions */}
                    <div className="flex justify-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleForceSync(device.id)}
                        style={{
                          borderColor: `${deviceColor}40`,
                          color: deviceColor,
                        }}
                      >
                        <RefreshCw className="w-4 h-4 mr-1" />
                        Refresh
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    <div className="text-center space-y-3">
                      <IconComponent className="w-16 h-16 mx-auto opacity-30" />
                      <div>
                        <p className="font-medium">
                          {hasError ? "Device Error" : "No Live Data"}
                        </p>
                        <p className="text-sm">
                          {hasError ? hasError.message : "Waiting for data..."}
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleForceSync(device.id)}
                          className="mt-2"
                        >
                          <RefreshCw className="w-4 h-4 mr-1" />
                          Retry
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Live Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Live System Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-3xl font-bold text-green-600">
                {activeDevices.length}
              </div>
              <div className="text-sm text-green-700 font-medium">
                Live Devices
              </div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-3xl font-bold text-blue-600">
                {processedDevices.filter((d) => d.sensorData).length}
              </div>
              <div className="text-sm text-blue-700 font-medium">With Data</div>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <div className="text-3xl font-bold text-yellow-600">
                {
                  processedDevices.filter(
                    (d) => !d.isLive && !d.deviceStatus?.error
                  ).length
                }
              </div>
              <div className="text-sm text-yellow-700 font-medium">Idle</div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-3xl font-bold text-red-600">
                {processedDevices.filter((d) => d.deviceStatus?.error).length}
              </div>
              <div className="text-sm text-red-700 font-medium">Errors</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
