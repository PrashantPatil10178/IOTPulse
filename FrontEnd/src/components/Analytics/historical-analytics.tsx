"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  History,
  TrendingUp,
  Calendar,
  BarChart3,
  LineChart,
  AreaChart,
  Activity,
  Wifi,
  WifiOff,
  AlertTriangle,
  RefreshCw,
  Zap,
  Database,
  Layers,
} from "lucide-react";
import DataChart from "@/components/dashboard/DataChart";
import { useHistoricalData } from "@/hooks/use-historical-data";
import {
  useSocket,
  useDeviceData,
  useDeviceStats,
} from "@/context/SocketContext";
import {
  getDeviceIcon,
  getDeviceColor,
  getDeviceGradient,
} from "@/utils/device-utils";

interface HistoricalAnalyticsProps {
  devices: any[];
  username: string;
  timeRange: string;
  onTimeRangeChange: (range: string) => void;
}

export default function HistoricalAnalytics({
  devices,
  username,
  timeRange,
  onTimeRangeChange,
}: HistoricalAnalyticsProps) {
  const [selectedDevice, setSelectedDevice] = useState<string>("");
  const [dataLimit, setDataLimit] = useState("100");
  const [chartType, setChartType] = useState<"line" | "area" | "bar">("area");
  const [dataMode, setDataMode] = useState<
    "combined" | "historical" | "realtime"
  >("combined");

  // Socket context hooks
  const {
    isConnected,
    getReceivingDataDevices,
    subscribeToAllDevices,
    forceDataSync,
  } = useSocket();

  const { stats, deviceErrors, activeDevicesCount } = useDeviceStats();

  // Get real-time data for selected device
  const {
    data: realtimeData,
    connectionStatus,
    isLiveDataActive,
    error: deviceError,
    isSyncing,
    forceSync,
    lastDataReceived,
    hasData: hasRealtimeData,
  } = useDeviceData(selectedDevice);

  // Historical data hook
  const {
    historicalData,
    isLoading: isLoadingHistorical,
    error: historicalError,
    fetchHistoricalData,
    refreshHistoricalData,
    getLatestHistoricalPoint,
    mergeWithRealtimeData,
    clearHistoricalData,
  } = useHistoricalData(username);

  // Subscribe to all devices on mount
  useEffect(() => {
    if (devices.length > 0 && isConnected) {
      const deviceIds = devices.map((d) => d.id);
      subscribeToAllDevices(deviceIds);
      console.log(
        `🔌 Subscribed to ${deviceIds.length} devices for real-time data`
      );
    }
  }, [devices, isConnected, subscribeToAllDevices]);

  // Set first device as default when devices load
  useEffect(() => {
    if (devices.length > 0 && !selectedDevice) {
      setSelectedDevice(devices[0].id);
      console.log(`📱 Auto-selected device: ${devices[0].id}`);
    }
  }, [devices, selectedDevice]);

  // Fetch historical data for selected device
  useEffect(() => {
    if (
      selectedDevice &&
      (dataMode === "combined" || dataMode === "historical")
    ) {
      console.log(`📊 Fetching historical data for device: ${selectedDevice}`);
      fetchHistoricalData(
        selectedDevice,
        Number.parseInt(dataLimit),
        timeRange
      );
    }
  }, [selectedDevice, dataLimit, timeRange, fetchHistoricalData, dataMode]);

  // Real-time Device Status Indicator Component
  const DeviceStatusIndicator = ({ deviceId }: { deviceId: string }) => {
    const { connectionStatus, isLiveDataActive, error } =
      useDeviceData(deviceId);

    const getStatusConfig = () => {
      switch (connectionStatus) {
        case "RECEIVING_DATA":
          return {
            color: "text-green-500",
            bgColor: "bg-green-100 dark:bg-green-900/30",
            icon: Wifi,
            label: "Live",
            animate: true,
          };
        case "ERROR":
          return {
            color: "text-red-500",
            bgColor: "bg-red-100 dark:bg-red-900/30",
            icon: AlertTriangle,
            label: "Error",
            animate: false,
          };
        case "NOT_CONNECTED":
          return {
            color: "text-yellow-500",
            bgColor: "bg-yellow-100 dark:bg-yellow-900/30",
            icon: WifiOff,
            label: "Idle",
            animate: false,
          };
        case "DISCONNECTED":
        default:
          return {
            color: "text-gray-500",
            bgColor: "bg-gray-100 dark:bg-gray-900/30",
            icon: WifiOff,
            label: "Offline",
            animate: false,
          };
      }
    };

    const config = getStatusConfig();
    const IconComponent = config.icon;

    return (
      <div className="flex items-center gap-2">
        <div className={`p-1 rounded-full ${config.bgColor}`}>
          <IconComponent
            className={`w-3 h-3 ${config.color} ${
              config.animate ? "animate-pulse" : ""
            }`}
          />
        </div>
        <span className={`text-xs font-medium ${config.color}`}>
          {config.label}
        </span>
        {error && (
          <Badge variant="destructive" className="text-xs px-1 py-0">
            {error.errorType.split("_")[0]}
          </Badge>
        )}
      </div>
    );
  };

  // Enhanced Device Selection Component
  const EnhancedDeviceSelect = () => (
    <Select value={selectedDevice} onValueChange={setSelectedDevice}>
      <SelectTrigger className="w-64 transition-all duration-200 hover:shadow-sm">
        <SelectValue placeholder="Select Device" />
      </SelectTrigger>
      <SelectContent>
        {devices.map((device) => {
          const IconComponent = getDeviceIcon(device.type);
          return (
            <SelectItem key={device.id} value={device.id}>
              <div className="flex items-center justify-between w-full gap-3">
                <div className="flex items-center gap-2">
                  <IconComponent className="w-4 h-4" />
                  <div>
                    <div className="font-medium">{device.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {device.type.replace(/_/g, " ").toLowerCase()}
                    </div>
                  </div>
                </div>
                <DeviceStatusIndicator deviceId={device.id} />
              </div>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );

  // Get analytics data based on selected mode
  const getAnalyticsData = useCallback(() => {
    if (!selectedDevice) return [];

    const historical = historicalData[selectedDevice] || [];

    switch (dataMode) {
      case "historical":
        console.log(
          `📊 Using historical data only: ${historical.length} points`
        );
        return historical.map((point) => ({
          timestamp: point.timestamp,
          [point.data?.metrics?.primary?.name || "Primary"]:
            point.data?.metrics?.primary?.value || 0,
          // Add secondary metrics
          ...(point.data?.metrics?.secondary || []).reduce(
            (acc: any, metric: any) => {
              if (metric.name && metric.value !== undefined) {
                acc[metric.name] = metric.value;
              }
              return acc;
            },
            {}
          ),
        }));

      case "realtime":
        console.log(`🔴 Using real-time data only`);
        if (realtimeData && hasRealtimeData) {
          const realtimePoint = {
            timestamp: realtimeData.timestamp,
            [realtimeData.data?.metrics?.primary?.name || "Primary"]:
              realtimeData.data?.metrics?.primary?.value || 0,
          };
          // Add secondary metrics
          if (
            realtimeData.data?.metrics?.secondary &&
            Array.isArray(realtimeData.data.metrics.secondary)
          ) {
            realtimeData.data.metrics.secondary.forEach((metric: any) => {
              if (metric.name && metric.value !== undefined) {
                realtimePoint[metric.name] = metric.value;
              }
            });
          }
          return [realtimePoint];
        }
        return [];

      case "combined":
      default:
        console.log(
          `🔗 Using combined data: ${historical.length} historical + ${
            hasRealtimeData ? 1 : 0
          } real-time`
        );
        const merged = mergeWithRealtimeData(selectedDevice, realtimeData);
        return merged.map((point) => ({
          timestamp: point.timestamp,
          [point.data?.metrics?.primary?.name || "Primary"]:
            point.data?.metrics?.primary?.value || 0,
          // Add secondary metrics
          ...(point.data?.metrics?.secondary || []).reduce(
            (acc: any, metric: any) => {
              if (metric.name && metric.value !== undefined) {
                acc[metric.name] = metric.value;
              }
              return acc;
            },
            {}
          ),
        }));
    }
  }, [
    selectedDevice,
    historicalData,
    realtimeData,
    hasRealtimeData,
    dataMode,
    mergeWithRealtimeData,
  ]);

  const analyticsData = getAnalyticsData();
  const selectedDeviceObj = devices.find((d) => d.id === selectedDevice);

  // Get chart colors based on selected device
  const getChartColors = () => {
    if (!selectedDeviceObj) return ["#3B82F6"];
    const deviceGradient = getDeviceGradient(selectedDeviceObj.type);
    return deviceGradient;
  };

  // Calculate enhanced statistics
  const getEnhancedStatistics = () => {
    if (analyticsData.length < 1) return null;

    const values = analyticsData
      .map((d) => {
        const numericValues = Object.values(d).filter(
          (v) => typeof v === "number"
        ) as number[];
        return numericValues[0] || 0;
      })
      .filter((v) => v !== undefined);

    if (values.length === 0) return null;

    const latest = values[values.length - 1];
    const previous = values.length > 1 ? values[values.length - 2] : latest;
    const change = latest - previous;
    const changePercent = previous !== 0 ? (change / previous) * 100 : 0;

    const latestHistorical = getLatestHistoricalPoint(selectedDevice);

    return {
      latest,
      change,
      changePercent,
      min: Math.min(...values),
      max: Math.max(...values),
      avg: values.reduce((sum, v) => sum + v, 0) / values.length,
      dataPoints: analyticsData.length,
      historicalPoints: historicalData[selectedDevice]?.length || 0,
      hasRealtime: hasRealtimeData,
      hasHistorical: (historicalData[selectedDevice]?.length || 0) > 0,
      lastHistoricalUpdate: latestHistorical?.timestamp,
      lastRealtimeUpdate: realtimeData?.timestamp,
      dataMode,
    };
  };

  const statistics = getEnhancedStatistics();

  // Get metric names for legend
  const getMetricNames = () => {
    if (analyticsData.length === 0) return [];
    const sampleData = analyticsData[0];
    return Object.keys(sampleData).filter((key) => key !== "timestamp");
  };

  const metricNames = getMetricNames();

  // Force sync and refresh handlers
  const handleForceSync = async () => {
    if (selectedDevice) {
      console.log(`🔄 Force syncing device: ${selectedDevice}`);
      await forceSync();
    }
  };

  const handleRefreshHistorical = async () => {
    if (selectedDevice) {
      console.log(
        `🔄 Refreshing historical data for device: ${selectedDevice}`
      );
      await refreshHistoricalData(selectedDevice);
    }
  };

  const handleRefreshAll = async () => {
    if (selectedDevice) {
      console.log(`🔄 Refreshing all data for device: ${selectedDevice}`);
      await Promise.all([forceSync(), refreshHistoricalData(selectedDevice)]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Enhanced Header Card */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200 dark:border-blue-800">
        <CardHeader className="pb-4">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                <History className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <CardTitle className="text-xl text-blue-900 dark:text-blue-100">
                  Historical Analytics
                </CardTitle>
                <div className="flex items-center gap-4 text-sm text-blue-600 dark:text-blue-300">
                  <span>Database + Real-time Analytics</span>
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        isConnected
                          ? "bg-green-500 animate-pulse"
                          : "bg-red-500"
                      }`}
                    />
                    <span>{isConnected ? "Connected" : "Disconnected"}</span>
                  </div>
                  <span>
                    {activeDevicesCount} of {stats.totalDevices} devices active
                  </span>
                  {stats.errorDevices > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      {stats.errorDevices} errors
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Device Selection */}
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-muted-foreground" />
                <EnhancedDeviceSelect />
              </div>

              {/* Data Mode Selection */}
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-muted-foreground" />
                <Select
                  value={dataMode}
                  onValueChange={(
                    value: "combined" | "historical" | "realtime"
                  ) => setDataMode(value)}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="combined">
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4" />
                        Combined
                      </div>
                    </SelectItem>
                    <SelectItem value="historical">
                      <div className="flex items-center gap-2">
                        <Database className="w-4 h-4" />
                        Historical
                      </div>
                    </SelectItem>
                    <SelectItem value="realtime">
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4" />
                        Real-time
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Time Range Selection */}
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <Select value={timeRange} onValueChange={onTimeRangeChange}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1h">1 Hour</SelectItem>
                    <SelectItem value="6h">6 Hours</SelectItem>
                    <SelectItem value="12h">12 Hours</SelectItem>
                    <SelectItem value="24h">24 Hours</SelectItem>
                    <SelectItem value="7d">7 Days</SelectItem>
                    <SelectItem value="30d">30 Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Chart Type Selection */}
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-muted-foreground" />
                <Select
                  value={chartType}
                  onValueChange={(value: "line" | "area" | "bar") =>
                    setChartType(value)
                  }
                >
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="line">
                      <div className="flex items-center gap-2">
                        <LineChart className="w-4 h-4" />
                        Line Chart
                      </div>
                    </SelectItem>
                    <SelectItem value="area">
                      <div className="flex items-center gap-2">
                        <AreaChart className="w-4 h-4" />
                        Area Chart
                      </div>
                    </SelectItem>
                    <SelectItem value="bar">
                      <div className="flex items-center gap-2">
                        <BarChart3 className="w-4 h-4" />
                        Bar Chart
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Data Limit Selection (only for historical data) */}
              {(dataMode === "combined" || dataMode === "historical") && (
                <Select value={dataLimit} onValueChange={setDataLimit}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="50">50 Points</SelectItem>
                    <SelectItem value="100">100 Points</SelectItem>
                    <SelectItem value="200">200 Points</SelectItem>
                    <SelectItem value="500">500 Points</SelectItem>
                    <SelectItem value="1000">1000 Points</SelectItem>
                  </SelectContent>
                </Select>
              )}

              {/* Refresh Buttons */}
              {selectedDevice && (
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleForceSync}
                    disabled={isSyncing}
                    className="flex items-center gap-2"
                  >
                    <Zap
                      className={`w-4 h-4 ${isSyncing ? "animate-spin" : ""}`}
                    />
                    Socket
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRefreshHistorical}
                    disabled={isLoadingHistorical}
                    className="flex items-center gap-2"
                  >
                    <Database
                      className={`w-4 h-4 ${
                        isLoadingHistorical ? "animate-spin" : ""
                      }`}
                    />
                    DB
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRefreshAll}
                    disabled={isSyncing || isLoadingHistorical}
                    className="flex items-center gap-2"
                  >
                    <RefreshCw
                      className={`w-4 h-4 ${
                        isSyncing || isLoadingHistorical ? "animate-spin" : ""
                      }`}
                    />
                    All
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Error Alerts */}
      {(deviceError || historicalError) && (
        <div className="space-y-2">
          {deviceError && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span>
                  Socket Error - Device {selectedDevice}: {deviceError.message}
                </span>
                <Button variant="outline" size="sm" onClick={handleForceSync}>
                  Retry Socket
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {historicalError && (
            <Alert variant="destructive">
              <Database className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span>Database Error: {historicalError}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefreshHistorical}
                >
                  Retry DB
                </Button>
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {/* Data Source Status Cards */}
      {selectedDevice && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Real-time Data Status */}
          <Card
            className={`border-l-4 ${
              hasRealtimeData ? "border-l-green-500" : "border-l-gray-400"
            }`}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Zap
                      className={`w-4 h-4 ${
                        hasRealtimeData ? "text-green-500" : "text-gray-400"
                      }`}
                    />
                    <h4 className="font-medium">Real-time Data</h4>
                    <Badge
                      variant={isLiveDataActive ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {isLiveDataActive ? "Live" : "Cached"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Status:{" "}
                    <span className="font-medium">
                      {connectionStatus.replace("_", " ").toLowerCase()}
                    </span>
                  </p>
                  {lastDataReceived && (
                    <p className="text-xs text-muted-foreground">
                      Last: {new Date(lastDataReceived).toLocaleString()}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  {realtimeData?.data?.metrics?.primary && (
                    <div>
                      <div className="text-xl font-bold text-green-600">
                        {realtimeData.data.metrics.primary.value}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {realtimeData.data.metrics.primary.unit}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Historical Data Status */}
          <Card
            className={`border-l-4 ${
              statistics?.hasHistorical
                ? "border-l-blue-500"
                : "border-l-gray-400"
            }`}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Database
                      className={`w-4 h-4 ${
                        statistics?.hasHistorical
                          ? "text-blue-500"
                          : "text-gray-400"
                      }`}
                    />
                    <h4 className="font-medium">Historical Data</h4>
                    {isLoadingHistorical && (
                      <Badge
                        variant="outline"
                        className="text-xs animate-pulse"
                      >
                        Loading...
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Points:{" "}
                    <span className="font-medium">
                      {statistics?.historicalPoints || 0}
                    </span>
                  </p>
                  {statistics?.lastHistoricalUpdate && (
                    <p className="text-xs text-muted-foreground">
                      Latest:{" "}
                      {new Date(
                        statistics.lastHistoricalUpdate
                      ).toLocaleString()}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-blue-600">
                    {statistics?.historicalPoints || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Records</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Enhanced Statistics Cards */}
      {statistics && selectedDeviceObj && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-blue-500 transform transition-all duration-300 hover:scale-105 hover:shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Latest Value</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {statistics.latest.toFixed(2)}
                  </p>
                  <Badge variant="outline" className="text-xs mt-1">
                    {statistics.dataMode}
                  </Badge>
                </div>
                <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-full">
                  <TrendingUp className="w-6 h-6 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card
            className={`border-l-4 transform transition-all duration-300 hover:scale-105 hover:shadow-lg ${
              statistics.change >= 0 ? "border-l-green-500" : "border-l-red-500"
            }`}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Change</p>
                  <p
                    className={`text-2xl font-bold ${
                      statistics.change >= 0 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {statistics.change >= 0 ? "+" : ""}
                    {statistics.change.toFixed(2)}
                  </p>
                  <p
                    className={`text-xs ${
                      statistics.changePercent >= 0
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {statistics.changePercent.toFixed(1)}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500 transform transition-all duration-300 hover:scale-105 hover:shadow-lg">
            <CardContent className="p-4">
              <div>
                <p className="text-sm text-muted-foreground">Range</p>
                <p className="text-lg font-bold text-purple-600">
                  {statistics.min.toFixed(1)} - {statistics.max.toFixed(1)}
                </p>
                <p className="text-sm text-muted-foreground">
                  Avg: {statistics.avg.toFixed(2)}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-orange-500 transform transition-all duration-300 hover:scale-105 hover:shadow-lg">
            <CardContent className="p-4">
              <div>
                <p className="text-sm text-muted-foreground">Data Points</p>
                <p className="text-2xl font-bold text-orange-600">
                  {statistics.dataPoints}
                </p>
                <div className="flex gap-1 mt-1">
                  {statistics.hasHistorical && (
                    <Badge variant="secondary" className="text-xs">
                      DB: {statistics.historicalPoints}
                    </Badge>
                  )}
                  {statistics.hasRealtime && (
                    <Badge variant="default" className="text-xs">
                      Live: 1
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Metrics Legend */}
      {selectedDevice && metricNames.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Metrics Legend
              <Badge variant="outline" className="text-xs">
                {dataMode} mode
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {metricNames.map((metric, index) => {
                const colors = getChartColors();
                const color = colors[Math.min(index, colors.length - 1)];
                return (
                  <div
                    key={metric}
                    className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50 transition-all duration-200 hover:scale-105"
                  >
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-sm font-medium capitalize">
                      {metric.replace(/_/g, " ")}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Enhanced Main Chart */}
      {selectedDeviceObj && (
        <Card className="overflow-hidden">
          <CardHeader className="pb-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {(() => {
                  const IconComponent = getDeviceIcon(selectedDeviceObj.type);
                  const deviceColor = getDeviceColor(selectedDeviceObj.type);
                  return (
                    <div
                      className="p-3 rounded-lg"
                      style={{ backgroundColor: `${deviceColor}20` }}
                    >
                      <IconComponent
                        className="w-6 h-6"
                        style={{ color: deviceColor }}
                      />
                    </div>
                  );
                })()}
                <div>
                  <CardTitle className="text-xl flex items-center gap-2">
                    {selectedDeviceObj.name}
                    <DeviceStatusIndicator deviceId={selectedDevice} />
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {selectedDeviceObj.type.replace(/_/g, " ")} - {dataMode}{" "}
                    Analysis
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {metricNames.length} Metrics
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  {chartType} Chart
                </Badge>
                <Badge
                  variant={dataMode === "combined" ? "default" : "outline"}
                  className="text-xs"
                >
                  {dataMode}
                </Badge>
                {(isLoadingHistorical || isSyncing) && (
                  <Badge variant="outline" className="text-xs animate-pulse">
                    Loading...
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6">
            {analyticsData.length > 0 ? (
              <div className="w-full">
                <DataChart
                  title=""
                  description=""
                  data={analyticsData}
                  type={chartType}
                  colors={getChartColors()}
                  className="w-full h-[500px]"
                />
                <div className="mt-4 text-center space-y-2">
                  <div className="flex items-center justify-center gap-4 text-xs">
                    <Badge variant="secondary">
                      {analyticsData.length} total points
                    </Badge>
                    {statistics?.hasHistorical && (
                      <Badge variant="outline">
                        DB: {statistics.historicalPoints}
                      </Badge>
                    )}
                    {statistics?.hasRealtime && (
                      <Badge variant="default">Live: Active</Badge>
                    )}
                    <Badge variant="outline">
                      Updated: {new Date().toLocaleTimeString()}
                    </Badge>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-[500px] flex items-center justify-center">
                <div className="text-center space-y-4">
                  <History className="w-16 h-16 mx-auto opacity-50" />
                  <div>
                    <h3 className="text-lg font-medium">
                      {isLoadingHistorical || isSyncing
                        ? "Loading Data..."
                        : "No Data Available"}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {isLoadingHistorical || isSyncing
                        ? "Fetching data from database and sockets..."
                        : `No ${dataMode} data available for this device`}
                    </p>
                    {!isConnected && (
                      <Alert
                        variant="destructive"
                        className="mt-4 max-w-md mx-auto"
                      >
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          Socket connection lost. Real-time data unavailable.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* System Status Footer */}
      <Card className="bg-muted/30">
        <CardContent className="p-4">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4" />
                <span>
                  DB: {statistics?.hasHistorical ? "Connected" : "No Data"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full ${
                    isConnected ? "bg-green-500" : "bg-red-500"
                  }`}
                />
                <span>
                  Socket: {isConnected ? "Connected" : "Disconnected"}
                </span>
              </div>
              <span>
                Active: {activeDevicesCount}/{stats.totalDevices}
              </span>
              {stats.errorDevices > 0 && (
                <span className="text-red-500">
                  Errors: {stats.errorDevices}
                </span>
              )}
            </div>
            <div className="text-muted-foreground">
              Last refresh: {new Date().toLocaleTimeString()} • User: {username}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
