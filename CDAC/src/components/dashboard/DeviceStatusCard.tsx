"use client";
import { motion, AnimatePresence } from "framer-motion";
import { useAppearance } from "@/context/AppearanceContext";
import { useState, useCallback, useMemo } from "react";
import {
  Activity,
  Battery,
  BatteryCharging,
  Signal,
  WifiOff,
  SettingsIcon,
  Thermometer,
  Droplets,
  Lightbulb,
  MapPin,
  Wifi,
  Clock,
  Cpu,
  Hash,
  Settings,
  Edit3,
  Trash2,
  Power,
  RefreshCw,
  X,
  Save,
  Monitor,
  Shield,
  Info,
  Zap,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Radio,
  WifiIcon,
  TrendingUp,
  Database,
  BarChart3,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Device, DeviceType, DeviceStatus } from "@/types";
import { useSocket, useDeviceData } from "@/context/SocketContext";
import api from "@/lib/api";

// Enhanced status colors with improved visual hierarchy
const StatusColors = {
  ONLINE: {
    bg: "bg-gradient-to-br from-emerald-50 via-emerald-50/80 to-emerald-100/60 dark:from-emerald-950/40 dark:via-emerald-900/30 dark:to-emerald-800/20",
    text: "text-emerald-700 dark:text-emerald-300",
    border: "border-emerald-200/70 dark:border-emerald-700/70",
    icon: <Signal className="w-3.5 h-3.5" />,
    glow: "shadow-lg shadow-emerald-500/25 dark:shadow-emerald-500/15",
    dot: "bg-emerald-500 shadow-emerald-500/50",
    badgeStyle:
      "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/50 dark:text-emerald-200 dark:border-emerald-700",
  },
  OFFLINE: {
    bg: "bg-gradient-to-br from-slate-50 via-slate-50/80 to-slate-100/60 dark:from-slate-900/40 dark:via-slate-800/30 dark:to-slate-700/20",
    text: "text-slate-600 dark:text-slate-400",
    border: "border-slate-200/70 dark:border-slate-600/70",
    icon: <WifiOff className="w-3.5 h-3.5" />,
    glow: "shadow-lg shadow-slate-500/15 dark:shadow-slate-500/10",
    dot: "bg-slate-400 shadow-slate-400/50",
    badgeStyle:
      "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/50 dark:text-slate-300 dark:border-slate-600",
  },
  NOT_CONNECTED: {
    bg: "bg-gradient-to-br from-orange-50 via-orange-50/80 to-orange-100/60 dark:from-orange-950/40 dark:via-orange-900/30 dark:to-orange-800/20",
    text: "text-orange-700 dark:text-orange-300",
    border: "border-orange-200/70 dark:border-orange-700/70",
    icon: <AlertTriangle className="w-3.5 h-3.5" />,
    glow: "shadow-lg shadow-orange-500/25 dark:shadow-orange-500/15",
    dot: "bg-orange-500 shadow-orange-500/50",
    badgeStyle:
      "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/50 dark:text-orange-200 dark:border-orange-700",
  },
  MAINTENANCE: {
    bg: "bg-gradient-to-br from-amber-50 via-amber-50/80 to-amber-100/60 dark:from-amber-950/40 dark:via-amber-900/30 dark:to-amber-800/20",
    text: "text-amber-700 dark:text-amber-300",
    border: "border-amber-200/70 dark:border-amber-700/70",
    icon: <SettingsIcon className="w-3.5 h-3.5" />,
    glow: "shadow-lg shadow-amber-500/25 dark:shadow-amber-500/15",
    dot: "bg-amber-500 shadow-amber-500/50",
    badgeStyle:
      "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/50 dark:text-amber-200 dark:border-amber-700",
  },
  ERROR: {
    bg: "bg-gradient-to-br from-red-50 via-red-50/80 to-red-100/60 dark:from-red-950/40 dark:via-red-900/30 dark:to-red-800/20",
    text: "text-red-700 dark:text-red-300",
    border: "border-red-200/70 dark:border-red-700/70",
    icon: <Activity className="w-3.5 h-3.5" />,
    glow: "shadow-lg shadow-red-500/25 dark:shadow-red-500/15",
    dot: "bg-red-500 shadow-red-500/50",
    badgeStyle:
      "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/50 dark:text-red-200 dark:border-red-700",
  },
};

const DeviceTypeConfig = {
  TEMPERATURE_SENSOR: {
    icon: <Thermometer className="w-5 h-5" />,
    label: "Temperature Sensor",
    color: "text-orange-600 dark:text-orange-400",
  },
  WATER_METER: {
    icon: <Droplets className="w-5 h-5" />,
    label: "Water Meter",
    color: "text-blue-600 dark:text-blue-400",
  },
  SMART_LIGHT: {
    icon: <Lightbulb className="w-5 h-5" />,
    label: "Smart Light",
    color: "text-yellow-600 dark:text-yellow-400",
  },
  default: {
    icon: <Cpu className="w-5 h-5" />,
    label: "Device",
    color: "text-slate-600 dark:text-slate-400",
  },
};

// Helper function to get metric icon based on metric type
const getMetricIcon = (metric: string) => {
  switch (metric?.toLowerCase()) {
    case "temperature":
      return <Thermometer className="w-4 h-4" />;
    case "humidity":
      return <Droplets className="w-4 h-4" />;
    case "pressure":
      return <BarChart3 className="w-4 h-4" />;
    case "light":
    case "brightness":
      return <Lightbulb className="w-4 h-4" />;
    default:
      return <TrendingUp className="w-4 h-4" />;
  }
};

// Helper function to format metric name for display
const formatMetricName = (metric: string) => {
  return (
    metric
      ?.split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ") || "Unknown Metric"
  );
};

interface DeviceStatusCardProps {
  device: Device;
  onSelect: (device: Device) => void;
}

export default function DeviceStatusCard({
  device,
  onSelect,
}: DeviceStatusCardProps) {
  const { animationsEnabled } = useAppearance();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [editedDevice, setEditedDevice] = useState<Device>(device);
  const [isEditing, setIsEditing] = useState(false);

  // Socket integration with 2-minute timeout support
  const { isConnected } = useSocket();
  const {
    data: realtimeData,
    connectionStatus,
    isSubscribed,
    lastDataReceived,
    isLiveDataActive,
  } = useDeviceData(device.id);

  // Determine the display status based on real-time data and connection
  const displayStatus = useMemo(() => {
    if (connectionStatus === "DISCONNECTED") return "OFFLINE";
    if (connectionStatus === "NOT_CONNECTED") return "NOT_CONNECTED";
    if (connectionStatus === "RECEIVING_DATA") {
      return realtimeData?.status || "ONLINE";
    }
    return device.status;
  }, [connectionStatus, realtimeData?.status, device.status]);

  // Current values (real-time or fallback)
  const currentBatteryLevel = realtimeData?.batteryLevel ?? device.batteryLevel;
  const currentLastSeen = realtimeData?.lastSeen || device.lastSeen;

  const getBatteryDisplay = useCallback(() => {
    if (currentBatteryLevel === null || currentBatteryLevel === undefined) {
      return null;
    }

    const level = currentBatteryLevel;
    let icon, colorClass, bgClass;

    if (level > 80) {
      icon = <BatteryCharging className="w-4 h-4" />;
      colorClass = "text-emerald-700 dark:text-emerald-300";
      bgClass = "from-emerald-500 to-emerald-400";
    } else if (level > 30) {
      icon = <Battery className="w-4 h-4" />;
      colorClass = "text-amber-700 dark:text-amber-300";
      bgClass = "from-amber-500 to-amber-400";
    } else {
      icon = <Battery className="w-4 h-4" />;
      colorClass = "text-red-700 dark:text-red-300";
      bgClass = "from-red-500 to-red-400";
    }

    return (
      <div className="space-y-3 p-4 rounded-xl bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-700/50">
        <div className="flex justify-between items-center">
          <div
            className={cn(
              "text-sm flex items-center gap-2 font-semibold",
              colorClass
            )}
          >
            {icon}
            <span>Battery Level</span>
          </div>
          <span className="text-sm font-bold text-foreground bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg border shadow-sm">
            {level}%
          </span>
        </div>
        <div className="relative overflow-hidden rounded-full h-3 bg-slate-200 dark:bg-slate-700 shadow-inner">
          <motion.div
            className={cn(
              "h-full rounded-full bg-gradient-to-r shadow-sm",
              bgClass
            )}
            initial={{ width: 0 }}
            animate={{ width: `${level}%` }}
            transition={{ duration: 1.2, ease: "easeOut" }}
          />
        </div>
      </div>
    );
  }, [currentBatteryLevel]);

  const formatLastSeen = useCallback((lastSeen: string | null) => {
    if (!lastSeen) return "Never connected";

    const date = new Date(lastSeen);
    const now = new Date();
    const diffInMinutes = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60)
    );

    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes} min ago`;
    if (diffInMinutes < 1440)
      return `${Math.floor(diffInMinutes / 60)} hours ago`;
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, []);

  const formatDeviceId = useCallback((id: string) => {
    return `${id.substring(0, 8)}...${id.substring(id.length - 4)}`;
  }, []);

  // Enhanced connection status display with 2-minute timeout awareness
  const getConnectionStatusDisplay = useCallback(() => {
    if (!isConnected) {
      return (
        <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
          <div className="p-2 rounded-lg bg-red-50 dark:bg-red-900/20">
            <XCircle className="w-4 h-4" />
          </div>
          <div>
            <div className="font-semibold text-sm">Socket Disconnected</div>
            <div className="text-xs opacity-75">
              Check your internet connection
            </div>
          </div>
        </div>
      );
    }

    switch (connectionStatus) {
      case "RECEIVING_DATA":
        return (
          <div className="flex items-center gap-3 text-emerald-600 dark:text-emerald-400">
            <div className="relative p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20">
              <CheckCircle className="w-4 h-4" />
              <motion.div
                className="absolute inset-0 rounded-lg bg-emerald-500 opacity-20"
                animate={{ scale: [1, 1.5, 1], opacity: [0.2, 0, 0.2] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </div>
            <div>
              <div className="font-semibold text-sm">Live & Active</div>
              <div className="text-xs opacity-75">
                {lastDataReceived &&
                  `Last update: ${Math.floor(
                    (Date.now() - new Date(lastDataReceived).getTime()) / 1000
                  )}s ago`}
              </div>
            </div>
          </div>
        );

      case "NOT_CONNECTED":
        return (
          <div className="flex items-center gap-3 text-orange-600 dark:text-orange-400">
            <div className="p-2 rounded-lg bg-orange-50 dark:bg-orange-900/20">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <div className="font-semibold text-sm">
                {lastDataReceived ? "Idle (2+ minutes)" : "Not Receiving Data"}
              </div>
              <div className="text-xs opacity-75">
                {lastDataReceived
                  ? "Device stopped sending data - may be offline or sleeping"
                  : isSubscribed
                  ? "Subscribed but no data received yet"
                  : "Click to subscribe for real-time updates"}
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="flex items-center gap-3 text-slate-600 dark:text-slate-400">
            <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <div className="font-semibold text-sm">Connecting...</div>
              <div className="text-xs opacity-75">Establishing connection</div>
            </div>
          </div>
        );
    }
  }, [isConnected, connectionStatus, isSubscribed, lastDataReceived]);

  const handleSettingsClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setIsSettingsOpen(true);
      setEditedDevice(device);
    },
    [device]
  );

  const handleCloseSettings = useCallback(() => {
    setIsSettingsOpen(false);
    setIsEditing(false);
    setEditedDevice(device);
  }, [device]);

  const handleSaveChanges = useCallback(() => {
    toast.success(`Device "${editedDevice.name}" updated successfully!`);
    setIsEditing(false);
  }, [editedDevice.name]);

  const handleDeviceAction = useCallback(
    (action: string) => {
      switch (action) {
        case "restart":
          toast.info(`Restarting device "${device.name}"...`);
          break;
        case "update":
          toast.info(`Updating firmware for "${device.name}"...`);
          break;
        case "delete":
          toast.warning(`Device "${device.name}" scheduled for removal`);
          api.delete(`/devices/${device.id}`);
          break;
        case "toggle":
          const newStatus = displayStatus === "ONLINE" ? "OFFLINE" : "ONLINE";
          toast.info(`Setting device "${device.name}" to ${newStatus}`);
          break;
      }
      setIsSettingsOpen(false);
    },
    [device.name, displayStatus]
  );

  const cardVariants = animationsEnabled
    ? {
        initial: { opacity: 0, y: 30, scale: 0.95 },
        animate: {
          opacity: 1,
          y: 0,
          scale: 1,
          transition: { duration: 0.5, ease: "easeOut" },
        },
        hover: {
          scale: 1.02,
          y: -4,
          transition: { type: "spring", stiffness: 400, damping: 25 },
        },
      }
    : {};

  // Memoize status style and device config
  const statusStyle = useMemo(
    () =>
      StatusColors[displayStatus as keyof typeof StatusColors] ||
      StatusColors.OFFLINE,
    [displayStatus]
  );

  const deviceConfig = useMemo(
    () =>
      DeviceTypeConfig[device.type as keyof typeof DeviceTypeConfig] ||
      DeviceTypeConfig.default,
    [device.type]
  );

  // Updated format latest data function to handle the correct data structure
  const formatLatestData = useCallback(() => {
    if (!realtimeData) return null;

    const entries = [];

    // Handle the nested sensor readings (indexed by numbers)
    const sensorReadings = Object.keys(realtimeData)
      .filter((key) => /^\d+$/.test(key)) // Only numeric keys
      .map((key) => realtimeData[key])
      .filter((reading) => reading && typeof reading === "object");

    // Add sensor readings
    sensorReadings.forEach((reading, index) => {
      if (
        reading.metric &&
        reading.value !== undefined &&
        reading.value !== null
      ) {
        entries.push({
          label: formatMetricName(reading.metric),
          value: `${reading.value}${
            reading.unit ? ` °${reading.unit.charAt(0).toUpperCase()}` : ""
          }`,
          icon: getMetricIcon(reading.metric),
          timestamp: reading.timestamp,
          isReading: true,
        });
      }
    });

    // Add device-level data
    if (realtimeData.deviceId) {
      entries.push({
        label: "Device ID",
        value: formatDeviceId(realtimeData.deviceId),
        icon: <Hash className="w-4 h-4" />,
        isReading: false,
      });
    }

    // Add battery level if available
    if (
      realtimeData.batteryLevel !== undefined &&
      realtimeData.batteryLevel !== null
    ) {
      entries.push({
        label: "Battery Level",
        value: `${realtimeData.batteryLevel}%`,
        icon: <Battery className="w-4 h-4" />,
        isReading: false,
      });
    }

    // Add device status if available
    if (realtimeData.status) {
      entries.push({
        label: "Device Status",
        value: realtimeData.status,
        icon: <Activity className="w-4 h-4" />,
        isReading: false,
      });
    }

    // Add main timestamp
    if (realtimeData.timestamp) {
      entries.push({
        label: "Last Update",
        value: new Date(realtimeData.timestamp).toLocaleString(),
        icon: <Clock className="w-4 h-4" />,
        isReading: false,
      });
    }

    return entries;
  }, [realtimeData]);

  // Get the latest sensor reading for display on the card
  const getLatestSensorReading = useCallback(() => {
    if (!realtimeData) return null;

    const sensorReadings = Object.keys(realtimeData)
      .filter((key) => /^\d+$/.test(key))
      .map((key) => realtimeData[key])
      .filter((reading) => reading && typeof reading === "object");

    if (sensorReadings.length === 0) return null;

    // Get the most recent reading
    const latestReading = sensorReadings.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )[0];

    return latestReading;
  }, [realtimeData]);

  const latestReading = getLatestSensorReading();

  return (
    <>
      <motion.div
        variants={cardVariants}
        initial="initial"
        animate="animate"
        whileHover={animationsEnabled ? "hover" : undefined}
        onClick={() => onSelect(device)}
        className="cursor-pointer h-full group w-full max-w-sm mx-auto relative"
      >
        <Card
          className={cn(
            "border-2 overflow-hidden transition-all duration-300 h-full flex flex-col min-h-[450px]",
            "hover:shadow-2xl backdrop-blur-sm bg-white/90 dark:bg-slate-900/90",
            statusStyle.border,
            statusStyle.glow,
            "group-hover:border-opacity-100 group-hover:-translate-y-1"
          )}
        >
          <CardHeader
            className={cn("relative overflow-hidden p-6", statusStyle.bg)}
          >
            {/* Enhanced background effects */}
            <div className="absolute inset-0">
              <div className="absolute inset-0 bg-gradient-to-r from-white/20 via-transparent to-white/10 dark:from-slate-800/20 dark:via-transparent dark:to-slate-800/10" />
              {connectionStatus === "RECEIVING_DATA" && isLiveDataActive && (
                <motion.div
                  className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-400/60 to-transparent"
                  animate={{ x: ["-100%", "200%"] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                />
              )}
            </div>

            <div className="relative flex justify-between items-start">
              <div className="flex items-start space-x-4 flex-1 min-w-0">
                <div
                  className={cn(
                    "p-3 rounded-2xl shadow-md backdrop-blur-sm transition-all duration-300 flex-shrink-0",
                    "bg-white/95 dark:bg-slate-800/95 border border-white/50 dark:border-slate-700/50",
                    "group-hover:scale-110 group-hover:rotate-6 group-hover:shadow-lg"
                  )}
                >
                  <div className={deviceConfig.color}>{deviceConfig.icon}</div>
                </div>

                <div className="flex-1 min-w-0 space-y-2">
                  <div>
                    <CardTitle className="text-lg font-bold text-foreground leading-tight truncate">
                      {device.name}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1 font-medium">
                      {deviceConfig.label}
                    </p>
                  </div>

                  {/* STATUS BADGE MOVED UNDER SENSOR NAME */}
                  <Badge
                    variant="secondary"
                    className={cn(
                      "px-3 py-1.5 text-xs font-bold rounded-full uppercase tracking-wider inline-flex items-center gap-1.5",
                      statusStyle.badgeStyle,
                      connectionStatus === "RECEIVING_DATA" &&
                        isLiveDataActive &&
                        "animate-pulse"
                    )}
                  >
                    {statusStyle.icon}
                    <span>
                      {displayStatus === "NOT_CONNECTED"
                        ? "NOT CONNECTED"
                        : displayStatus}
                    </span>
                  </Badge>
                </div>
              </div>

              <div className="flex flex-col items-end gap-3 ml-3">
                {/* Settings Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 p-0 hover:bg-white/50 dark:hover:bg-slate-800/50 backdrop-blur-sm border border-white/30 dark:border-slate-700/30 shadow-sm"
                  onClick={handleSettingsClick}
                >
                  <Settings className="w-4 h-4" />
                </Button>

                {/* Enhanced status indicator */}
                <div className="relative">
                  <div
                    className={cn(
                      "w-3 h-3 rounded-full shadow-lg",
                      statusStyle.dot
                    )}
                  />
                  {connectionStatus === "RECEIVING_DATA" &&
                    isLiveDataActive && (
                      <motion.div
                        className="absolute inset-0 w-3 h-3 rounded-full bg-emerald-500 opacity-40"
                        animate={{ scale: [1, 2, 1], opacity: [0.4, 0, 0.4] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                    )}
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6 flex-grow space-y-5">
            {/* Latest Sensor Reading Display */}
            {latestReading && isLiveDataActive && (
              <div className="p-4 rounded-xl bg-gradient-to-r from-blue-50/50 to-blue-100/50 dark:from-blue-900/30 dark:to-blue-800/30 border border-blue-200/50 dark:border-blue-700/50">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-bold mb-3 flex items-center gap-1">
                  {getMetricIcon(latestReading.metric)}
                  Latest Reading
                </div>
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                      {formatMetricName(latestReading.metric)}
                    </div>
                    <div className="text-xs text-blue-600 dark:text-blue-400">
                      {new Date(latestReading.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-blue-800 dark:text-blue-200">
                      {latestReading.value}
                    </div>
                    {latestReading.unit && (
                      <div className="text-sm text-blue-600 dark:text-blue-400">
                        °{latestReading.unit.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Real-time Connection Status - Enhanced */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-slate-50/50 to-slate-100/50 dark:from-slate-800/30 dark:to-slate-700/30 border border-slate-200/50 dark:border-slate-700/50">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-bold mb-3 flex items-center gap-1">
                <Activity className="w-3 h-3" />
                Connection Status
              </div>
              {getConnectionStatusDisplay()}
            </div>

            {/* Device Information Cards */}
            <div className="grid grid-cols-1 gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2 p-3 rounded-xl bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-700/50">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-1">
                    <Hash className="w-3 h-3" />
                    Device ID
                  </div>
                  <div className="text-xs font-mono text-foreground/90 font-medium">
                    {formatDeviceId(device.id)}
                  </div>
                </div>

                <div className="space-y-2 p-3 rounded-xl bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-700/50">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-1">
                    <Cpu className="w-3 h-3" />
                    Firmware
                  </div>
                  <div className="text-xs font-semibold text-foreground">
                    {device.firmware || "Not Available"}
                  </div>
                </div>
              </div>

              {device.location && (
                <div className="space-y-2 p-3 rounded-xl bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-700/50">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    Location
                  </div>
                  <div className="text-sm font-medium text-foreground flex items-center gap-2">
                    <span className="truncate">{device.location}</span>
                    {device.latitude && device.longitude && (
                      <Badge
                        variant="secondary"
                        className="text-[9px] px-2 py-0.5"
                      >
                        GPS
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              {device.ipAddress && (
                <div className="space-y-2 p-3 rounded-xl bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-700/50">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-1">
                    <Wifi className="w-3 h-3" />
                    IP Address
                  </div>
                  <div className="text-sm font-mono text-foreground font-medium">
                    {device.ipAddress}
                  </div>
                </div>
              )}
            </div>

            {/* Battery Display */}
            {getBatteryDisplay()}

            {/* Live Data Indicator - Only show when isLiveDataActive is true */}
            {realtimeData && isLiveDataActive && (
              <div className="space-y-2 p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-900/30 border border-emerald-200/50 dark:border-emerald-700/50">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-1">
                  <CheckCircle className="w-3 h-3 text-emerald-500" />
                  Live Data Active
                </div>
                <div className="text-xs text-emerald-600 dark:text-emerald-400">
                  Receiving real-time updates from device
                </div>
              </div>
            )}

            {/* Idle Warning - Show when device was active but went idle */}
            {realtimeData && !isLiveDataActive && lastDataReceived && (
              <div className="space-y-2 p-4 rounded-xl bg-orange-50/50 dark:bg-orange-900/30 border border-orange-200/50 dark:border-orange-700/50">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-1">
                  <Clock className="w-3 h-3 text-orange-500" />
                  Device Idle
                </div>
                <div className="text-xs text-orange-600 dark:text-orange-400">
                  No data received for 2+ minutes - device may be offline
                </div>
              </div>
            )}
          </CardContent>

          <CardFooter className="p-5 border-t-2 border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/80 backdrop-blur-sm">
            <div className="flex justify-between items-center w-full">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span className="font-semibold text-sm">Last Activity</span>
              </div>
              <div
                className={cn(
                  "font-bold text-sm px-3 py-1.5 rounded-lg",
                  currentLastSeen &&
                    connectionStatus === "RECEIVING_DATA" &&
                    isLiveDataActive
                    ? "text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/30"
                    : "text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800"
                )}
              >
                {formatLastSeen(currentLastSeen)}
              </div>
            </div>
          </CardFooter>
        </Card>
      </motion.div>

      {/* Enhanced Settings Panel with Latest Socket Data */}
      <AnimatePresence>
        {isSettingsOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
              onClick={handleCloseSettings}
            />
            <motion.div
              initial={{ x: "100%", opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "100%", opacity: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="fixed right-0 top-0 h-full w-full max-w-md bg-white dark:bg-slate-900 shadow-2xl z-50 overflow-y-auto"
            >
              <div className="p-6 space-y-6">
                <div className="flex items-center justify-between border-b pb-4">
                  <div className="flex items-center gap-3">
                    <div className={cn("p-3 rounded-xl", statusStyle.bg)}>
                      <div className={deviceConfig.color}>
                        {deviceConfig.icon}
                      </div>
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">{device.name}</h2>
                      <p className="text-sm text-muted-foreground">
                        {deviceConfig.label}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCloseSettings}
                    className="h-9 w-9 p-0"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                {/* Latest Socket Data Section */}
                {realtimeData &&
                  formatLatestData() &&
                  formatLatestData()!.length > 0 && (
                    <>
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                          <Database className="w-5 h-5" />
                          Latest Socket Data
                        </h3>
                        <div className="space-y-3">
                          {formatLatestData()?.map((entry, index) => (
                            <div
                              key={index}
                              className={cn(
                                "flex items-center justify-between p-3 rounded-lg border transition-colors",
                                entry.isReading
                                  ? "bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 border-blue-200 dark:border-blue-700"
                                  : "bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 border-slate-200 dark:border-slate-600"
                              )}
                            >
                              <div className="flex items-center gap-2 text-muted-foreground">
                                {entry.icon}
                                <span className="font-medium text-sm">
                                  {entry.label}
                                </span>
                              </div>
                              <div className="text-right">
                                <span className="font-bold text-sm text-foreground block">
                                  {entry.value}
                                </span>
                                {entry.timestamp && entry.isReading && (
                                  <span className="text-xs text-muted-foreground">
                                    {new Date(
                                      entry.timestamp
                                    ).toLocaleTimeString()}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Real-time indicator */}
                        {isLiveDataActive && (
                          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-xs">
                            <motion.div
                              className="w-2 h-2 rounded-full bg-emerald-500"
                              animate={{
                                scale: [1, 1.5, 1],
                                opacity: [1, 0.5, 1],
                              }}
                              transition={{ duration: 2, repeat: Infinity }}
                            />
                            <span>Data updates in real-time</span>
                          </div>
                        )}
                      </div>
                      <Separator />
                    </>
                  )}

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Signal className="w-5 h-5" />
                    Connection Status
                  </h3>
                  <div className="p-4 rounded-xl border bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700">
                    {getConnectionStatusDisplay()}

                    {/* Additional info about 2-minute timeout */}
                    <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-600">
                      <div className="text-xs text-muted-foreground">
                        <div className="flex items-center gap-1 mb-2">
                          <Clock className="w-3 h-3" />
                          <span className="font-semibold">Timeout Policy:</span>
                        </div>
                        <p className="leading-relaxed">
                          Devices are marked as "Not Connected" after 2 minutes
                          of inactivity. This helps identify sleeping or offline
                          devices.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Zap className="w-5 h-5" />
                    Quick Actions
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      variant="outline"
                      onClick={() => handleDeviceAction("toggle")}
                      className="flex items-center gap-2 h-12"
                    >
                      <Power className="w-4 h-4" />
                      {displayStatus === "ONLINE" ? "Turn Off" : "Turn On"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleDeviceAction("restart")}
                      className="flex items-center gap-2 h-12"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Restart
                    </Button>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Danger Zone
                  </h3>
                  <Button
                    variant="destructive"
                    onClick={() => handleDeviceAction("delete")}
                    className="w-full flex items-center gap-2 h-12"
                  >
                    <Trash2 className="w-4 h-4" />
                    Remove Device
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
