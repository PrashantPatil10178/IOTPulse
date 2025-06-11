"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
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
  Play,
  Pause,
  RotateCcw,
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

interface RealTimeDataPoint {
  timestamp: string;
  [key: string]: any;
}

// Enhanced DeviceStatusIndicator with real-time pulse
const DeviceStatusIndicator = ({ deviceId }: { deviceId: string }) => {
  const { connectionStatus, isLiveDataActive, error, lastDataReceived } =
    useDeviceData(deviceId);
  const [pulseActive, setPulseActive] = useState(false);

  // Trigger pulse animation when new data arrives
  useEffect(() => {
    if (isLiveDataActive && connectionStatus === "RECEIVING_DATA") {
      setPulseActive(true);
      const timeout = setTimeout(() => setPulseActive(false), 1000);
      return () => clearTimeout(timeout);
    }
  }, [lastDataReceived, isLiveDataActive, connectionStatus]);

  const statusConfig = useMemo(() => {
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
  }, [connectionStatus]);

  const IconComponent = statusConfig.icon;

  return (
    <div className="flex items-center gap-2">
      <div
        className={`p-1 rounded-full ${statusConfig.bgColor} ${
          pulseActive ? "ring-2 ring-green-400 ring-opacity-50" : ""
        }`}
      >
        <IconComponent
          className={`w-3 h-3 ${statusConfig.color} ${
            statusConfig.animate ? "animate-pulse" : ""
          } ${
            pulseActive ? "scale-110 transition-transform duration-300" : ""
          }`}
        />
      </div>
      <span className={`text-xs font-medium ${statusConfig.color}`}>
        {statusConfig.label}
      </span>
      {error && (
        <Badge variant="destructive" className="text-xs px-1 py-0">
          {error.errorType.split("_")[0]}
        </Badge>
      )}
    </div>
  );
};

export default function HistoricalAnalytics({
  devices,
  username,
  timeRange,
  onTimeRangeChange,
}: HistoricalAnalyticsProps) {
  // State management
  const [selectedDevice, setSelectedDevice] = useState<string>("");
  const [dataLimit, setDataLimit] = useState("100");
  const [chartType, setChartType] = useState<"line" | "area" | "bar">("area");
  const [dataMode, setDataMode] = useState<
    "combined" | "historical" | "realtime"
  >("combined");
  const [isRealTimeEnabled, setIsRealTimeEnabled] = useState(true);
  const [chartData, setChartData] = useState<RealTimeDataPoint[]>([]);
  const [lastUpdateTime, setLastUpdateTime] = useState<string>("");

  // Refs for real-time data management
  const dataUpdateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const chartUpdateCountRef = useRef(0);
  const lastSocketDataRef = useRef<any>(null);

  // Socket context hooks
  const { isConnected, subscribeToAllDevices, forceDataSync } = useSocket();
  const { stats, activeDevicesCount } = useDeviceStats();

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
    deviceInfo,
    dataStructures,
    isLoading: isLoadingHistorical,
    error: historicalError,
    fetchHistoricalData,
    refreshHistoricalData,
    getDataStats,
    mergeWithRealtimeData,
  } = useHistoricalData(username);

  // Memoized device list
  const deviceList = useMemo(() => devices, [devices]);

  // Memoized selected device object
  const selectedDeviceObj = useMemo(
    () => deviceList.find((d) => d.id === selectedDevice),
    [deviceList, selectedDevice]
  );

  // Enhanced data transformation function
  const transformSocketDataToChartFormat = useCallback(
    (socketData: any): RealTimeDataPoint | null => {
      if (!socketData || !socketData.timestamp) return null;

      const chartPoint: RealTimeDataPoint = {
        timestamp: socketData.timestamp,
      };

      // Extract primary metric
      if (socketData.data?.metrics?.primary) {
        const primaryMetric = socketData.data.metrics.primary;
        chartPoint[primaryMetric.name || "Primary"] = primaryMetric.value || 0;
      }

      // Extract secondary metrics
      if (
        socketData.data?.metrics?.secondary &&
        Array.isArray(socketData.data.metrics.secondary)
      ) {
        socketData.data.metrics.secondary.forEach((metric: any) => {
          if (metric.name && metric.value !== undefined) {
            chartPoint[metric.name] = metric.value;
          }
        });
      }

      // Fallback for simple value structure
      if (socketData.value !== undefined && !socketData.data?.metrics) {
        chartPoint["Value"] = socketData.value;
      }

      return chartPoint;
    },
    []
  );

  // Enhanced data merging with sliding window
  const mergeDataWithSlidingWindow = useCallback(
    (
      historical: RealTimeDataPoint[],
      realtime: any,
      maxPoints: number = 100
    ): RealTimeDataPoint[] => {
      let combined = [...historical];

      // Add real-time data if available
      if (realtime && hasRealtimeData) {
        const realtimePoint = transformSocketDataToChartFormat(realtime);
        if (realtimePoint) {
          // Check if this is new data (different timestamp)
          const lastPoint = combined[combined.length - 1];
          if (!lastPoint || lastPoint.timestamp !== realtimePoint.timestamp) {
            combined.push(realtimePoint);
          } else {
            // Update existing point with latest data
            combined[combined.length - 1] = { ...lastPoint, ...realtimePoint };
          }
        }
      }

      // Implement sliding window - keep only the latest N points
      if (combined.length > maxPoints) {
        combined = combined.slice(-maxPoints);
      }

      // Sort by timestamp to ensure proper ordering
      combined.sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      return combined;
    },
    [hasRealtimeData, transformSocketDataToChartFormat]
  );

  // Real-time data update effect
  useEffect(() => {
    if (!selectedDevice || !isRealTimeEnabled) return;

    // Clear existing interval
    if (dataUpdateIntervalRef.current) {
      clearInterval(dataUpdateIntervalRef.current);
    }

    // Set up real-time data updates
    dataUpdateIntervalRef.current = setInterval(() => {
      const historical = historicalData[selectedDevice] || [];

      // Check if socket data has changed
      const currentSocketData = realtimeData;
      const hasNewSocketData =
        JSON.stringify(currentSocketData) !==
        JSON.stringify(lastSocketDataRef.current);

      if (hasNewSocketData || chartUpdateCountRef.current === 0) {
        lastSocketDataRef.current = currentSocketData;

        const newChartData = (() => {
          switch (dataMode) {
            case "historical":
              return historical;
            case "realtime":
              if (currentSocketData) {
                const realtimePoint =
                  transformSocketDataToChartFormat(currentSocketData);
                return realtimePoint ? [realtimePoint] : [];
              }
              return [];
            case "combined":
            default:
              return mergeDataWithSlidingWindow(
                historical,
                currentSocketData,
                Number.parseInt(dataLimit, 10)
              );
          }
        })();

        // Only update if data has actually changed
        if (JSON.stringify(newChartData) !== JSON.stringify(chartData)) {
          setChartData(newChartData);
          setLastUpdateTime(new Date().toISOString());
          chartUpdateCountRef.current++;

          console.log(
            `📊 Chart updated (${chartUpdateCountRef.current}): ${newChartData.length} points`
          );
        }
      }
    }, 1000); // Update every second for responsive UI

    return () => {
      if (dataUpdateIntervalRef.current) {
        clearInterval(dataUpdateIntervalRef.current);
      }
    };
  }, [
    selectedDevice,
    realtimeData,
    historicalData,
    dataMode,
    dataLimit,
    isRealTimeEnabled,
    chartData,
    mergeDataWithSlidingWindow,
    transformSocketDataToChartFormat,
  ]);

  // Subscribe to devices on mount
  useEffect(() => {
    if (deviceList.length > 0 && isConnected) {
      const deviceIds = deviceList.map((d) => d.id);
      subscribeToAllDevices(deviceIds);
      console.log(
        `🔌 Subscribed to ${deviceIds.length} devices for real-time data`
      );
    }
  }, [deviceList, isConnected, subscribeToAllDevices]);

  // Set first device as default
  useEffect(() => {
    if (deviceList.length > 0 && !selectedDevice) {
      const firstDevice = deviceList[0];
      setSelectedDevice(firstDevice.id);
      console.log(`📱 Auto-selected device: ${firstDevice.id}`);
    }
  }, [deviceList, selectedDevice]);

  // Fetch historical data when device/limit changes
  useEffect(() => {
    if (
      selectedDevice &&
      (dataMode === "combined" || dataMode === "historical")
    ) {
      console.log(`📊 Fetching historical data for device: ${selectedDevice}`);
      fetchHistoricalData(selectedDevice, Number.parseInt(dataLimit, 10));
    }
  }, [selectedDevice, dataLimit, fetchHistoricalData, dataMode]);

  // Reset chart update counter when device changes
  useEffect(() => {
    chartUpdateCountRef.current = 0;
    lastSocketDataRef.current = null;
  }, [selectedDevice]);

  // Enhanced Device Select Component
  const EnhancedDeviceSelect = useMemo(
    () => (
      <Select value={selectedDevice} onValueChange={setSelectedDevice}>
        <SelectTrigger className="w-64 transition-all duration-200 hover:shadow-sm">
          <SelectValue placeholder="Select Device" />
        </SelectTrigger>
        <SelectContent>
          {deviceList.map((device) => {
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
    ),
    [deviceList, selectedDevice]
  );

  // Enhanced statistics calculation
  const statistics = useMemo(() => {
    if (chartData.length < 1) return null;

    const values = chartData
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

    const dataStats = getDataStats(selectedDevice);

    return {
      latest,
      change,
      changePercent,
      min: Math.min(...values),
      max: Math.max(...values),
      avg: values.reduce((sum, v) => sum + v, 0) / values.length,
      dataPoints: chartData.length,
      historicalPoints: historicalData[selectedDevice]?.length || 0,
      hasRealtime: hasRealtimeData,
      hasHistorical: (historicalData[selectedDevice]?.length || 0) > 0,
      lastHistoricalUpdate: dataStats.lastUpdate,
      lastRealtimeUpdate: realtimeData?.timestamp,
      dataMode,
      deviceInfo: dataStats.deviceInfo,
      dataStructure: dataStats.dataStructure,
      updateCount: chartUpdateCountRef.current,
      lastChartUpdate: lastUpdateTime,
    };
  }, [
    chartData,
    historicalData,
    selectedDevice,
    hasRealtimeData,
    realtimeData,
    getDataStats,
    dataMode,
    lastUpdateTime,
  ]);

  // Metric names extraction
  const metricNames = useMemo(() => {
    if (chartData.length === 0) return [];
    const sampleData = chartData[0];
    return Object.keys(sampleData).filter((key) => key !== "timestamp");
  }, [chartData]);

  // Chart colors computation
  const chartColors = useMemo(() => {
    if (!selectedDeviceObj) return ["#3B82F6"];

    const dataStructure = dataStructures[selectedDevice];
    if (dataStructure?.color) {
      return [
        dataStructure.color,
        `${dataStructure.color}80`,
        `${dataStructure.color}60`,
      ];
    }

    return getDeviceGradient(selectedDeviceObj.type);
  }, [selectedDeviceObj, selectedDevice, dataStructures]);

  // Sync handlers
  const handleForceSync = useCallback(async () => {
    if (!selectedDevice) return;
    try {
      console.log(`🔄 Force syncing device: ${selectedDevice}`);
      await forceSync();
    } catch (error) {
      console.error(`❌ Failed to sync device ${selectedDevice}:`, error);
    }
  }, [selectedDevice, forceSync]);

  const handleRefreshHistorical = useCallback(async () => {
    if (!selectedDevice) return;
    try {
      console.log(
        `🔄 Refreshing historical data for device: ${selectedDevice}`
      );
      await refreshHistoricalData(selectedDevice);
    } catch (error) {
      console.error(
        `❌ Failed to refresh historical data for ${selectedDevice}:`,
        error
      );
    }
  }, [selectedDevice, refreshHistoricalData]);

  const handleToggleRealTime = useCallback(() => {
    setIsRealTimeEnabled(!isRealTimeEnabled);
    console.log(
      `🔄 Real-time updates ${!isRealTimeEnabled ? "enabled" : "disabled"}`
    );
  }, [isRealTimeEnabled]);

  const handleResetChart = useCallback(() => {
    chartUpdateCountRef.current = 0;
    lastSocketDataRef.current = null;
    setChartData([]);
    console.log("🔄 Chart data reset");
  }, []);

  // Device icon and color
  const selectedDeviceIcon = useMemo(() => {
    if (!selectedDeviceObj) return null;
    const IconComponent = getDeviceIcon(selectedDeviceObj.type);
    const dataStructure = dataStructures[selectedDevice];
    const deviceColor =
      dataStructure?.color || getDeviceColor(selectedDeviceObj.type);
    return { IconComponent, deviceColor };
  }, [selectedDeviceObj, selectedDevice, dataStructures]);

  return (
    <div className="space-y-6">
      {/* Enhanced Header Card with Real-time Controls */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200 dark:border-blue-800">
        <CardHeader className="pb-4">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                <History className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <CardTitle className="text-xl text-blue-900 dark:text-blue-100 flex items-center gap-2">
                  Real-time Historical Analytics
                  {isRealTimeEnabled && (
                    <Badge variant="default" className="text-xs animate-pulse">
                      LIVE
                    </Badge>
                  )}
                </CardTitle>
                <div className="flex items-center gap-4 text-sm text-blue-600 dark:text-blue-300">
                  <span>Database + Socket Integration</span>
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
                  {statistics?.updateCount && (
                    <Badge variant="outline" className="text-xs">
                      Updates: {statistics.updateCount}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Device Selection */}
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-muted-foreground" />
                {EnhancedDeviceSelect}
              </div>

              {/* Real-time Control */}
              <div className="flex items-center gap-2">
                <Button
                  variant={isRealTimeEnabled ? "default" : "outline"}
                  size="sm"
                  onClick={handleToggleRealTime}
                  className="flex items-center gap-2"
                >
                  {isRealTimeEnabled ? (
                    <Pause className="w-4 h-4" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                  {isRealTimeEnabled ? "Pause Live" : "Start Live"}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResetChart}
                  className="flex items-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reset
                </Button>
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

              {/* Data Limit Selection */}
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
                </div>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Real-time Status Cards */}
      {selectedDevice && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                    {isRealTimeEnabled && hasRealtimeData && (
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    )}
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

          {/* Chart Update Status */}
          <Card className="border-l-4 border-l-purple-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Activity className="w-4 h-4 text-purple-500" />
                    <h4 className="font-medium">Chart Updates</h4>
                    {isRealTimeEnabled && (
                      <Badge
                        variant="outline"
                        className="text-xs animate-pulse"
                      >
                        Live Mode
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Updates:{" "}
                    <span className="font-medium">
                      {statistics?.updateCount || 0}
                    </span>
                  </p>
                  {statistics?.lastChartUpdate && (
                    <p className="text-xs text-muted-foreground">
                      Last:{" "}
                      {new Date(
                        statistics.lastChartUpdate
                      ).toLocaleTimeString()}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-purple-600">
                    {chartData.length}
                  </div>
                  <div className="text-xs text-muted-foreground">Points</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

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
                  <div className="flex gap-1 mt-1">
                    <Badge variant="outline" className="text-xs">
                      {statistics.dataMode}
                    </Badge>
                    {isRealTimeEnabled && hasRealtimeData && (
                      <Badge
                        variant="default"
                        className="text-xs animate-pulse"
                      >
                        LIVE
                      </Badge>
                    )}
                  </div>
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
                  <Badge variant="outline" className="text-xs">
                    Updates: {statistics.updateCount}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Enhanced Main Chart with Real-time Indicators */}
      {selectedDeviceObj && (
        <Card className="overflow-hidden">
          <CardHeader className="pb-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {selectedDeviceIcon && (
                  <div
                    className="p-3 rounded-lg"
                    style={{
                      backgroundColor: `${selectedDeviceIcon.deviceColor}20`,
                    }}
                  >
                    <selectedDeviceIcon.IconComponent
                      className="w-6 h-6"
                      style={{ color: selectedDeviceIcon.deviceColor }}
                    />
                  </div>
                )}
                <div>
                  <CardTitle className="text-xl flex items-center gap-2">
                    {statistics?.deviceInfo?.name || selectedDeviceObj.name}
                    <DeviceStatusIndicator deviceId={selectedDevice} />
                    {isRealTimeEnabled && (
                      <Badge
                        variant="default"
                        className="text-xs animate-pulse"
                      >
                        LIVE CHART
                      </Badge>
                    )}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {statistics?.deviceInfo?.type ||
                      selectedDeviceObj.type.replace(/_/g, " ")}{" "}
                    - {dataMode} Analysis
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
                {isRealTimeEnabled && (
                  <Badge variant="default" className="text-xs animate-pulse">
                    UPDATING
                  </Badge>
                )}
                {(isLoadingHistorical || isSyncing) && (
                  <Badge variant="outline" className="text-xs animate-pulse">
                    Loading...
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6">
            {chartData.length > 0 ? (
              <div className="w-full">
                <DataChart
                  title=""
                  description=""
                  data={chartData}
                  type={chartType}
                  colors={chartColors}
                  className="w-full h-[500px]"
                />
                <div className="mt-4 text-center space-y-2">
                  <div className="flex items-center justify-center gap-4 text-xs">
                    <Badge variant="secondary">
                      {chartData.length} total points
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
                      Updates: {statistics?.updateCount || 0}
                    </Badge>
                    <Badge variant="outline">
                      Last Update:{" "}
                      {statistics?.lastChartUpdate
                        ? new Date(
                            statistics.lastChartUpdate
                          ).toLocaleTimeString()
                        : "Never"}
                    </Badge>
                    {isRealTimeEnabled && (
                      <Badge variant="default" className="animate-pulse">
                        Real-time Mode
                      </Badge>
                    )}
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

      {/* Metrics Legend with Real-time Status */}
      {selectedDevice && metricNames.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Metrics Legend
              <Badge variant="outline" className="text-xs">
                {dataMode} mode
              </Badge>
              {isRealTimeEnabled && (
                <Badge variant="default" className="text-xs animate-pulse">
                  Live Updates
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {metricNames.map((metric, index) => {
                const color =
                  chartColors[Math.min(index, chartColors.length - 1)];
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
                    {isRealTimeEnabled && hasRealtimeData && (
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Enhanced System Status Footer */}
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
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4" />
                <span>
                  Real-time: {isRealTimeEnabled ? "Enabled" : "Disabled"}
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
              {statistics?.updateCount && (
                <span className="text-blue-500">
                  Chart Updates: {statistics.updateCount}
                </span>
              )}
            </div>
            <div className="text-muted-foreground">
              Last refresh:{" "}
              {statistics?.lastChartUpdate
                ? new Date(statistics.lastChartUpdate).toLocaleTimeString()
                : "Never"}{" "}
              • User: {username}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
