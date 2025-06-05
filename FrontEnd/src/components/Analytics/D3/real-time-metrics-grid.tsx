"use client";

import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useDeviceData } from "@/context/SocketContext";
import { BarChart3, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface MetricCardProps {
  device: any;
  index: number;
}

function MetricCard({ device, index }: MetricCardProps) {
  const { data, connectionStatus, isLiveDataActive } = useDeviceData(device.id);
  const [previousValue, setPreviousValue] = useState<number | null>(null);
  const [trend, setTrend] = useState<"up" | "down" | "stable">("stable");

  const currentValue = data?.data?.metrics?.primary?.value || 0;
  const unit = data?.data?.metrics?.primary?.unit || "";

  useEffect(() => {
    if (previousValue !== null && currentValue !== previousValue) {
      if (currentValue > previousValue) setTrend("up");
      else if (currentValue < previousValue) setTrend("down");
      else setTrend("stable");
    }
    setPreviousValue(currentValue);
  }, [currentValue, previousValue]);

  const getTrendIcon = () => {
    switch (trend) {
      case "up":
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case "down":
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      default:
        return <Minus className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = () => {
    switch (connectionStatus as string) {
      case "RECEIVING_DATA":
        return "border-l-green-500";
      case "ERROR":
        return "border-l-red-500";
      case "NOT_CONNECTED":
        return "border-l-yellow-500";
      case "DISCONNECTED":
        return "border-l-gray-500";
      default:
        return "border-l-gray-500";
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="h-full"
    >
      <Card
        className={`h-full border-l-4 ${getStatusColor()} transition-all duration-300 hover:shadow-lg`}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  isLiveDataActive
                    ? "bg-green-500 animate-pulse"
                    : "bg-gray-400"
                }`}
              />
              <CardTitle className="text-sm font-medium truncate">
                {device.name}
              </CardTitle>
            </div>
            {getTrendIcon()}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-3">
            <div className="flex items-baseline gap-2">
              <AnimatePresence mode="wait">
                <motion.span
                  key={currentValue}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="text-2xl font-bold"
                >
                  {currentValue.toFixed(1)}
                </motion.span>
              </AnimatePresence>
              <span className="text-sm text-muted-foreground">{unit}</span>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Status</span>
                <Badge
                  variant={
                    connectionStatus === "RECEIVING_DATA"
                      ? "default"
                      : "secondary"
                  }
                  className="text-xs"
                >
                  {connectionStatus === "RECEIVING_DATA" ? "Live" : "Offline"}
                </Badge>
              </div>

              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Type</span>
                <span className="font-medium">
                  {device.type.replace(/_/g, " ")}
                </span>
              </div>

              {data?.data?.metrics?.secondary &&
                data.data.metrics.secondary.length > 0 && (
                  <div className="pt-2 border-t">
                    <div className="grid grid-cols-2 gap-2">
                      {data.data.metrics.secondary
                        .slice(0, 2)
                        .map((metric: any, idx: number) => (
                          <div key={idx} className="text-center">
                            <div className="text-xs text-muted-foreground">
                              {metric.name}
                            </div>
                            <div className="text-sm font-semibold">
                              {metric.value?.toFixed(1) || "N/A"}
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
            </div>

            {/* Mini progress bar for value visualization */}
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <motion.div
                className="bg-gradient-to-r from-blue-500 to-purple-500 h-1.5 rounded-full"
                initial={{ width: 0 }}
                animate={{
                  width: `${Math.min(100, (currentValue / 100) * 100)}%`,
                }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

interface RealTimeMetricsGridProps {
  devices: any[];
}

export default function RealTimeMetricsGrid({
  devices,
}: RealTimeMetricsGridProps) {
  const [sortBy, setSortBy] = useState<"name" | "value" | "status">("name");
  const [filterStatus, setFilterStatus] = useState<
    "all" | "active" | "offline"
  >("all");

  // ✅ FIXED: Call hooks at the top level for each device
  const deviceDataHooks = devices.map((device) => useDeviceData(device.id));

  // ✅ FIXED: Build device data map using the hook results
  const deviceDataMap = useMemo(() => {
    return devices.reduce((acc, device, index) => {
      const deviceHookData = deviceDataHooks[index];
      acc[device.id] = deviceHookData;
      return acc;
    }, {} as { [deviceId: string]: any });
  }, [devices, deviceDataHooks]);

  const filteredAndSortedDevices = useMemo(() => {
    return devices
      .filter((device) => {
        if (filterStatus === "all") return true;
        const { connectionStatus } = deviceDataMap[device.id] || {
          connectionStatus: "DISCONNECTED",
        };
        if (filterStatus === "active")
          return connectionStatus === "RECEIVING_DATA";
        if (filterStatus === "offline")
          return connectionStatus !== "RECEIVING_DATA";
        return true;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case "name":
            return a.name.localeCompare(b.name);
          case "value":
            const { data: dataA } = deviceDataMap[a.id] || {
              data: { data: { metrics: { primary: { value: 0 } } } },
            };
            const { data: dataB } = deviceDataMap[b.id] || {
              data: { data: { metrics: { primary: { value: 0 } } } },
            };
            const valueA = dataA?.data?.metrics?.primary?.value || 0;
            const valueB = dataB?.data?.metrics?.primary?.value || 0;
            return valueB - valueA;
          case "status":
            const { connectionStatus: statusA } = deviceDataMap[a.id] || {
              connectionStatus: "DISCONNECTED",
            };
            const { connectionStatus: statusB } = deviceDataMap[b.id] || {
              connectionStatus: "DISCONNECTED",
            };
            return statusA.localeCompare(statusB);
          default:
            return 0;
        }
      });
  }, [devices, filterStatus, sortBy, deviceDataMap]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BarChart3 className="w-5 h-5" />
            <div>
              <CardTitle>Real-Time Metrics Dashboard</CardTitle>
              <p className="text-sm text-muted-foreground">
                Live device metrics with trend analysis and status monitoring
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="px-3 py-1 text-sm border rounded-md"
            >
              <option value="all">All Devices</option>
              <option value="active">Active Only</option>
              <option value="offline">Offline Only</option>
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-1 text-sm border rounded-md"
            >
              <option value="name">Sort by Name</option>
              <option value="value">Sort by Value</option>
              <option value="status">Sort by Status</option>
            </select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredAndSortedDevices.map((device, index) => (
            <MetricCard key={device.id} device={device} index={index} />
          ))}
        </div>
        {filteredAndSortedDevices.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No devices match the current filter criteria</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
