"use client";

import { useState } from "react";
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
import { Activity, Clock, Wifi, WifiOff, AlertTriangle } from "lucide-react";
import { useDeviceData, useDeviceStats } from "@/context/SocketContext";
import { getDeviceIcon } from "@/utils/device-utils";

interface RealTimeMonitorProps {
  devices: any[];
  timeRange: string;
  onTimeRangeChange: (range: string) => void;
}

// Component for individual device real-time data
function DeviceRealTimeCard({ device }: { device: any }) {
  const { data, connectionStatus, lastDataReceived, isLiveDataActive, error } =
    useDeviceData(device.id);
  const IconComponent = getDeviceIcon(device.type);

  const getStatusColor = () => {
    switch (connectionStatus as string) {
      case "CONNECTED":
        return "border-green-200 bg-green-50/50";
      case "ERROR":
        return "border-red-200 bg-red-50/50";
      case "DISCONNECTED":
        return "border-yellow-200 bg-yellow-50/50";
      default:
        return "border-gray-200";
    }
  };

  const getStatusIcon = () => {
    switch (connectionStatus as string) {
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

  return (
    <Card className={`transition-all duration-200 ${getStatusColor()}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <IconComponent className="w-4 h-4" />
            <span className="font-medium text-sm">{device.name}</span>
          </div>
          <div className="flex items-center gap-1">{getStatusIcon()}</div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2">
          <Badge
            variant={
              (connectionStatus as string) === "CONNECTED"
                ? "default"
                : "secondary"
            }
            className="text-xs"
          >
            {connectionStatus}
          </Badge>

          {data && (
            <div className="space-y-1">
              <div className="text-lg font-bold">
                {data.data?.metrics?.primary?.value?.toFixed(2) || "N/A"}
                <span className="text-xs text-muted-foreground ml-1">
                  {data.data?.metrics?.primary?.unit || ""}
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                {lastDataReceived
                  ? new Date(lastDataReceived).toLocaleTimeString()
                  : "No data"}
              </div>
            </div>
          )}

          {error && (
            <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
              {error.message}
            </div>
          )}

          {!data && !error && (
            <div className="text-sm text-muted-foreground">
              Waiting for data...
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function RealTimeMonitor({
  devices,
  timeRange,
  onTimeRangeChange,
}: RealTimeMonitorProps) {
  const [selectedMetric, setSelectedMetric] = useState("primary");
  const { stats, deviceErrors } = useDeviceStats();

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Real-Time Monitoring
            </CardTitle>
            <div className="flex items-center gap-4">
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
              <Badge variant="outline">
                {stats.receivingDataDevices.length} Live Streams
              </Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Device Errors Alert */}
      {deviceErrors.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>{deviceErrors.length} device error(s) detected:</strong>
            <div className="mt-2 space-y-1">
              {deviceErrors.slice(0, 3).map((error, index) => (
                <div key={index} className="text-sm">
                  • {error.deviceId}: {error.message}
                </div>
              ))}
              {deviceErrors.length > 3 && (
                <div className="text-sm">
                  • +{deviceErrors.length - 3} more errors
                </div>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Device Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {devices.map((device) => (
          <DeviceRealTimeCard key={device.id} device={device} />
        ))}
      </div>

      {/* Real-time Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Streams</p>
                <p className="text-2xl font-bold text-green-600">
                  {stats.receivingDataDevices.length}
                </p>
              </div>
              <Activity className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Idle Devices</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {stats.idleDevices}
                </p>
              </div>
              <WifiOff className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Error Devices</p>
                <p className="text-2xl font-bold text-red-600">
                  {stats.errorDevices}
                </p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
