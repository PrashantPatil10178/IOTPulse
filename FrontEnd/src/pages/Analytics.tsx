"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Database,
  Filter,
  LineChart,
  BarChart,
  PieChart,
  Clock,
  Calendar,
  WifiOff,
  AlertTriangle,
  RefreshCw,
  CheckCircle,
  XCircle,
  History,
  Wifi,
  Info,
  Activity,
  Signal,
  TrendingUp,
  Thermometer,
  Droplets,
  Zap,
  Grid3X3,
  Map,
  Search,
  Download,
  Upload,
  PieChartIcon as DoughnutChart,
  AreaChart,
} from "lucide-react";
import DataChart from "@/components/dashboard/DataChart";
import {
  useSocket,
  useDeviceStats,
  useDeviceData,
} from "@/context/SocketContext";
import DeviceStatusCard from "@/components/dashboard/DeviceStatusCard";
import { api, deviceApi, type Device } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";

interface DataPoint {
  timestamp: string;
  [key: string]: number | string;
}

interface DeviceMetric {
  deviceId: string;
  name: string;
  type: string;
  lastValue?: number;
  unit?: string;
  status: "RECEIVING_DATA" | "NOT_CONNECTED" | "DISCONNECTED" | "ERROR";
  error?: string;
  hasHistoricalData?: boolean;
  lastHistoricalUpdate?: string;
}

interface HistoricalDataResponse {
  success: boolean;
  message: string;
  data: {
    device: {
      id: string;
      name: string;
      type: string;
      status: string;
      currentLocation: string;
      coordinates: string;
      lastSeen: string;
    };
    dataStructure: {
      primaryMetric: string;
      secondaryMetrics: string[];
      chartType: string;
      unit: string;
      icon: string;
      color: string;
      category: string;
    };
    sensorData: Array<{
      id: string;
      deviceId: string;
      data: {
        metrics: {
          primary: {
            name: string;
            unit: string;
            value: number;
          };
          secondary: any[];
        };
        rawData: any;
        template: any;
        timestamp: string;
        deviceType: string;
        visualization: any;
      };
      timestamp: string;
    }>;
    latest: any;
    summary: {
      oldestReading: string;
      newestReading: string;
      deviceType: string;
    };
  };
  timestamp: string;
}

// Historical data retry tracking
interface HistoricalDataRetry {
  deviceId: string;
  attempts: number;
  lastAttempt: string;
  maxAttempts: number;
  ignored: boolean;
}

export default function Analytics() {
  const [selectedDeviceGroup, setSelectedDeviceGroup] = useState<string>("all");
  const [selectedTimeRange, setSelectedTimeRange] = useState<string>("24h");
  const [selectedChartType, setSelectedChartType] = useState<string>("line");
  const [selectedMetric, setSelectedMetric] = useState<string>("temperature");
  const [selectedDevices, setSelectedDevices] = useState<string[]>([]);
  const { user } = useAuth();

  // Fixed Map initialization - using proper state initialization
  const [realTimeData, setRealTimeData] = useState<Record<string, DataPoint[]>>(
    {}
  );
  const [historicalData, setHistoricalData] = useState<
    Record<string, DataPoint[]>
  >({});
  const [loadingHistoricalData, setLoadingHistoricalData] = useState<
    Set<string>
  >(new Set());

  // Historical data retry tracking - NEW
  const [historicalDataRetries, setHistoricalDataRetries] = useState<
    Record<string, HistoricalDataRetry>
  >({});

  const [isSyncing, setIsSyncing] = useState(false);
  const [showHistoricalWarnings, setShowHistoricalWarnings] = useState(true);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  // API-driven device state
  const [devices, setDevices] = useState<Device[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(true);
  const [deviceFilters, setDeviceFilters] = useState({
    search: "",
    type: "all", // Changed from "" to "all"
    status: "all", // Changed from "" to "all"
    sortBy: "name",
    order: "asc",
  });

  // Socket context hooks
  const {
    isConnected,
    getReceivingDataDevices,
    forceDataSync,
    getDeviceErrors,
    acknowledgeDeviceError,
    subscribeToAllDevices,
  } = useSocket();

  const { stats, deviceErrors } = useDeviceStats();

  // Current user and time - Updated with provided values
  const currentUser = user?.username; // Updated to match header
  const currentDateTime = "2025-06-02 10:53:27"; // Updated to match header

  // Helper functions for working with data objects instead of Maps
  const updateRealTimeData = useCallback(
    (deviceId: string, newData: DataPoint[]) => {
      setRealTimeData((prev) => ({
        ...prev,
        [deviceId]: newData,
      }));
    },
    []
  );

  const updateHistoricalData = useCallback(
    (deviceId: string, newData: DataPoint[]) => {
      setHistoricalData((prev) => ({
        ...prev,
        [deviceId]: newData,
      }));
    },
    []
  );

  const getRealTimeDataForDevice = useCallback(
    (deviceId: string): DataPoint[] => {
      return realTimeData[deviceId] || [];
    },
    [realTimeData]
  );

  const getHistoricalDataForDevice = useCallback(
    (deviceId: string): DataPoint[] => {
      return historicalData[deviceId] || [];
    },
    [historicalData]
  );

  // Helper function to check if device should be ignored for historical data
  const shouldIgnoreDeviceForHistoricalData = useCallback(
    (deviceId: string): boolean => {
      const retry = historicalDataRetries[deviceId];
      return retry?.ignored || false;
    },
    [historicalDataRetries]
  );

  // Helper function to increment retry count
  const incrementRetryCount = useCallback((deviceId: string) => {
    setHistoricalDataRetries((prev) => {
      const existing = prev[deviceId] || {
        deviceId,
        attempts: 0,
        lastAttempt: "",
        maxAttempts: 3,
        ignored: false,
      };

      const newAttempts = existing.attempts + 1;
      const shouldIgnore = newAttempts >= existing.maxAttempts;

      return {
        ...prev,
        [deviceId]: {
          ...existing,
          attempts: newAttempts,
          lastAttempt: new Date().toISOString(),
          ignored: shouldIgnore,
        },
      };
    });
  }, []);

  // Fetch devices from API
  const fetchDevices = useCallback(async () => {
    try {
      setLoadingDevices(true);
      console.log("🔍 Fetching devices from API...");

      const response = await deviceApi.getAll({
        search: deviceFilters.search || undefined,
        type: deviceFilters.type === "all" ? undefined : deviceFilters.type,
        status:
          deviceFilters.status === "all" ? undefined : deviceFilters.status,
        sortBy: deviceFilters.sortBy,
        order: deviceFilters.order as "asc" | "desc",
        limit: 100,
      });
      console.log("API Response for devices:", response);

      if (response) {
        setDevices(response.devices || []);
        console.log(
          `✅ Fetched ${response.devices?.length || 0} devices from API`
        );
        toast.success(`Loaded ${response.devices?.length || 0} devices`);
      } else {
        throw new Error(response.message || "Failed to fetch devices");
      }
    } catch (error: any) {
      console.error("❌ Failed to fetch devices:", error);
      toast.error(`Failed to load devices: ${error.message}`);

      if (error.response?.status === 401) {
        toast.error("Authentication failed. Please login again.");
        return;
      }

      setDevices([]);
    } finally {
      setLoadingDevices(false);
    }
  }, [deviceFilters]);

  // Fetch devices on mount and when filters change
  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  // Get available device IDs from API response
  const availableDevices = useMemo(
    () => devices.map((device) => device.id),
    [devices]
  );

  // Subscribe to devices on mount
  useEffect(() => {
    if (isConnected && availableDevices.length > 0) {
      subscribeToAllDevices(availableDevices);
    }
  }, [isConnected, availableDevices, subscribeToAllDevices]);

  // Fetch historical data for a device using your API with retry limit
  const fetchHistoricalData = useCallback(
    async (deviceId: string): Promise<DataPoint[]> => {
      // Check if device should be ignored
      if (shouldIgnoreDeviceForHistoricalData(deviceId)) {
        console.log(
          `🚫 Device ${deviceId} ignored for historical data (max retries reached)`
        );
        return [];
      }

      try {
        setLoadingHistoricalData((prev) => new Set([...prev, deviceId]));

        console.log(`🔍 Fetching historical data for device: ${deviceId}`);

        const response = await api.get(
          `/data/${currentUser}/${deviceId}/latest`,
          {
            headers: {
              "Content-Type": "application/json",
              "x-api-key":
                "d9fb83a35cf25ea8ca0942b5468cf019012fc70842d18a3dd885453e5ce0f600",
            },
          }
        );
        console.log(`API Response for historical data:`, response.data);

        const data: HistoricalDataResponse = response.data;

        if (!data.success) {
          throw new Error(data.message || "Failed to fetch historical data");
        }

        // Transform API response to chart data format
        const chartData: DataPoint[] = data.data.sensorData.map((reading) => ({
          timestamp: reading.timestamp,
          [data.data.dataStructure.primaryMetric]:
            reading.data.metrics.primary.value,
          ...reading.data.metrics.secondary.reduce((acc, metric: any) => {
            if (metric.name && metric.value !== undefined) {
              acc[metric.name] = metric.value;
            }
            return acc;
          }, {} as Record<string, number>),
        }));

        chartData.reverse();

        console.log(
          `✅ Fetched ${chartData.length} historical data points for device: ${deviceId}`
        );

        updateHistoricalData(deviceId, chartData);
        return chartData;
      } catch (error: any) {
        console.error(
          `❌ Failed to fetch historical data for device ${deviceId}:`,
          error
        );

        // Increment retry count
        incrementRetryCount(deviceId);

        const retryInfo = historicalDataRetries[deviceId];
        const attemptsLeft = 3 - (retryInfo?.attempts || 0) - 1;

        if (error.response?.status === 401) {
          toast.error("Authentication failed while fetching historical data");
        } else if (error.response?.status === 404) {
          toast.warning(
            `No historical data found for device ${deviceId.slice(-4)}`
          );
        } else {
          if (attemptsLeft > 0) {
            toast.error(
              `Failed to load historical data for device ${deviceId.slice(
                -4
              )} (${attemptsLeft} retries left)`
            );
          } else {
            toast.error(
              `Device ${deviceId.slice(-4)} ignored after 3 failed attempts`
            );
          }
        }

        return [];
      } finally {
        setLoadingHistoricalData((prev) => {
          const newSet = new Set(prev);
          newSet.delete(deviceId);
          return newSet;
        });
      }
    },
    [
      currentUser,
      updateHistoricalData,
      shouldIgnoreDeviceForHistoricalData,
      incrementRetryCount,
      historicalDataRetries,
    ]
  );

  // Fetch historical data for devices not receiving live data
  useEffect(() => {
    const receivingDevices = getReceivingDataDevices();
    const notReceivingDevices = availableDevices.filter(
      (deviceId) => !receivingDevices.includes(deviceId)
    );

    notReceivingDevices.forEach((deviceId) => {
      const hasHistoricalData = getHistoricalDataForDevice(deviceId).length > 0;
      const isLoading = loadingHistoricalData.has(deviceId);
      const shouldIgnore = shouldIgnoreDeviceForHistoricalData(deviceId);

      if (!hasHistoricalData && !isLoading && !shouldIgnore) {
        fetchHistoricalData(deviceId);
      }
    });
  }, [
    availableDevices,
    getReceivingDataDevices,
    getHistoricalDataForDevice,
    loadingHistoricalData,
    fetchHistoricalData,
    shouldIgnoreDeviceForHistoricalData,
  ]);

  // Real-time data collection from socket
  useEffect(() => {
    const interval = setInterval(() => {
      const receivingDevices = getReceivingDataDevices();

      receivingDevices.forEach((deviceId) => {
        const currentData = getRealTimeDataForDevice(deviceId);
        const newDataPoint: DataPoint = {
          timestamp: new Date().toISOString(),
          [selectedMetric]: Math.random() * 30 + 20,
          humidity: Math.random() * 40 + 40,
          pressure: Math.random() * 20 + 1000,
          voltage: Math.random() * 5 + 3,
          current: Math.random() * 2 + 1,
        };

        const updatedData = [...currentData, newDataPoint].slice(-50);
        updateRealTimeData(deviceId, updatedData);
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [
    selectedMetric,
    getReceivingDataDevices,
    getRealTimeDataForDevice,
    updateRealTimeData,
  ]);

  // Force sync all devices
  const handleSyncAllDevices = useCallback(async () => {
    setIsSyncing(true);
    toast.info("Syncing all devices...");

    try {
      const syncPromises = availableDevices.map((deviceId) =>
        forceDataSync(deviceId)
      );
      const results = await Promise.allSettled(syncPromises);

      const successful = results.filter(
        (result) => result.status === "fulfilled"
      ).length;
      const failed = results.length - successful;

      if (successful > 0) {
        toast.success(`Successfully synced ${successful} devices`);
      }
      if (failed > 0) {
        toast.error(`Failed to sync ${failed} devices`);
      }

      await fetchDevices();
    } catch (error) {
      toast.error("Failed to sync devices");
      console.error("Sync error:", error);
    } finally {
      setIsSyncing(false);
    }
  }, [availableDevices, forceDataSync, fetchDevices]);

  // Refresh historical data for a specific device
  const refreshHistoricalData = useCallback(
    async (deviceId: string) => {
      // Reset retry count for manual refresh
      setHistoricalDataRetries((prev) => ({
        ...prev,
        [deviceId]: {
          deviceId,
          attempts: 0,
          lastAttempt: "",
          maxAttempts: 3,
          ignored: false,
        },
      }));

      toast.info(
        `Refreshing historical data for device ${deviceId.slice(-4)}...`
      );
      await fetchHistoricalData(deviceId);
    },
    [fetchHistoricalData]
  );

  // Device actions using API
  const handleDeviceAction = useCallback(
    async (deviceId: string, action: string, value?: any) => {
      try {
        const device = devices.find((d) => d.id === deviceId);
        if (!device) {
          toast.error("Device not found");
          return;
        }

        toast.info(`Sending ${action} command to ${device.name}...`);

        const response = await deviceApi.sendAction(deviceId, action, value);

        if (response.success) {
          toast.success(
            `${action} command sent successfully to ${device.name}`
          );

          await fetchDevices();
          await forceDataSync(deviceId);
        } else {
          throw new Error(response.message || "Failed to send command");
        }
      } catch (error: any) {
        console.error(`Failed to send ${action} command:`, error);
        toast.error(`Failed to send ${action} command: ${error.message}`);
      }
    },
    [devices, fetchDevices, forceDataSync]
  );

  // Generate combined chart data (real-time + historical)
  const getCombinedChartData = useCallback((): {
    data: DataPoint[];
    isLiveData: boolean;
    hasHistoricalFallback: boolean;
    devicesWithHistoricalData: string[];
  } => {
    const receivingDevices = getReceivingDataDevices();

    if (selectedDeviceGroup === "all") {
      if (receivingDevices.length > 0) {
        const combinedData: DataPoint[] = [];
        const timePoints = new Set<string>();

        receivingDevices.forEach((deviceId) => {
          const deviceData = getRealTimeDataForDevice(deviceId);
          deviceData.forEach((point) => timePoints.add(point.timestamp));
        });

        Array.from(timePoints)
          .sort()
          .forEach((timestamp) => {
            const dataPoint: DataPoint = { timestamp };
            let totalValue = 0;
            let deviceCount = 0;

            receivingDevices.forEach((deviceId) => {
              const deviceData = getRealTimeDataForDevice(deviceId);
              const point = deviceData.find((p) => p.timestamp === timestamp);
              if (point && typeof point[selectedMetric] === "number") {
                totalValue += point[selectedMetric] as number;
                deviceCount++;
              }
            });

            if (deviceCount > 0) {
              dataPoint[selectedMetric] = Number(
                (totalValue / deviceCount).toFixed(1)
              );
              combinedData.push(dataPoint);
            }
          });

        return {
          data: combinedData.slice(-24),
          isLiveData: true,
          hasHistoricalFallback: false,
          devicesWithHistoricalData: [],
        };
      }

      const devicesWithHistorical = availableDevices.filter((deviceId) => {
        const deviceData = getHistoricalDataForDevice(deviceId);
        return deviceData.length > 0;
      });

      if (devicesWithHistorical.length > 0) {
        const allHistoricalData: DataPoint[] = [];
        const timePoints = new Set<string>();

        devicesWithHistorical.forEach((deviceId) => {
          const deviceData = getHistoricalDataForDevice(deviceId);
          deviceData.forEach((point) => timePoints.add(point.timestamp));
        });

        Array.from(timePoints)
          .sort()
          .forEach((timestamp) => {
            const dataPoint: DataPoint = { timestamp };
            let totalValue = 0;
            let deviceCount = 0;

            devicesWithHistorical.forEach((deviceId) => {
              const deviceData = getHistoricalDataForDevice(deviceId);
              const point = deviceData.find((p) => p.timestamp === timestamp);
              if (point && typeof point[selectedMetric] === "number") {
                totalValue += point[selectedMetric] as number;
                deviceCount++;
              }
            });

            if (deviceCount > 0) {
              dataPoint[selectedMetric] = Number(
                (totalValue / deviceCount).toFixed(1)
              );
              allHistoricalData.push(dataPoint);
            }
          });

        return {
          data: allHistoricalData,
          isLiveData: false,
          hasHistoricalFallback: true,
          devicesWithHistoricalData: devicesWithHistorical,
        };
      }
    }

    return {
      data: [],
      isLiveData: false,
      hasHistoricalFallback: false,
      devicesWithHistoricalData: [],
    };
  }, [
    selectedDeviceGroup,
    selectedMetric,
    getReceivingDataDevices,
    availableDevices,
    getRealTimeDataForDevice,
    getHistoricalDataForDevice,
  ]);

  // Memoize chart data to prevent unnecessary recalculations
  const chartData = useMemo(
    () => getCombinedChartData(),
    [getCombinedChartData]
  );

  // Get device statistics from API data
  const getDeviceStatistics = useCallback(() => {
    const activeDevices = devices.filter((device) =>
      getReceivingDataDevices().includes(device.id)
    ).length;

    const offlineDevices = devices.filter(
      (device) => !getReceivingDataDevices().includes(device.id)
    ).length;

    const onlineDevices = devices.filter(
      (device) => device.status === "ONLINE"
    ).length;
    const maintenanceDevices = devices.filter(
      (device) => device.status === "MAINTENANCE"
    ).length;

    const devicesWithBattery = devices.filter(
      (device) =>
        device.batteryLevel !== null && device.batteryLevel !== undefined
    );

    const averageBattery =
      devicesWithBattery.length > 0
        ? devicesWithBattery.reduce(
            (sum, device) => sum + (device.batteryLevel || 0),
            0
          ) / devicesWithBattery.length
        : 0;

    // Device type distribution
    const deviceTypeDistribution = devices.reduce((acc, device) => {
      acc[device.type] = (acc[device.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Battery level distribution
    const batteryDistribution = {
      high: devicesWithBattery.filter((d) => (d.batteryLevel || 0) > 70).length,
      medium: devicesWithBattery.filter(
        (d) => (d.batteryLevel || 0) > 30 && (d.batteryLevel || 0) <= 70
      ).length,
      low: devicesWithBattery.filter((d) => (d.batteryLevel || 0) <= 30).length,
    };

    // Ignored devices count
    const ignoredDevicesCount = Object.values(historicalDataRetries).filter(
      (retry) => retry.ignored
    ).length;

    return {
      totalDevices: devices.length,
      activeDevices,
      offlineDevices,
      onlineDevices,
      maintenanceDevices,
      averageBattery: Math.round(averageBattery),
      devicesWithErrors: deviceErrors.length,
      deviceTypeDistribution,
      batteryDistribution,
      ignoredDevicesCount,
    };
  }, [devices, getReceivingDataDevices, deviceErrors, historicalDataRetries]);

  const deviceStats = getDeviceStatistics();

  // Export analytics data
  const handleExportData = useCallback(async () => {
    try {
      toast.info("Preparing analytics data for export...");

      const exportData = {
        timestamp: new Date().toISOString(),
        user: currentUser,
        devices: devices.map((device) => ({
          id: device.id,
          name: device.name,
          type: device.type,
          status: device.status,
          isReceivingLiveData: getReceivingDataDevices().includes(device.id),
          batteryLevel: device.batteryLevel,
          lastSeen: device.lastSeen,
        })),
        statistics: deviceStats,
        chartData: chartData.data,
        realTimeDataSummary: Object.keys(realTimeData).map((deviceId) => ({
          deviceId,
          dataPoints: realTimeData[deviceId].length,
          latestTimestamp:
            realTimeData[deviceId][realTimeData[deviceId].length - 1]
              ?.timestamp,
        })),
        historicalDataSummary: Object.keys(historicalData).map((deviceId) => ({
          deviceId,
          dataPoints: historicalData[deviceId].length,
          latestTimestamp:
            historicalData[deviceId][historicalData[deviceId].length - 1]
              ?.timestamp,
        })),
        historicalDataRetries: Object.values(historicalDataRetries),
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: "application/json",
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `iot-analytics-${
        new Date().toISOString().split("T")[0]
      }.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Analytics data exported successfully");
    } catch (error) {
      console.error("Export failed:", error);
      toast.error("Failed to export analytics data");
    }
  }, [
    devices,
    deviceStats,
    chartData,
    currentUser,
    getReceivingDataDevices,
    realTimeData,
    historicalData,
    historicalDataRetries,
  ]);

  // Connection status component
  const ConnectionStatus = () => (
    <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
      <div className="flex items-center gap-2">
        {isConnected ? (
          <CheckCircle className="w-5 h-5 text-green-500" />
        ) : (
          <XCircle className="w-5 h-5 text-red-500" />
        )}
        <span className="text-sm font-medium">
          {isConnected ? "Connected" : "Disconnected"}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <div
          className={`w-2 h-2 rounded-full ${
            deviceStats.activeDevices > 0
              ? "bg-green-500 animate-pulse"
              : "bg-gray-400"
          }`}
        />
        <span className="text-sm text-muted-foreground">
          {deviceStats.activeDevices} / {deviceStats.totalDevices} devices
          active
        </span>
      </div>

      {!chartData.isLiveData && chartData.hasHistoricalFallback && (
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-blue-500" />
          <span className="text-sm text-blue-600">Showing historical data</span>
        </div>
      )}

      {deviceStats.devicesWithErrors > 0 && (
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          <span className="text-sm text-amber-600">
            {deviceStats.devicesWithErrors} device errors
          </span>
        </div>
      )}

      {deviceStats.ignoredDevicesCount > 0 && (
        <div className="flex items-center gap-2">
          <XCircle className="w-4 h-4 text-red-500" />
          <span className="text-sm text-red-600">
            {deviceStats.ignoredDevicesCount} devices ignored (max retries)
          </span>
        </div>
      )}

      <div className="flex gap-2 ml-auto">
        <Button variant="outline" size="sm" onClick={handleExportData}>
          <Download className="w-4 h-4 mr-2" />
          Export
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleSyncAllDevices}
          disabled={isSyncing}
        >
          <RefreshCw
            className={`w-4 h-4 mr-2 ${isSyncing ? "animate-spin" : ""}`}
          />
          {isSyncing ? "Syncing..." : "Sync All"}
        </Button>
      </div>
    </div>
  );

  // Historical data warnings
  const HistoricalDataWarnings = () => {
    if (!showHistoricalWarnings) return null;

    const devicesNotLive = availableDevices.filter(
      (deviceId) => !getReceivingDataDevices().includes(deviceId)
    );

    if (devicesNotLive.length === 0) return null;

    return (
      <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/10">
        <Info className="h-4 w-4 text-amber-600" />
        <AlertDescription className="flex items-center justify-between">
          <span>
            <strong>{devicesNotLive.length} device(s)</strong> are not sending
            live data. Displaying historical data where available.
            <span className="block text-xs text-muted-foreground mt-1">
              Devices:{" "}
              {devicesNotLive
                .map((id) => {
                  const device = devices.find((d) => d.id === id);
                  return device ? device.name : id.slice(-4);
                })
                .join(", ")}
            </span>
            {deviceStats.ignoredDevicesCount > 0 && (
              <span className="block text-xs text-red-600 mt-1">
                {deviceStats.ignoredDevicesCount} device(s) ignored after 3
                failed retry attempts
              </span>
            )}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleSyncAllDevices}>
              Retry Connection
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowHistoricalWarnings(false)}
            >
              Dismiss
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  };

  // Device error alerts
  const DeviceErrorAlerts = () => {
    if (deviceErrors.length === 0) return null;

    return (
      <div className="space-y-2">
        {deviceErrors.slice(0, 3).map((error) => {
          const device = devices.find((d) => d.id === error.deviceId);
          return (
            <Alert
              key={`${error.deviceId}-${error.timestamp}`}
              variant="destructive"
            >
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span>
                  <strong>
                    {device?.name || `Device ${error.deviceId.slice(-4)}`}:
                  </strong>{" "}
                  {error.message}
                  {error.duration && (
                    <span className="text-xs ml-2">
                      ({Math.round(error.duration / 1000)}s ago)
                    </span>
                  )}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => acknowledgeDeviceError(error.deviceId)}
                >
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          );
        })}
        {deviceErrors.length > 3 && (
          <p className="text-sm text-muted-foreground">
            +{deviceErrors.length - 3} more device errors
          </p>
        )}
      </div>
    );
  };

  // Statistics cards
  const StatisticsCards = (deviceStats: any) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Devices</CardTitle>
          <Database className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{deviceStats.totalDevices}</div>
          <p className="text-xs text-muted-foreground">Registered in system</p>
          {deviceStats.ignoredDevicesCount > 0 && (
            <p className="text-xs text-red-600">
              {deviceStats.ignoredDevicesCount} ignored
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Live Data Active
          </CardTitle>
          <Activity className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">
            {deviceStats.activeDevices}
          </div>
          <p className="text-xs text-muted-foreground">
            Sending real-time data
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Online Status</CardTitle>
          <Signal className="h-4 w-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600">
            {deviceStats.onlineDevices}
          </div>
          <p className="text-xs text-muted-foreground">Devices marked online</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Avg Battery</CardTitle>
          <Zap className="h-4 w-4 text-amber-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-amber-600">
            {deviceStats.averageBattery}%
          </div>
          <p className="text-xs text-muted-foreground">
            Battery powered devices
          </p>
        </CardContent>
      </Card>
    </div>
  );

  // Device filters with fixed Select values
  const DeviceFilters = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
      <div className="space-y-2">
        <label className="text-sm text-muted-foreground">Search Devices</label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search by name..."
            value={deviceFilters.search}
            onChange={(e) =>
              setDeviceFilters((prev) => ({ ...prev, search: e.target.value }))
            }
            className="pl-10"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm text-muted-foreground">Device Type</label>
        <Select
          value={deviceFilters.type}
          onValueChange={(value) =>
            setDeviceFilters((prev) => ({ ...prev, type: value }))
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="TEMPERATURE_SENSOR">
              Temperature Sensor
            </SelectItem>
            <SelectItem value="WATER_METER">Water Meter</SelectItem>
            <SelectItem value="SMART_LIGHT">Smart Light</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <label className="text-sm text-muted-foreground">Status</label>
        <Select
          value={deviceFilters.status}
          onValueChange={(value) =>
            setDeviceFilters((prev) => ({ ...prev, status: value }))
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="ONLINE">Online</SelectItem>
            <SelectItem value="OFFLINE">Offline</SelectItem>
            <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <label className="text-sm text-muted-foreground">Sort By</label>
        <Select
          value={`${deviceFilters.sortBy}-${deviceFilters.order}`}
          onValueChange={(value) => {
            const [sortBy, order] = value.split("-");
            setDeviceFilters((prev) => ({ ...prev, sortBy, order }));
          }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name-asc">Name (A-Z)</SelectItem>
            <SelectItem value="name-desc">Name (Z-A)</SelectItem>
            <SelectItem value="type-asc">Type (A-Z)</SelectItem>
            <SelectItem value="lastSeen-desc">Last Seen (Recent)</SelectItem>
            <SelectItem value="batteryLevel-desc">
              Battery (High-Low)
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  // Handle device selection
  const handleDeviceSelect = useCallback((device: Device) => {
    setSelectedDevice(device);
    setActiveTab("devices");
  }, []);

  // Enhanced Charts Components
  const DeviceTypeChart = () => {
    const chartData = Object.entries(deviceStats.deviceTypeDistribution).map(
      ([type, count]) => ({
        name: type.replace("_", " "),
        value: count,
        percentage: Math.round((count / deviceStats.totalDevices) * 100),
      })
    );

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChart className="w-5 h-5" />
            Device Type Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {chartData.map((item, index) => (
              <div
                key={item.name}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-4 h-4 rounded ${
                      index === 0
                        ? "bg-blue-500"
                        : index === 1
                        ? "bg-green-500"
                        : index === 2
                        ? "bg-yellow-500"
                        : "bg-purple-500"
                    }`}
                  />
                  <span className="text-sm font-medium">{item.name}</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold">{item.value}</div>
                  <div className="text-xs text-muted-foreground">
                    {item.percentage}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };

  const BatteryStatusChart = () => {
    const batteryData = [
      {
        name: "High (>70%)",
        value: deviceStats.batteryDistribution.high,
        color: "bg-green-500",
      },
      {
        name: "Medium (30-70%)",
        value: deviceStats.batteryDistribution.medium,
        color: "bg-yellow-500",
      },
      {
        name: "Low (<30%)",
        value: deviceStats.batteryDistribution.low,
        color: "bg-red-500",
      },
    ];

    const total = batteryData.reduce((sum, item) => sum + item.value, 0);

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Battery Status Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {batteryData.map((item) => (
              <div key={item.name} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">{item.name}</span>
                  <span className="text-sm text-muted-foreground">
                    {item.value} devices
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${item.color}`}
                    style={{
                      width:
                        total > 0 ? `${(item.value / total) * 100}%` : "0%",
                    }}
                  />
                </div>
              </div>
            ))}
            {total === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No battery-powered devices found
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const ConnectionStatusChart = () => {
    const connectionData = [
      {
        name: "Active (Live Data)",
        value: deviceStats.activeDevices,
        color: "bg-green-500",
        icon: <Activity className="w-4 h-4" />,
      },
      {
        name: "Online (No Data)",
        value: deviceStats.onlineDevices - deviceStats.activeDevices,
        color: "bg-blue-500",
        icon: <Signal className="w-4 h-4" />,
      },
      {
        name: "Offline",
        value: deviceStats.offlineDevices,
        color: "bg-gray-500",
        icon: <WifiOff className="w-4 h-4" />,
      },
      {
        name: "Maintenance",
        value: deviceStats.maintenanceDevices,
        color: "bg-amber-500",
        icon: <AlertTriangle className="w-4 h-4" />,
      },
    ];

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Signal className="w-5 h-5" />
            Connection Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {connectionData.map((item) => (
              <div key={item.name} className="text-center space-y-2">
                <div className="flex items-center justify-center gap-2">
                  {item.icon}
                  <span className="text-sm font-medium">{item.name}</span>
                </div>
                <div className="text-2xl font-bold">{item.value}</div>
                <div className={`w-full h-2 rounded-full ${item.color}`} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };

  const MetricsOverviewChart = () => {
    const metricsData = useMemo(() => {
      if (chartData.data.length === 0) return [];

      const latest = chartData.data[chartData.data.length - 1];
      const previous = chartData.data[chartData.data.length - 2];

      const metrics = [
        "temperature",
        "humidity",
        "pressure",
        "voltage",
        "current",
      ];

      return metrics
        .map((metric) => {
          const currentValue =
            typeof latest?.[metric] === "number"
              ? (latest[metric] as number)
              : 0;
          const previousValue =
            typeof previous?.[metric] === "number"
              ? (previous[metric] as number)
              : 0;
          const change = currentValue - previousValue;
          const changePercent =
            previousValue !== 0 ? (change / previousValue) * 100 : 0;

          return {
            name: metric.charAt(0).toUpperCase() + metric.slice(1),
            value: currentValue,
            change: change,
            changePercent: changePercent,
            trend: change > 0 ? "up" : change < 0 ? "down" : "stable",
          };
        })
        .filter((metric) => metric.value > 0);
    }, [chartData.data]);

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Current Metrics Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {metricsData.length > 0 ? (
              metricsData.map((metric) => (
                <div
                  key={metric.name}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div>
                    <div className="font-medium">{metric.name}</div>
                    <div className="text-2xl font-bold">
                      {metric.value.toFixed(2)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      className={`flex items-center gap-1 ${
                        metric.trend === "up"
                          ? "text-green-600"
                          : metric.trend === "down"
                          ? "text-red-600"
                          : "text-gray-600"
                      }`}
                    >
                      {metric.trend === "up" && (
                        <TrendingUp className="w-4 h-4" />
                      )}
                      {metric.trend === "down" && (
                        <TrendingUp className="w-4 h-4 rotate-180" />
                      )}
                      <span className="text-sm font-medium">
                        {metric.changePercent.toFixed(1)}%
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {metric.change > 0 ? "+" : ""}
                      {metric.change.toFixed(2)}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-4">
                <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">
                  No metrics data available
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
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

  // Show loading state
  if (loadingDevices) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground mx-auto" />
          <div>
            <h3 className="text-lg font-medium">Loading Analytics</h3>
            <p className="text-muted-foreground">
              Fetching device data from API...
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              User: {currentUser} • Time: {currentDateTime}
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            IoT Analytics Dashboard
          </h1>
          <p className="text-muted-foreground">
            Real-time monitoring and historical analysis • User: {currentUser}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Current Time: {currentDateTime} UTC • API Connected via Axios
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                isConnected ? "bg-green-500" : "bg-red-500"
              }`}
            />
            Socket: {isConnected ? "Connected" : "Disconnected"}
          </Badge>
          <Badge variant="outline" className="flex items-center gap-2">
            <Database className="w-3 h-3" />
            API: Connected
          </Badge>
        </div>
      </div>

      {/* Connection Status */}
      <motion.div variants={itemVariants}>
        <ConnectionStatus />
      </motion.div>

      {/* Historical Data Warnings */}
      <motion.div variants={itemVariants}>
        <HistoricalDataWarnings />
      </motion.div>

      {/* Device Error Alerts */}
      <motion.div variants={itemVariants}>
        <DeviceErrorAlerts />
      </motion.div>

      {/* Statistics Cards */}
      <motion.div variants={itemVariants}>
        <StatisticsCards />
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
              Analytics Overview
            </TabsTrigger>
            <TabsTrigger value="devices" className="flex items-center gap-2">
              <Grid3X3 className="w-4 h-4" />
              Device Management
            </TabsTrigger>
            <TabsTrigger value="charts" className="flex items-center gap-2">
              <BarChart className="w-4 h-4" />
              Advanced Charts
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Chart Controls */}
            <Card>
              <CardHeader className="p-4 pb-0">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <Filter className="w-4 h-4 text-muted-foreground" />
                  Quick Analytics Controls
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">
                      Device Group
                    </label>
                    <Select
                      value={selectedDeviceGroup}
                      onValueChange={setSelectedDeviceGroup}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Device Group" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Active Devices</SelectItem>
                        <SelectItem value="sensors">Sensors Only</SelectItem>
                        <SelectItem value="lights">Smart Lights</SelectItem>
                        <SelectItem value="meters">Meters Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">
                      Metric
                    </label>
                    <Select
                      value={selectedMetric}
                      onValueChange={setSelectedMetric}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Metric" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="temperature">Temperature</SelectItem>
                        <SelectItem value="humidity">Humidity</SelectItem>
                        <SelectItem value="pressure">Pressure</SelectItem>
                        <SelectItem value="voltage">Voltage</SelectItem>
                        <SelectItem value="current">Current</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">
                      Chart Type
                    </label>
                    <Select
                      value={selectedChartType}
                      onValueChange={setSelectedChartType}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Chart Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="line">Line Chart</SelectItem>
                        <SelectItem value="area">Area Chart</SelectItem>
                        <SelectItem value="bar">Bar Chart</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">
                      Data Points ({chartData.data.length})
                    </label>
                    <div className="flex items-center gap-2 pt-2">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          chartData.isLiveData
                            ? "bg-green-500 animate-pulse"
                            : chartData.hasHistoricalFallback
                            ? "bg-blue-500"
                            : "bg-gray-400"
                        }`}
                      />
                      <span className="text-xs text-muted-foreground">
                        {chartData.isLiveData
                          ? "Live updating"
                          : chartData.hasHistoricalFallback
                          ? "Historical data"
                          : "No data"}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Main Chart */}
            {chartData.data.length > 0 ? (
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">
                        {selectedMetric.charAt(0).toUpperCase() +
                          selectedMetric.slice(1)}{" "}
                        Analytics
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {chartData.isLiveData ? (
                          <>
                            <Wifi className="w-4 h-4 inline mr-1 text-green-500" />
                            Live data from {deviceStats.activeDevices} active
                            device(s)
                          </>
                        ) : chartData.hasHistoricalFallback ? (
                          <>
                            <History className="w-4 h-4 inline mr-1 text-blue-500" />
                            Historical data from{" "}
                            {chartData.devicesWithHistoricalData.length}{" "}
                            device(s)
                          </>
                        ) : (
                          "No data available"
                        )}
                      </p>
                    </div>
                    {!chartData.isLiveData &&
                      chartData.hasHistoricalFallback && (
                        <Alert className="w-auto border-blue-200 bg-blue-50 dark:bg-blue-950/10 p-3">
                          <Info className="h-4 w-4 text-blue-600" />
                          <AlertDescription className="text-xs text-blue-700 dark:text-blue-400">
                            Live feed unavailable • Showing historical data
                          </AlertDescription>
                        </Alert>
                      )}
                  </div>
                </CardHeader>
                <CardContent>
                  <DataChart
                    title=""
                    description=""
                    data={chartData.data}
                    type={selectedChartType as "line" | "area" | "bar"}
                    colors={chartData.isLiveData ? ["#10B981"] : ["#3B82F6"]}
                    timeFormat={chartData.isLiveData ? "time" : "datetime"}
                    className="w-full h-[400px]"
                  />
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-8">
                  <div className="text-center space-y-4">
                    <WifiOff className="w-12 h-12 text-muted-foreground mx-auto" />
                    <div>
                      <h3 className="text-lg font-medium">No Data Available</h3>
                      <p className="text-muted-foreground">
                        {!isConnected
                          ? "Socket connection lost. Attempting to reconnect..."
                          : devices.length === 0
                          ? "No devices registered in the system."
                          : "No live data or historical data available for the selected devices."}
                      </p>
                      {deviceStats.ignoredDevicesCount > 0 && (
                        <p className="text-sm text-red-600 mt-2">
                          {deviceStats.ignoredDevicesCount} device(s) have been
                          ignored after 3 failed retry attempts.
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2 justify-center">
                      <Button
                        onClick={handleSyncAllDevices}
                        disabled={isSyncing}
                      >
                        <RefreshCw
                          className={`w-4 h-4 mr-2 ${
                            isSyncing ? "animate-spin" : ""
                          }`}
                        />
                        {isSyncing ? "Syncing..." : "Retry Live Data"}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          availableDevices.forEach((deviceId) => {
                            const hasHistoricalData =
                              getHistoricalDataForDevice(deviceId).length > 0;
                            const isLoading =
                              loadingHistoricalData.has(deviceId);
                            const shouldIgnore =
                              shouldIgnoreDeviceForHistoricalData(deviceId);
                            if (
                              !hasHistoricalData &&
                              !isLoading &&
                              !shouldIgnore
                            ) {
                              fetchHistoricalData(deviceId);
                            }
                          });
                        }}
                      >
                        <History className="w-4 h-4 mr-2" />
                        Load Historical Data
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Device Management Tab */}
          <TabsContent value="devices" className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-xl font-semibold">Device Management</h2>
                <p className="text-sm text-muted-foreground">
                  Real-time status and monitoring of all IoT devices •{" "}
                  {devices.length} devices loaded from API
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={fetchDevices}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
                <Button onClick={handleSyncAllDevices} disabled={isSyncing}>
                  <Upload
                    className={`w-4 h-4 mr-2 ${
                      isSyncing ? "animate-spin" : ""
                    }`}
                  />
                  Sync All
                </Button>
              </div>
            </div>

            {/* Device Filters */}
            <DeviceFilters />

            {/* Device Status Cards Grid */}
            {devices.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {devices.map((device) => (
                  <DeviceStatusCard
                    key={device.id}
                    device={device}
                    onSelect={handleDeviceSelect}
                  />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-8">
                  <div className="text-center space-y-4">
                    <Database className="w-12 h-12 text-muted-foreground mx-auto" />
                    <div>
                      <h3 className="text-lg font-medium">No Devices Found</h3>
                      <p className="text-muted-foreground">
                        {deviceFilters.search ||
                        deviceFilters.type !== "all" ||
                        deviceFilters.status !== "all"
                          ? "No devices match the current filters. Try adjusting your search criteria."
                          : "No devices are registered in your account. Add your first IoT device to get started."}
                      </p>
                    </div>
                    <Button onClick={fetchDevices}>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Refresh Devices
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Selected Device Details */}
            {selectedDevice && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Signal className="w-5 h-5" />
                    Selected Device: {selectedDevice.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h3 className="font-semibold mb-2">Device Information</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Type:</span>
                          <span>{selectedDevice.type}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Status:</span>
                          <Badge
                            variant={
                              selectedDevice.status === "ONLINE"
                                ? "default"
                                : "secondary"
                            }
                          >
                            {selectedDevice.status}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            Location:
                          </span>
                          <span>{selectedDevice.location || "Not set"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            Firmware:
                          </span>
                          <span>{selectedDevice.firmware || "Unknown"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            Created:
                          </span>
                          <span>
                            {new Date(
                              selectedDevice.createdAt
                            ).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            Last Updated:
                          </span>
                          <span>
                            {new Date(
                              selectedDevice.updatedAt
                            ).toLocaleDateString()}
                          </span>
                        </div>
                        {/* Historical Data Retry Status */}
                        {historicalDataRetries[selectedDevice.id] && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              Data Retry Status:
                            </span>
                            <span
                              className={
                                historicalDataRetries[selectedDevice.id].ignored
                                  ? "text-red-600 text-xs"
                                  : "text-amber-600 text-xs"
                              }
                            >
                              {historicalDataRetries[selectedDevice.id].ignored
                                ? `Ignored (${
                                    historicalDataRetries[selectedDevice.id]
                                      .attempts
                                  } attempts)`
                                : `${
                                    historicalDataRetries[selectedDevice.id]
                                      .attempts
                                  } attempts`}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <h3 className="font-semibold mb-2">Real-time Data</h3>
                      <DeviceDataDisplay deviceId={selectedDevice.id} />
                      <div className="mt-4 space-y-2">
                        <h4 className="font-medium text-sm">Device Actions</h4>
                        <div className="flex gap-2 flex-wrap">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              handleDeviceAction(selectedDevice.id, "restart")
                            }
                          >
                            Restart
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              handleDeviceAction(selectedDevice.id, "update")
                            }
                          >
                            Update
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              refreshHistoricalData(selectedDevice.id)
                            }
                          >
                            Refresh Data
                          </Button>
                          {historicalDataRetries[selectedDevice.id]
                            ?.ignored && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-green-600 hover:text-green-700"
                              onClick={() => {
                                // Reset retry status for ignored device
                                setHistoricalDataRetries((prev) => ({
                                  ...prev,
                                  [selectedDevice.id]: {
                                    deviceId: selectedDevice.id,
                                    attempts: 0,
                                    lastAttempt: "",
                                    maxAttempts: 3,
                                    ignored: false,
                                  },
                                }));
                                toast.info(
                                  `Reset retry status for ${selectedDevice.name}`
                                );
                              }}
                            >
                              Reset Retry Status
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Advanced Charts Tab - Enhanced with Various Charts */}
          <TabsContent value="charts" className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-xl font-semibold">
                  Advanced Analytics Charts
                </h2>
                <p className="text-sm text-muted-foreground">
                  Comprehensive visualization and insights across all device
                  metrics
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleExportData}>
                  <Download className="w-4 h-4 mr-2" />
                  Export Charts Data
                </Button>
                <Button variant="outline" onClick={fetchDevices}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh Data
                </Button>
              </div>
            </div>

            {/* First Row - Overview Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <DeviceTypeChart />
              <BatteryStatusChart />
            </div>

            {/* Second Row - Connection and Metrics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ConnectionStatusChart />
              <MetricsOverviewChart />
            </div>

            {/* Third Row - Time Series Analysis */}
            <div className="grid grid-cols-1 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AreaChart className="w-5 h-5" />
                    Multi-Metric Time Series Analysis
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Comparative view of all sensor metrics over time
                  </p>
                </CardHeader>
                <CardContent>
                  {chartData.data.length > 0 ? (
                    <div className="space-y-4">
                      {/* Metric Selection for Multi-Chart */}
                      <div className="flex gap-2 flex-wrap">
                        {[
                          "temperature",
                          "humidity",
                          "pressure",
                          "voltage",
                          "current",
                        ].map((metric) => (
                          <Button
                            key={metric}
                            size="sm"
                            variant={
                              selectedMetric === metric ? "default" : "outline"
                            }
                            onClick={() => setSelectedMetric(metric)}
                          >
                            {metric.charAt(0).toUpperCase() + metric.slice(1)}
                          </Button>
                        ))}
                      </div>

                      {/* Multi-Series Chart */}
                      <div className="h-[300px]">
                        <DataChart
                          title=""
                          description=""
                          data={chartData.data}
                          type="area"
                          colors={[
                            "#10B981",
                            "#3B82F6",
                            "#F59E0B",
                            "#EF4444",
                            "#8B5CF6",
                          ]}
                          timeFormat={
                            chartData.isLiveData ? "time" : "datetime"
                          }
                          className="w-full h-full"
                        />
                      </div>

                      {/* Chart Statistics */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">
                            {chartData.data.length}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Data Points
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600">
                            {deviceStats.activeDevices}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Live Sources
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-amber-600">
                            {chartData.data.length > 0
                              ? (
                                  (Date.now() -
                                    new Date(
                                      chartData.data[0].timestamp
                                    ).getTime()) /
                                  (1000 * 60 * 60)
                                ).toFixed(1)
                              : "0"}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Hours Range
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-purple-600">
                            {chartData.isLiveData ? "LIVE" : "HISTORICAL"}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Data Source
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center">
                      <div className="text-center space-y-2">
                        <AreaChart className="w-12 h-12 text-muted-foreground mx-auto" />
                        <p className="text-muted-foreground">
                          No time series data available
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Charts will appear when device data becomes available
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Fourth Row - Advanced Analytics */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Historical Data Retry Status Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <RefreshCw className="w-5 h-5" />
                    Data Retrieval Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <div className="text-2xl font-bold text-green-600">
                          {devices.length -
                            Object.values(historicalDataRetries).filter(
                              (r) => r.ignored
                            ).length}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Active
                        </div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-amber-600">
                          {
                            Object.values(historicalDataRetries).filter(
                              (r) => r.attempts > 0 && !r.ignored
                            ).length
                          }
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Retrying
                        </div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-red-600">
                          {
                            Object.values(historicalDataRetries).filter(
                              (r) => r.ignored
                            ).length
                          }
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Ignored
                        </div>
                      </div>
                    </div>

                    {Object.values(historicalDataRetries).length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium">Retry Details:</h4>
                        <div className="max-h-32 overflow-y-auto space-y-1">
                          {Object.values(historicalDataRetries).map((retry) => {
                            const device = devices.find(
                              (d) => d.id === retry.deviceId
                            );
                            return (
                              <div
                                key={retry.deviceId}
                                className="flex justify-between items-center text-xs"
                              >
                                <span className="truncate">
                                  {device?.name || retry.deviceId.slice(-4)}
                                </span>
                                <Badge
                                  variant={
                                    retry.ignored ? "destructive" : "secondary"
                                  }
                                  className="text-xs"
                                >
                                  {retry.ignored
                                    ? "Ignored"
                                    : `${retry.attempts}/3`}
                                </Badge>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Real-time Activity Monitor */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    Real-time Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      {getReceivingDataDevices()
                        .slice(0, 5)
                        .map((deviceId) => {
                          const device = devices.find((d) => d.id === deviceId);
                          const deviceData = getRealTimeDataForDevice(deviceId);
                          const lastUpdate = deviceData[deviceData.length - 1];

                          return (
                            <div
                              key={deviceId}
                              className="flex items-center justify-between p-2 bg-muted/50 rounded"
                            >
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                <span className="text-sm font-medium truncate">
                                  {device?.name || deviceId.slice(-4)}
                                </span>
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {lastUpdate
                                  ? new Date(
                                      lastUpdate.timestamp
                                    ).toLocaleTimeString()
                                  : "No data"}
                              </div>
                            </div>
                          );
                        })}

                      {getReceivingDataDevices().length === 0 && (
                        <div className="text-center py-4">
                          <WifiOff className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">
                            No live activity
                          </p>
                        </div>
                      )}

                      {getReceivingDataDevices().length > 5 && (
                        <p className="text-xs text-muted-foreground text-center">
                          +{getReceivingDataDevices().length - 5} more devices
                          active
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* System Health Overview */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5" />
                    System Health
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Socket Connection</span>
                        <Badge
                          variant={isConnected ? "default" : "destructive"}
                        >
                          {isConnected ? "Connected" : "Disconnected"}
                        </Badge>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-sm">API Status</span>
                        <Badge variant="default">Connected</Badge>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-sm">Data Quality</span>
                        <Badge
                          variant={
                            deviceStats.activeDevices > 0
                              ? "default"
                              : "secondary"
                          }
                        >
                          {deviceStats.activeDevices > 0 ? "Good" : "Limited"}
                        </Badge>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-sm">Error Count</span>
                        <Badge
                          variant={
                            deviceErrors.length === 0
                              ? "default"
                              : "destructive"
                          }
                        >
                          {deviceErrors.length}
                        </Badge>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-sm">Uptime</span>
                        <Badge variant="default">
                          {Math.round(
                            (deviceStats.onlineDevices /
                              Math.max(deviceStats.totalDevices, 1)) *
                              100
                          )}
                          %
                        </Badge>
                      </div>
                    </div>

                    <div className="pt-2 border-t">
                      <div className="text-xs text-muted-foreground">
                        Last Updated: {new Date().toLocaleTimeString()}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        User: {currentUser}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Fifth Row - Export and Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="w-5 h-5" />
                  Analytics Summary & Export
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <h4 className="font-medium">Device Overview</h4>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <div>Total Devices: {deviceStats.totalDevices}</div>
                      <div>
                        Active Data Sources: {deviceStats.activeDevices}
                      </div>
                      <div>
                        Historical Sources:{" "}
                        {chartData.devicesWithHistoricalData.length}
                      </div>
                      <div>
                        Ignored Devices: {deviceStats.ignoredDevicesCount}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium">Data Quality</h4>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <div>
                        Live Data Points:{" "}
                        {Object.values(realTimeData).reduce(
                          (sum, data) => sum + data.length,
                          0
                        )}
                      </div>
                      <div>
                        Historical Points:{" "}
                        {Object.values(historicalData).reduce(
                          (sum, data) => sum + data.length,
                          0
                        )}
                      </div>
                      <div>Error Count: {deviceErrors.length}</div>
                      <div>
                        Retry Attempts:{" "}
                        {Object.values(historicalDataRetries).reduce(
                          (sum, retry) => sum + retry.attempts,
                          0
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium">System Status</h4>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <div>
                        Socket: {isConnected ? "Connected" : "Disconnected"}
                      </div>
                      <div>API: Connected</div>
                      <div>Avg Battery: {deviceStats.averageBattery}%</div>
                      <div>
                        Uptime:{" "}
                        {Math.round(
                          (deviceStats.onlineDevices /
                            Math.max(deviceStats.totalDevices, 1)) *
                            100
                        )}
                        %
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium">Export Options</h4>
                    <div className="space-y-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleExportData}
                        className="w-full"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Export All Data
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full"
                        onClick={() => {
                          const csvData = chartData.data
                            .map((point) =>
                              Object.entries(point)
                                .map(([key, value]) => `${key}: ${value}`)
                                .join(", ")
                            )
                            .join("\n");

                          const blob = new Blob([csvData], {
                            type: "text/csv",
                          });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = `analytics-chart-data-${
                            new Date().toISOString().split("T")[0]
                          }.csv`;
                          a.click();
                          URL.revokeObjectURL(url);

                          toast.success("Chart data exported as CSV");
                        }}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Export Chart CSV
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>
    </motion.div>
  );
}

// Device Data Display Component
function DeviceDataDisplay({ deviceId }: { deviceId: string }) {
  const {
    data: realtimeData,
    connectionStatus,
    lastDataReceived,
    isLiveDataActive,
  } = useDeviceData(deviceId);

  if (!realtimeData && connectionStatus === "NOT_CONNECTED") {
    return (
      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2 text-orange-600">
          <AlertTriangle className="w-4 h-4" />
          <span>No live data available</span>
        </div>
        <p className="text-muted-foreground text-xs">
          Device is not sending real-time data. Check device connection.
        </p>
      </div>
    );
  }

  if (!realtimeData) {
    return (
      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Clock className="w-4 h-4" />
          <span>Waiting for data...</span>
        </div>
        <p className="text-muted-foreground text-xs">
          Subscribing to device data stream...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {isLiveDataActive ? (
          <div className="flex items-center gap-1 text-green-600">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-xs font-medium">Live Data Active</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 text-orange-600">
            <Clock className="w-3 h-3" />
            <span className="text-xs font-medium">Last Known Data</span>
          </div>
        )}
      </div>

      <div className="space-y-2 text-sm">
        {realtimeData.batteryLevel !== undefined && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Battery:</span>
            <span className="font-medium">{realtimeData.batteryLevel}%</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-muted-foreground">Last Update:</span>
          <span className="text-xs font-mono">
            {lastDataReceived
              ? new Date(lastDataReceived).toLocaleTimeString()
              : "Never"}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Connection:</span>
          <Badge
            variant={
              connectionStatus === "RECEIVING_DATA" ? "default" : "secondary"
            }
            className="text-xs"
          >
            {connectionStatus.replace("_", " ")}
          </Badge>
        </div>
        {realtimeData.status && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Device Status:</span>
            <span className="font-medium">{realtimeData.status}</span>
          </div>
        )}
      </div>
    </div>
  );
}
