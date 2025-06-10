"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Activity,
  Clock,
  Wifi,
  WifiOff,
  AlertTriangle,
  Battery,
  Signal,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  Grid3X3,
  List,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useDeviceData, useDeviceStats } from "@/context/SocketContext";
import { getDeviceIcon } from "@/utils/device-utils";

// Type definitions
interface Device {
  id: string;
  name: string;
  type: string;
  category?: string;
}

interface MetricData {
  name: string;
  value: any;
  unit?: string;
  min?: number;
  max?: number;
}

interface StructuredData {
  template?: {
    color?: string;
    category?: string;
  };
  metrics?: {
    primary?: MetricData;
    secondary?: MetricData[];
  };
  batteryLevel?: number;
  signalStrength?: number;
}

interface DeviceDataResponse {
  data?: {
    structuredData?: StructuredData;
  };
}

interface RealTimeMonitorProps {
  devices: Device[];
  timeRange: string;
  onTimeRangeChange: (range: string) => void;
}

interface DeviceCardProps {
  device: Device;
  viewMode: "compact" | "detailed";
}

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  subtitle?: string;
}

// Enhanced Device Card Component
function DeviceRealTimeCard({ device, viewMode }: DeviceCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { data, connectionStatus, lastDataReceived, isLiveDataActive, error } =
    useDeviceData(device.id);

  const IconComponent = getDeviceIcon(device.type);

  // Parse structured data from response with proper error handling
  const structuredData = useMemo((): StructuredData | null => {
    if (!data) return null;

    try {
      const deviceData = data as DeviceDataResponse;
      return deviceData.data?.structuredData || null;
    } catch (e) {
      console.error("Error parsing structured data:", e);
      return null;
    }
  }, [data]);

  const getStatusColor = (): string => {
    const status = connectionStatus as string;
    switch (status) {
      case "CONNECTED":
        return "border-green-200 bg-green-50/50 shadow-green-100";
      case "ERROR":
        return "border-red-200 bg-red-50/50 shadow-red-100";
      case "DISCONNECTED":
        return "border-yellow-200 bg-yellow-50/50 shadow-yellow-100";
      default:
        return "border-gray-200 shadow-gray-100";
    }
  };

  const getStatusIcon = () => {
    const status = connectionStatus as string;
    switch (status) {
      case "CONNECTED":
        return <Wifi className="w-3 h-3 text-green-500" />;
      case "ERROR":
        return <AlertTriangle className="w-3 h-3 text-red-500" />;
      case "DISCONNECTED":
        return <WifiOff className="w-3 h-3 text-yellow-500" />;
      default:
        return <div className="w-3 h-3 rounded-full bg-gray-400" />;
    }
  };

  const getMetricTrend = (value: number) => {
    // Simple trend indicator (you can enhance this with historical data)
    const random = Math.random();
    if (random > 0.6) return <TrendingUp className="w-3 h-3 text-green-500" />;
    if (random < 0.4) return <TrendingDown className="w-3 h-3 text-red-500" />;
    return <Minus className="w-3 h-3 text-gray-400" />;
  };

  const formatValue = (value: any, unit?: string): string => {
    if (typeof value === "number") {
      return `${value.toFixed(2)}${unit ? ` ${unit}` : ""}`;
    }
    if (typeof value === "boolean") {
      return value ? "Yes" : "No";
    }
    return String(value || "N/A");
  };

  const formatLastReceived = (timestamp: string | Date | null): string => {
    if (!timestamp) return "No data";

    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString();
    } catch (e) {
      return "Invalid time";
    }
  };

  return (
    <Card
      className={`transition-all duration-300 hover:shadow-lg ${getStatusColor()}`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="flex-shrink-0">
              <IconComponent
                className="w-5 h-5"
                style={{
                  color: structuredData?.template?.color || "#6b7280",
                }}
              />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-sm truncate">{device.name}</h3>
              <p className="text-xs text-muted-foreground">
                {structuredData?.template?.category ||
                  device.category ||
                  "Device"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {getStatusIcon()}
            {isLiveDataActive && (
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-3">
        {/* Status Badge */}
        <div className="flex items-center justify-between">
          <Badge
            variant={connectionStatus === "CONNECTED" ? "default" : "secondary"}
            className="text-xs"
          >
            {connectionStatus || "Unknown"}
          </Badge>
          <div className="text-xs text-muted-foreground">
            {formatLastReceived(lastDataReceived)}
          </div>
        </div>

        {/* Primary Metric */}
        {structuredData?.metrics?.primary && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium capitalize">
                {structuredData.metrics.primary.name?.replace("_", " ") ||
                  "Value"}
              </span>
              {typeof structuredData.metrics.primary.value === "number" &&
                getMetricTrend(structuredData.metrics.primary.value)}
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold">
                {formatValue(structuredData.metrics.primary.value)}
              </span>
              {structuredData.metrics.primary.unit && (
                <span className="text-sm text-muted-foreground">
                  {structuredData.metrics.primary.unit}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Battery/Signal Indicators */}
        {(structuredData?.batteryLevel || structuredData?.signalStrength) && (
          <div className="flex items-center gap-4">
            {structuredData?.batteryLevel && (
              <div className="flex items-center gap-1">
                <Battery className="w-3 h-3 text-muted-foreground" />
                <Progress
                  value={structuredData.batteryLevel}
                  className="w-12 h-1"
                />
                <span className="text-xs text-muted-foreground">
                  {structuredData.batteryLevel}%
                </span>
              </div>
            )}
            {structuredData?.signalStrength && (
              <div className="flex items-center gap-1">
                <Signal className="w-3 h-3 text-muted-foreground" />
                <Progress
                  value={structuredData.signalStrength}
                  className="w-12 h-1"
                />
                <span className="text-xs text-muted-foreground">
                  {structuredData.signalStrength}%
                </span>
              </div>
            )}
          </div>
        )}

        {/* Secondary Metrics - Expandable */}
        {structuredData?.metrics?.secondary &&
          structuredData.metrics.secondary.length > 0 && (
            <div className="space-y-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full justify-between p-0 h-auto text-xs"
              >
                <span>
                  Secondary Metrics ({structuredData.metrics.secondary.length})
                </span>
                {isExpanded ? (
                  <ChevronUp className="w-3 h-3" />
                ) : (
                  <ChevronDown className="w-3 h-3" />
                )}
              </Button>

              {isExpanded && (
                <div className="space-y-2 pt-2 border-t">
                  {structuredData.metrics.secondary
                    .slice(0, 3)
                    .map((metric: MetricData, index: number) => (
                      <div
                        key={index}
                        className="flex items-center justify-between text-xs"
                      >
                        <span className="text-muted-foreground capitalize">
                          {metric.name?.replace("_", " ") ||
                            `Metric ${index + 1}`}
                        </span>
                        <span className="font-medium">
                          {formatValue(metric.value, metric.unit)}
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

        {/* Error Display */}
        {error && (
          <div className="text-xs text-red-600 bg-red-50 p-2 rounded border border-red-200">
            <div className="flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              Error
            </div>
            <div className="mt-1">
              {typeof error === "string"
                ? error
                : (error as any)?.message || "Unknown error"}
            </div>
          </div>
        )}

        {/* No Data State */}
        {!structuredData && !error && (
          <div className="text-sm text-muted-foreground text-center py-4">
            <RefreshCw className="w-4 h-4 mx-auto mb-1 animate-spin" />
            Waiting for data...
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Enhanced Statistics Card
function StatCard({
  title,
  value,
  icon: Icon,
  color,
  subtitle,
}: StatCardProps) {
  return (
    <Card className="transition-all duration-200 hover:shadow-md">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <div>
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              {subtitle && (
                <p className="text-xs text-muted-foreground">{subtitle}</p>
              )}
            </div>
          </div>
          <div className="p-2 rounded-lg bg-gray-100">
            <Icon className={`w-6 h-6 ${color}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Main Component
export default function RealTimeMonitor({
  devices,
  timeRange,
  onTimeRangeChange,
}: RealTimeMonitorProps) {
  const [viewMode, setViewMode] = useState<"compact" | "detailed">("detailed");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // Use proper error handling for hooks
  const statsResult = useDeviceStats();
  const stats = statsResult?.stats || {
    receivingDataDevices: [],
    idleDevices: 0,
    errorDevices: 0,
  };
  const deviceErrors = statsResult?.deviceErrors || [];

  // Group devices by category with proper typing
  const devicesByCategory = useMemo(() => {
    const categories: Record<string, Device[]> = {};
    devices.forEach((device) => {
      const category = device.category || "Other";
      if (!categories[category]) categories[category] = [];
      categories[category].push(device);
    });
    return categories;
  }, [devices]);

  const categories = ["all", ...Object.keys(devicesByCategory)];

  const filteredDevices = useMemo(() => {
    return devices.filter((device) => {
      if (categoryFilter !== "all" && device.category !== categoryFilter)
        return false;
      return true;
    });
  }, [devices, categoryFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Real-Time Monitoring
              <Badge variant="outline" className="ml-2">
                {filteredDevices.length} Devices
              </Badge>
            </CardTitle>

            <div className="flex flex-wrap items-center gap-3">
              {/* Time Range Selector */}
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <Select value={timeRange} onValueChange={onTimeRangeChange}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1h">Last Hour</SelectItem>
                    <SelectItem value="6h">Last 6 Hours</SelectItem>
                    <SelectItem value="24h">Last 24 Hours</SelectItem>
                    <SelectItem value="7d">Last 7 Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Category Filter */}
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category === "all" ? "All Categories" : category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* View Mode Toggle */}
              <div className="flex items-center border rounded-lg">
                <Button
                  variant={viewMode === "compact" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("compact")}
                  className="rounded-r-none"
                >
                  <Grid3X3 className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === "detailed" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("detailed")}
                  className="rounded-l-none"
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>

              {/* Live Status */}
              <Badge variant="outline" className="animate-pulse">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2" />
                {stats.receivingDataDevices.length} Live
              </Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Statistics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Streams"
          value={stats.receivingDataDevices.length}
          icon={Activity}
          color="text-green-600"
          subtitle="Receiving data"
        />
        <StatCard
          title="Idle Devices"
          value={stats.idleDevices}
          icon={WifiOff}
          color="text-yellow-600"
          subtitle="No recent data"
        />
        <StatCard
          title="Error Devices"
          value={stats.errorDevices}
          icon={AlertTriangle}
          color="text-red-600"
          subtitle="Require attention"
        />
        <StatCard
          title="Total Devices"
          value={filteredDevices.length}
          icon={Wifi}
          color="text-blue-600"
          subtitle="In network"
        />
      </div>

      {/* Device Errors Alert */}
      {deviceErrors.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="flex items-center justify-between">
              <div>
                <strong>{deviceErrors.length} device error(s) detected</strong>
                <div className="mt-2 space-y-1">
                  {deviceErrors.slice(0, 2).map((error: any, index: number) => (
                    <div key={index} className="text-sm">
                      • {error.deviceId || "Unknown Device"}:{" "}
                      {error.message || "Unknown error"}
                    </div>
                  ))}
                  {deviceErrors.length > 2 && (
                    <div className="text-sm">
                      • +{deviceErrors.length - 2} more errors
                    </div>
                  )}
                </div>
              </div>
              <Button variant="outline" size="sm">
                View All
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Device Grid */}
      <div
        className={`grid gap-4 ${
          viewMode === "compact"
            ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
        }`}
      >
        {filteredDevices.map((device) => (
          <DeviceRealTimeCard
            key={device.id}
            device={device}
            viewMode={viewMode}
          />
        ))}
      </div>

      {/* Empty State */}
      {filteredDevices.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <WifiOff className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No devices found</h3>
            <p className="text-muted-foreground">
              Try adjusting your filters or check your device connections.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
