"use client";
import { motion, AnimatePresence } from "framer-motion";
import { useAppearance } from "@/context/AppearanceContext";
import { useState, useCallback, useMemo, useEffect } from "react";
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
  Gauge,
  Camera,
  Plug,
  Eye,
  Waves,
  Play,
  Pause,
  RotateCcw,
  Maximize2,
  Filter,
  Search,
  ChevronDown,
  SortAsc,
  SortDesc,
  Grid,
  List,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
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
} as const;

// Define device metric interface
interface DeviceMetric {
  name: string;
  value: any;
  unit: string;
  icon: React.ReactNode;
}

interface ParsedDeviceData {
  primary: DeviceMetric;
  secondary?: DeviceMetric[];
}

// Enhanced device type configurations with data parsing logic
const DeviceTypeConfig = {
  TEMPERATURE_SENSOR: {
    icon: <Thermometer className="w-5 h-5" />,
    label: "Temperature Sensor",
    color: "text-orange-600 dark:text-orange-400",
    primaryMetric: "temperature",
    parseData: (data: any): ParsedDeviceData | null => {
      if (!data) return null;

      // Handle structured data format
      if (data.structuredData?.metrics) {
        const primary = data.structuredData.metrics.primary;
        const secondary = data.structuredData.metrics.secondary || [];

        return {
          primary: {
            name: primary.name,
            value: primary.value,
            unit: primary.unit,
            icon: <Thermometer className="w-4 h-4" />,
          },
          secondary: secondary.slice(0, 2).map((metric: any) => ({
            name: metric.name,
            value: metric.value,
            unit: metric.unit,
            icon:
              metric.name === "humidity" ? (
                <Droplets className="w-4 h-4" />
              ) : (
                <BarChart3 className="w-4 h-4" />
              ),
          })),
        };
      }

      // Handle raw data format
      if (data.temperature !== undefined) {
        return {
          primary: {
            name: "Temperature",
            value: data.temperature,
            unit: data.unit === "celsius" ? "°C" : "°F",
            icon: <Thermometer className="w-4 h-4" />,
          },
          secondary: [
            data.humidity && {
              name: "Humidity",
              value: data.humidity,
              unit: "%",
              icon: <Droplets className="w-4 h-4" />,
            },
            data.pressure && {
              name: "Pressure",
              value: data.pressure,
              unit: "bar",
              icon: <BarChart3 className="w-4 h-4" />,
            },
          ].filter(Boolean) as DeviceMetric[],
        };
      }

      return null;
    },
  },
  HUMIDITY_SENSOR: {
    icon: <Droplets className="w-5 h-5" />,
    label: "Humidity Sensor",
    color: "text-blue-600 dark:text-blue-400",
    primaryMetric: "humidity",
    parseData: (data: any): ParsedDeviceData | null => {
      if (!data) return null;

      if (data.structuredData?.metrics) {
        const primary = data.structuredData.metrics.primary;
        const secondary = data.structuredData.metrics.secondary || [];

        return {
          primary: {
            name: primary.name,
            value: primary.value,
            unit: primary.unit,
            icon: <Droplets className="w-4 h-4" />,
          },
          secondary: secondary.slice(0, 2).map((metric: any) => ({
            name: metric.name,
            value: metric.value,
            unit: metric.unit,
            icon: metric.name.includes("temperature") ? (
              <Thermometer className="w-4 h-4" />
            ) : (
              <TrendingUp className="w-4 h-4" />
            ),
          })),
        };
      }

      if (data.humidity !== undefined) {
        return {
          primary: {
            name: "Humidity",
            value: data.humidity,
            unit: "%",
            icon: <Droplets className="w-4 h-4" />,
          },
          secondary: [
            data.temperature && {
              name: "Temperature",
              value: data.temperature,
              unit: "°C",
              icon: <Thermometer className="w-4 h-4" />,
            },
            data.dewPoint && {
              name: "Dew Point",
              value: data.dewPoint,
              unit: "°C",
              icon: <TrendingUp className="w-4 h-4" />,
            },
          ].filter(Boolean) as DeviceMetric[],
        };
      }

      return null;
    },
  },
  SMART_LIGHT: {
    icon: <Lightbulb className="w-5 h-5" />,
    label: "Smart Light",
    color: "text-yellow-600 dark:text-yellow-400",
    primaryMetric: "status",
    parseData: (data: any): ParsedDeviceData | null => {
      if (!data) return null;

      if (data.structuredData?.metrics) {
        const primary = data.structuredData.metrics.primary;
        const secondary = data.structuredData.metrics.secondary || [];

        return {
          primary: {
            name: primary.name,
            value: primary.value,
            unit: primary.unit,
            icon: <Lightbulb className="w-4 h-4" />,
          },
          secondary: secondary.slice(0, 2).map((metric: any) => ({
            name: metric.name,
            value: metric.value,
            unit: metric.unit,
            icon:
              metric.name === "brightness" ? (
                <Eye className="w-4 h-4" />
              ) : (
                <Zap className="w-4 h-4" />
              ),
          })),
        };
      }

      if (data.status !== undefined) {
        return {
          primary: {
            name: "Status",
            value: data.status,
            unit: "",
            icon: <Lightbulb className="w-4 h-4" />,
          },
          secondary: [
            data.brightness && {
              name: "Brightness",
              value: data.brightness,
              unit: "%",
              icon: <Eye className="w-4 h-4" />,
            },
            data.powerConsumption && {
              name: "Power",
              value: data.powerConsumption,
              unit: "W",
              icon: <Zap className="w-4 h-4" />,
            },
          ].filter(Boolean) as DeviceMetric[],
        };
      }

      return null;
    },
  },
  SMART_PLUG: {
    icon: <Plug className="w-5 h-5" />,
    label: "Smart Plug",
    color: "text-green-600 dark:text-green-400",
    primaryMetric: "powerConsumption",
    parseData: (data: any): ParsedDeviceData | null => {
      if (!data) return null;

      if (data.structuredData?.metrics) {
        const primary = data.structuredData.metrics.primary;
        const secondary = data.structuredData.metrics.secondary || [];

        return {
          primary: {
            name: primary.name,
            value: primary.value,
            unit: primary.unit,
            icon: <Zap className="w-4 h-4" />,
          },
          secondary: secondary.slice(0, 2).map((metric: any) => ({
            name: metric.name,
            value: metric.value,
            unit: metric.unit,
            icon: <TrendingUp className="w-4 h-4" />,
          })),
        };
      }

      if (data.powerConsumption !== undefined) {
        return {
          primary: {
            name: "Power Consumption",
            value: data.powerConsumption,
            unit: "W",
            icon: <Zap className="w-4 h-4" />,
          },
          secondary: [
            data.voltage && {
              name: "Voltage",
              value: data.voltage,
              unit: "V",
              icon: <TrendingUp className="w-4 h-4" />,
            },
            data.current && {
              name: "Current",
              value: data.current,
              unit: "A",
              icon: <TrendingUp className="w-4 h-4" />,
            },
          ].filter(Boolean) as DeviceMetric[],
        };
      }

      return null;
    },
  },
  WATER_METER: {
    icon: <Droplets className="w-5 h-5" />,
    label: "Water Meter",
    color: "text-blue-600 dark:text-blue-400",
    primaryMetric: "flowRate",
    parseData: (data: any): ParsedDeviceData | null => {
      if (!data) return null;

      if (data.structuredData?.metrics) {
        const primary = data.structuredData.metrics.primary;
        const secondary = data.structuredData.metrics.secondary || [];

        return {
          primary: {
            name: primary.name,
            value: primary.value,
            unit: primary.unit,
            icon: <Droplets className="w-4 h-4" />,
          },
          secondary: secondary.slice(0, 2).map((metric: any) => ({
            name: metric.name,
            value: metric.value,
            unit: metric.unit,
            icon: <TrendingUp className="w-4 h-4" />,
          })),
        };
      }

      if (data.flowRate !== undefined) {
        return {
          primary: {
            name: "Flow Rate",
            value: data.flowRate,
            unit: "L/min",
            icon: <Droplets className="w-4 h-4" />,
          },
          secondary: [
            data.totalVolume && {
              name: "Total Volume",
              value: data.totalVolume,
              unit: "L",
              icon: <Database className="w-4 h-4" />,
            },
            data.pressure && {
              name: "Pressure",
              value: data.pressure,
              unit: "bar",
              icon: <Gauge className="w-4 h-4" />,
            },
          ].filter(Boolean) as DeviceMetric[],
        };
      }

      return null;
    },
  },
  ENERGY_METER: {
    icon: <Zap className="w-5 h-5" />,
    label: "Energy Meter",
    color: "text-purple-600 dark:text-purple-400",
    primaryMetric: "powerUsage",
    parseData: (data: any): ParsedDeviceData | null => {
      if (!data) return null;

      if (data.structuredData?.metrics) {
        const primary = data.structuredData.metrics.primary;
        const secondary = data.structuredData.metrics.secondary || [];

        return {
          primary: {
            name: primary.name,
            value: primary.value,
            unit: primary.unit,
            icon: <Zap className="w-4 h-4" />,
          },
          secondary: secondary.slice(0, 2).map((metric: any) => ({
            name: metric.name,
            value: metric.value,
            unit: metric.unit,
            icon: <TrendingUp className="w-4 h-4" />,
          })),
        };
      }

      if (data.powerUsage !== undefined) {
        return {
          primary: {
            name: "Power Usage",
            value: data.powerUsage,
            unit: "W",
            icon: <Zap className="w-4 h-4" />,
          },
          secondary: [
            data.totalEnergy && {
              name: "Total Energy",
              value: data.totalEnergy,
              unit: "kWh",
              icon: <Database className="w-4 h-4" />,
            },
            data.cost && {
              name: "Cost",
              value: data.cost,
              unit: "$",
              icon: <TrendingUp className="w-4 h-4" />,
            },
          ].filter(Boolean) as DeviceMetric[],
        };
      }

      return null;
    },
  },
  CAMERA: {
    icon: <Camera className="w-5 h-5" />,
    label: "Camera",
    color: "text-indigo-600 dark:text-indigo-400",
    primaryMetric: "status",
    parseData: (data: any): ParsedDeviceData | null => {
      if (!data) return null;

      if (data.structuredData?.metrics) {
        const primary = data.structuredData.metrics.primary;
        const secondary = data.structuredData.metrics.secondary || [];

        return {
          primary: {
            name: primary.name,
            value: primary.value,
            unit: primary.unit,
            icon: <Camera className="w-4 h-4" />,
          },
          secondary: secondary.slice(0, 2).map((metric: any) => ({
            name: metric.name,
            value: metric.value,
            unit: metric.unit,
            icon:
              metric.name === "motionDetected" ? (
                <Activity className="w-4 h-4" />
              ) : (
                <Battery className="w-4 h-4" />
              ),
          })),
        };
      }

      if (data.status !== undefined) {
        return {
          primary: {
            name: "Status",
            value: data.status,
            unit: "",
            icon: <Camera className="w-4 h-4" />,
          },
          secondary: [
            data.motionDetected !== undefined && {
              name: "Motion",
              value: data.motionDetected ? "Detected" : "Clear",
              unit: "",
              icon: <Activity className="w-4 h-4" />,
            },
            data.batteryLevel && {
              name: "Battery",
              value: data.batteryLevel,
              unit: "%",
              icon: <Battery className="w-4 h-4" />,
            },
          ].filter(Boolean) as DeviceMetric[],
        };
      }

      return null;
    },
  },
  MOTION_DETECTOR: {
    icon: <Activity className="w-5 h-5" />,
    label: "Motion Detector",
    color: "text-yellow-600 dark:text-yellow-400",
    primaryMetric: "motion",
    parseData: (data: any): ParsedDeviceData | null => {
      if (!data) return null;

      if (data.structuredData?.metrics) {
        const primary = data.structuredData.metrics.primary;
        const secondary = data.structuredData.metrics.secondary || [];

        return {
          primary: {
            name: primary.name,
            value: primary.value,
            unit: primary.unit,
            icon: <Activity className="w-4 h-4" />,
          },
          secondary: secondary.slice(0, 2).map((metric: any) => ({
            name: metric.name,
            value: metric.value,
            unit: metric.unit || "",
            icon: <TrendingUp className="w-4 h-4" />,
          })),
        };
      }

      if (data.motion !== undefined) {
        return {
          primary: {
            name: "Motion",
            value: data.motion ? "Detected" : "Clear",
            unit: "",
            icon: <Activity className="w-4 h-4" />,
          },
          secondary: [
            data.confidence && {
              name: "Confidence",
              value: data.confidence,
              unit: "%",
              icon: <TrendingUp className="w-4 h-4" />,
            },
            data.zone && {
              name: "Zone",
              value: data.zone,
              unit: "",
              icon: <MapPin className="w-4 h-4" />,
            },
          ].filter(Boolean) as DeviceMetric[],
        };
      }

      return null;
    },
  },
  OTHER: {
    icon: <Cpu className="w-5 h-5" />,
    label: "Generic Sensor",
    color: "text-slate-600 dark:text-slate-400",
    primaryMetric: "primaryMetric",
    parseData: (data: any): ParsedDeviceData | null => {
      if (!data) return null;

      // Handle structured format
      if (data.structuredData?.metrics) {
        const primary = data.structuredData.metrics.primary;
        const secondary = data.structuredData.metrics.secondary || [];

        return {
          primary: {
            name: primary.name || "Primary Metric",
            value: primary.value,
            unit: primary.unit || "",
            icon: <TrendingUp className="w-4 h-4" />,
          },
          secondary: secondary.slice(0, 2).map((metric: any) => ({
            name: metric.name || "Secondary Metric",
            value: metric.value,
            unit: metric.unit || "",
            icon: <TrendingUp className="w-4 h-4" />,
          })),
        };
      }

      // Handle direct primaryMetric format
      if (data.primaryMetric) {
        return {
          primary: {
            name: data.primaryMetric.name || "Primary Metric",
            value: data.primaryMetric.value,
            unit: data.primaryMetric.unit || "",
            icon: <TrendingUp className="w-4 h-4" />,
          },
          secondary: (data.secondaryMetrics || [])
            .slice(0, 2)
            .map((metric: any) => ({
              name: metric.name || "Secondary Metric",
              value: metric.value,
              unit: metric.unit || "",
              icon: <TrendingUp className="w-4 h-4" />,
            })),
        };
      }

      return null;
    },
  },
  default: {
    icon: <Cpu className="w-5 h-5" />,
    label: "Device",
    color: "text-slate-600 dark:text-slate-400",
    primaryMetric: "value",
    parseData: (data: any): ParsedDeviceData | null => {
      if (!data) return null;

      // Try to find any meaningful data
      const keys = Object.keys(data);
      const numericKeys = keys.filter((key) => typeof data[key] === "number");

      if (numericKeys.length > 0) {
        return {
          primary: {
            name: numericKeys[0],
            value: data[numericKeys[0]],
            unit: "",
            icon: <TrendingUp className="w-4 h-4" />,
          },
          secondary: numericKeys.slice(1, 3).map((key) => ({
            name: key,
            value: data[key],
            unit: "",
            icon: <TrendingUp className="w-4 h-4" />,
          })),
        };
      }

      return null;
    },
  },
} as const;

// Helper function to format metric name for display
const formatMetricName = (name: string) => {
  if (!name) return "Unknown Metric";
  return name
    .split(/[_\s]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

// Helper function to format device ID
const formatDeviceId = (id: string) => {
  return `${id.substring(0, 8)}...${id.substring(id.length - 4)}`;
};

// Helper function to format timestamp
const formatTimestamp = (timestamp: string) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffSeconds < 60) return `${diffSeconds}s ago`;
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
  if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;

  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Filter and Sort Types
export type SortOption = "name" | "type" | "status" | "lastSeen" | "battery";
export type ViewMode = "grid" | "list";

export interface DeviceFilters {
  search: string;
  status: string[];
  type: string[];
  hasLocation: boolean | null;
  hasBattery: boolean | null;
  sortBy: SortOption;
  sortOrder: "asc" | "desc";
  viewMode: ViewMode;
}

// Filter Bar Component
interface DeviceFilterBarProps {
  devices: Device[];
  filters: DeviceFilters;
  onFiltersChange: (filters: DeviceFilters) => void;
  deviceCount: number;
  filteredCount: number;
}

const DeviceFilterBar: React.FC<DeviceFilterBarProps> = ({
  devices,
  filters,
  onFiltersChange,
  deviceCount,
  filteredCount,
}) => {
  const { animationsEnabled } = useAppearance();

  const updateFilter = useCallback(
    (key: keyof DeviceFilters, value: any) => {
      onFiltersChange({ ...filters, [key]: value });
    },
    [filters, onFiltersChange]
  );

  const clearFilters = useCallback(() => {
    onFiltersChange({
      search: "",
      status: [],
      type: [],
      hasLocation: null,
      hasBattery: null,
      sortBy: "name",
      sortOrder: "asc",
      viewMode: "grid",
    });
  }, [onFiltersChange]);

  // Get unique statuses and types from devices
  const uniqueStatuses = useMemo(
    () => [...new Set(devices.map((d) => d.status))],
    [devices]
  );
  const uniqueTypes = useMemo(
    () => [...new Set(devices.map((d) => d.type))],
    [devices]
  );

  const hasActiveFilters = useMemo(
    () =>
      filters.search ||
      filters.status.length > 0 ||
      filters.type.length > 0 ||
      filters.hasLocation !== null ||
      filters.hasBattery !== null,
    [filters]
  );

  return (
    <motion.div
      initial={animationsEnabled ? { opacity: 0, y: -20 } : undefined}
      animate={animationsEnabled ? { opacity: 1, y: 0 } : undefined}
      className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 p-6 space-y-4 backdrop-blur-sm"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-3">
            <Filter className="w-6 h-6 text-blue-600" />
            Device Management
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {filteredCount === deviceCount
              ? `${deviceCount} device${deviceCount !== 1 ? "s" : ""} total`
              : `${filteredCount} of ${deviceCount} device${
                  deviceCount !== 1 ? "s" : ""
                } shown`}
          </p>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-2">
          <Button
            variant={filters.viewMode === "grid" ? "default" : "outline"}
            size="sm"
            onClick={() => updateFilter("viewMode", "grid")}
            className="h-10 px-4"
          >
            <Grid className="w-4 h-4" />
          </Button>
          <Button
            variant={filters.viewMode === "list" ? "default" : "outline"}
            size="sm"
            onClick={() => updateFilter("viewMode", "list")}
            className="h-10 px-4"
          >
            <List className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Filters Row */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search devices..."
            value={filters.search}
            onChange={(e) => updateFilter("search", e.target.value)}
            className="pl-10 h-10"
          />
        </div>

        {/* Status Filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="h-10 gap-2">
              <Signal className="w-4 h-4" />
              Status
              {filters.status.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-2">
                  {filters.status.length}
                </Badge>
              )}
              <ChevronDown className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            {uniqueStatuses.map((status) => (
              <DropdownMenuCheckboxItem
                key={status}
                checked={filters.status.includes(status)}
                onCheckedChange={(checked) => {
                  if (checked) {
                    updateFilter("status", [...filters.status, status]);
                  } else {
                    updateFilter(
                      "status",
                      filters.status.filter((s) => s !== status)
                    );
                  }
                }}
              >
                <div className="flex items-center gap-2">
                  {StatusColors[status as keyof typeof StatusColors]?.icon}
                  {status}
                </div>
              </DropdownMenuCheckboxItem>
            ))}
            {filters.status.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => updateFilter("status", [])}>
                  Clear Status Filters
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Type Filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="h-10 gap-2">
              <Cpu className="w-4 h-4" />
              Type
              {filters.type.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-2">
                  {filters.type.length}
                </Badge>
              )}
              <ChevronDown className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64">
            {uniqueTypes.map((type) => {
              const typeConfig =
                DeviceTypeConfig[type as keyof typeof DeviceTypeConfig] ||
                DeviceTypeConfig.default;
              return (
                <DropdownMenuCheckboxItem
                  key={type}
                  checked={filters.type.includes(type)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      updateFilter("type", [...filters.type, type]);
                    } else {
                      updateFilter(
                        "type",
                        filters.type.filter((t) => t !== type)
                      );
                    }
                  }}
                >
                  <div className="flex items-center gap-2">
                    <div className={typeConfig.color}>{typeConfig.icon}</div>
                    <div>
                      <div className="font-medium">{typeConfig.label}</div>
                      <div className="text-xs text-muted-foreground">
                        {type}
                      </div>
                    </div>
                  </div>
                </DropdownMenuCheckboxItem>
              );
            })}
            {filters.type.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => updateFilter("type", [])}>
                  Clear Type Filters
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Additional Filters */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="h-10 gap-2">
              <Settings className="w-4 h-4" />
              More
              <ChevronDown className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuCheckboxItem
              checked={filters.hasLocation === true}
              onCheckedChange={(checked) =>
                updateFilter("hasLocation", checked ? true : null)
              }
            >
              <MapPin className="w-4 h-4 mr-2" />
              Has Location
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={filters.hasBattery === true}
              onCheckedChange={(checked) =>
                updateFilter("hasBattery", checked ? true : null)
              }
            >
              <Battery className="w-4 h-4 mr-2" />
              Has Battery
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Sort */}
        <Select
          value={`${filters.sortBy}-${filters.sortOrder}`}
          onValueChange={(value) => {
            const [sortBy, sortOrder] = value.split("-") as [
              SortOption,
              "asc" | "desc"
            ];
            updateFilter("sortBy", sortBy);
            updateFilter("sortOrder", sortOrder);
          }}
        >
          <SelectTrigger className="w-40 h-10">
            <div className="flex items-center gap-2">
              {filters.sortOrder === "asc" ? (
                <SortAsc className="w-4 h-4" />
              ) : (
                <SortDesc className="w-4 h-4" />
              )}
              <SelectValue />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name-asc">Name A-Z</SelectItem>
            <SelectItem value="name-desc">Name Z-A</SelectItem>
            <SelectItem value="type-asc">Type A-Z</SelectItem>
            <SelectItem value="type-desc">Type Z-A</SelectItem>
            <SelectItem value="status-asc">Status A-Z</SelectItem>
            <SelectItem value="status-desc">Status Z-A</SelectItem>
            <SelectItem value="lastSeen-desc">Recently Active</SelectItem>
            <SelectItem value="lastSeen-asc">Oldest Active</SelectItem>
            <SelectItem value="battery-desc">Battery High-Low</SelectItem>
            <SelectItem value="battery-asc">Battery Low-High</SelectItem>
          </SelectContent>
        </Select>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <Button
            variant="outline"
            size="sm"
            onClick={clearFilters}
            className="h-10 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            <X className="w-4 h-4 mr-2" />
            Clear All
          </Button>
        )}
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Active filters:</span>
          {filters.search && (
            <Badge variant="secondary" className="gap-1">
              Search: "{filters.search}"
              <X
                className="w-3 h-3 cursor-pointer"
                onClick={() => updateFilter("search", "")}
              />
            </Badge>
          )}
          {filters.status.map((status) => (
            <Badge key={status} variant="secondary" className="gap-1">
              Status: {status}
              <X
                className="w-3 h-3 cursor-pointer"
                onClick={() =>
                  updateFilter(
                    "status",
                    filters.status.filter((s) => s !== status)
                  )
                }
              />
            </Badge>
          ))}
          {filters.type.map((type) => (
            <Badge key={type} variant="secondary" className="gap-1">
              Type:{" "}
              {DeviceTypeConfig[type as keyof typeof DeviceTypeConfig]?.label ||
                type}
              <X
                className="w-3 h-3 cursor-pointer"
                onClick={() =>
                  updateFilter(
                    "type",
                    filters.type.filter((t) => t !== type)
                  )
                }
              />
            </Badge>
          ))}
          {filters.hasLocation === true && (
            <Badge variant="secondary" className="gap-1">
              Has Location
              <X
                className="w-3 h-3 cursor-pointer"
                onClick={() => updateFilter("hasLocation", null)}
              />
            </Badge>
          )}
          {filters.hasBattery === true && (
            <Badge variant="secondary" className="gap-1">
              Has Battery
              <X
                className="w-3 h-3 cursor-pointer"
                onClick={() => updateFilter("hasBattery", null)}
              />
            </Badge>
          )}
        </div>
      )}
    </motion.div>
  );
};

interface DeviceStatusCardProps {
  device: Device;
  onSelect: (device: Device) => void;
  viewMode?: ViewMode;
}

export default function DeviceStatusCard({
  device,
  onSelect,
  viewMode = "grid",
}: DeviceStatusCardProps) {
  const { animationsEnabled } = useAppearance();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [editedDevice, setEditedDevice] = useState<Device>(device);
  const [isEditing, setIsEditing] = useState(false);
  const [showRawData, setShowRawData] = useState(false);
  const [dataHistory, setDataHistory] = useState<any[]>([]);

  // Socket integration with 2-minute timeout support
  const { isConnected } = useSocket();
  const {
    data: realtimeData,
    connectionStatus,
    isSubscribed,
    lastDataReceived,
    isLiveDataActive,
  } = useDeviceData(device.id);

  // Store data history for better visualization
  useEffect(() => {
    if (realtimeData && isLiveDataActive) {
      setDataHistory((prev) => {
        const newHistory = [
          ...prev,
          { ...realtimeData, receivedAt: new Date().toISOString() },
        ];
        // Keep only last 10 entries
        return newHistory.slice(-10);
      });
    }
  }, [realtimeData, isLiveDataActive]);

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

  // Get device configuration based on type
  const deviceConfig = useMemo(() => {
    const config =
      DeviceTypeConfig[device.type as keyof typeof DeviceTypeConfig] ||
      DeviceTypeConfig.default;
    return config;
  }, [device.type]);

  // Parse real-time data based on device type
  const parsedRealtimeData = useMemo(() => {
    if (!realtimeData || !isLiveDataActive) return null;

    return deviceConfig.parseData(realtimeData);
  }, [realtimeData, isLiveDataActive, deviceConfig]);

  // Get latest reading for display
  const getLatestReading = useCallback(() => {
    if (!parsedRealtimeData) return null;

    return {
      metric: parsedRealtimeData.primary.name,
      value: parsedRealtimeData.primary.value,
      unit: parsedRealtimeData.primary.unit,
      icon: parsedRealtimeData.primary.icon,
      timestamp: realtimeData?.timestamp || new Date().toISOString(),
    };
  }, [parsedRealtimeData, realtimeData]);

  const getBatteryDisplay = useCallback(() => {
    // Check for battery level in real-time data first
    let batteryLevel = currentBatteryLevel;

    // For devices that report battery in their structured data
    if (realtimeData?.structuredData?.metrics?.secondary) {
      const batteryMetric = realtimeData.structuredData.metrics.secondary.find(
        (metric: any) => metric.name === "batteryLevel"
      );
      if (batteryMetric) {
        batteryLevel = batteryMetric.value;
      }
    }

    // For devices that report battery directly
    if (realtimeData?.batteryLevel !== undefined) {
      batteryLevel = realtimeData.batteryLevel;
    }

    if (batteryLevel === null || batteryLevel === undefined) {
      return null;
    }

    const level = batteryLevel;
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
  }, [currentBatteryLevel, realtimeData]);

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
    setShowRawData(false);
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
    [device.name, device.id, displayStatus]
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

  // Memoize status style
  const statusStyle = useMemo(
    () =>
      StatusColors[displayStatus as keyof typeof StatusColors] ||
      StatusColors.OFFLINE,
    [displayStatus]
  );

  // Format latest data for settings panel
  const formatLatestData = useCallback(() => {
    if (!realtimeData) return null;

    const entries = [];

    // Add parsed data if available
    if (parsedRealtimeData) {
      entries.push({
        label: formatMetricName(parsedRealtimeData.primary.name),
        value: `${parsedRealtimeData.primary.value}${
          parsedRealtimeData.primary.unit
            ? ` ${parsedRealtimeData.primary.unit}`
            : ""
        }`,
        icon: parsedRealtimeData.primary.icon,
        timestamp: realtimeData.timestamp,
        isReading: true,
      });

      parsedRealtimeData.secondary?.forEach((metric) => {
        entries.push({
          label: formatMetricName(metric.name),
          value: `${metric.value}${metric.unit ? ` ${metric.unit}` : ""}`,
          icon: metric.icon,
          timestamp: realtimeData.timestamp,
          isReading: true,
        });
      });
    }

    // Add device-level data
    if (realtimeData.deviceId) {
      entries.push({
        label: "Device ID",
        value: formatDeviceId(realtimeData.deviceId),
        icon: <Hash className="w-4 h-4" />,
        isReading: false,
      });
    }

    // Add battery level if available and not already shown
    const batteryLevel = realtimeData.batteryLevel ?? currentBatteryLevel;
    if (
      batteryLevel !== undefined &&
      batteryLevel !== null &&
      !parsedRealtimeData?.secondary?.some((m) =>
        m.name.toLowerCase().includes("battery")
      )
    ) {
      entries.push({
        label: "Battery Level",
        value: `${batteryLevel}%`,
        icon: <Battery className="w-4 h-4" />,
        isReading: false,
      });
    }

    // Add device status if available
    if (realtimeData.status && realtimeData.status !== displayStatus) {
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
  }, [realtimeData, parsedRealtimeData, currentBatteryLevel, displayStatus]);

  const latestReading = getLatestReading();

  // Enhanced Live Socket Data Display Component
  const LiveSocketDataDisplay = () => {
    if (!realtimeData || !isLiveDataActive) return null;

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            >
              <Radio className="w-5 h-5 text-emerald-500" />
            </motion.div>
            Live Socket Data
            <Badge
              variant="secondary"
              className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200"
            >
              Active
            </Badge>
          </h3>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowRawData(!showRawData)}
              className="h-8"
            >
              {showRawData ? (
                <Eye className="w-3 h-3" />
              ) : (
                <Database className="w-3 h-3" />
              )}
              {showRawData ? "Parsed" : "Raw"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDataHistory([])}
              className="h-8"
            >
              <RotateCcw className="w-3 h-3" />
            </Button>
          </div>
        </div>

        {/* Real-time Data Stream */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-50/50 to-emerald-100/50 dark:from-emerald-900/30 dark:to-emerald-800/30 border border-emerald-200/50 dark:border-emerald-700/50">
          <div className="flex items-center gap-2 mb-3">
            <motion.div
              className="w-2 h-2 rounded-full bg-emerald-500"
              animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            />

            <span className="text-xs text-emerald-600 dark:text-emerald-400">
              {formatTimestamp(
                realtimeData.timestamp || new Date().toISOString()
              )}
            </span>
          </div>

          {showRawData ? (
            // Raw JSON Display
            <div className="space-y-2">
              <div className="text-xs text-emerald-600 dark:text-emerald-400 font-mono mb-2">
                Raw Socket Payload:
              </div>
              <pre className="text-xs bg-slate-900 dark:bg-slate-800 text-green-400 p-3 rounded-lg overflow-x-auto border">
                {JSON.stringify(realtimeData, null, 2)}
              </pre>
            </div>
          ) : (
            // Parsed Data Display
            <div className="grid grid-cols-1 gap-3">
              {formatLatestData()?.map((entry, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-lg border transition-colors",
                    entry.isReading
                      ? "bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 border-blue-200 dark:border-blue-700"
                      : "bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 border-slate-200 dark:border-slate-600"
                  )}
                >
                  <div className="flex items-center gap-2 text-muted-foreground">
                    {entry.icon}
                    <span className="font-medium text-sm">{entry.label}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-sm text-foreground block">
                      {entry.value}
                    </span>
                    {entry.timestamp && entry.isReading && (
                      <span className="text-xs text-muted-foreground">
                        {formatTimestamp(entry.timestamp)}
                      </span>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Data History */}
        {dataHistory.length > 1 && (
          <div className="space-y-2">
            <div className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Recent Updates ({dataHistory.length})
            </div>
            <div className="max-h-40 overflow-y-auto space-y-1">
              {dataHistory
                .slice()
                .reverse()
                .map((entry, index) => (
                  <div
                    key={index}
                    className="text-xs p-2 rounded bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex justify-between items-center"
                  >
                    <span className="font-mono">
                      Data Update #{dataHistory.length - index}
                    </span>
                    <span className="text-muted-foreground">
                      {formatTimestamp(entry.receivedAt)}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const latestReadingDisplay =
    latestReading && isLiveDataActive ? (
      <div className="p-4 rounded-xl bg-gradient-to-r from-blue-50/50 to-blue-100/50 dark:from-blue-900/30 dark:to-blue-800/30 border border-blue-200/50 dark:border-blue-700/50">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-bold mb-3 flex items-center gap-1">
          {latestReading.icon}
          Latest Reading
          <motion.div
            className="w-1.5 h-1.5 rounded-full bg-blue-500"
            animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </div>
        <div className="flex justify-between items-center">
          <div>
            <div className="text-sm font-semibold text-blue-700 dark:text-blue-300">
              {formatMetricName(latestReading.metric)}
            </div>
            <div className="text-xs text-blue-600 dark:text-blue-400">
              {formatTimestamp(latestReading.timestamp)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-blue-800 dark:text-blue-200">
              {latestReading.value}
            </div>
            {latestReading.unit && (
              <div className="text-sm text-blue-600 dark:text-blue-400">
                {latestReading.unit}
              </div>
            )}
          </div>
        </div>
      </div>
    ) : null;

  // List View Layout
  if (viewMode === "list") {
    return (
      <>
        <motion.div
          variants={cardVariants}
          initial="initial"
          animate="animate"
          whileHover={animationsEnabled ? "hover" : undefined}
          onClick={() => onSelect(device)}
          className="cursor-pointer group w-full"
        >
          <Card
            className={cn(
              "border-2 overflow-hidden transition-all duration-300 h-full",
              "hover:shadow-lg backdrop-blur-sm bg-white/90 dark:bg-slate-900/90",
              statusStyle.border,
              statusStyle.glow,
              "group-hover:border-opacity-100",
              isLiveDataActive &&
                "ring-2 ring-emerald-500/20 ring-offset-2 ring-offset-white dark:ring-offset-slate-900"
            )}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-4">
                {/* Device Info */}
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div
                    className={cn(
                      "p-3 rounded-xl shadow-sm transition-all duration-300 flex-shrink-0",
                      "bg-white/95 dark:bg-slate-800/95 border border-white/50 dark:border-slate-700/50",
                      isLiveDataActive && "ring-2 ring-emerald-400/30"
                    )}
                  >
                    <div className={deviceConfig.color}>
                      {deviceConfig.icon}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-foreground text-lg truncate">
                        {device.name}
                      </h3>
                      <Badge
                        variant="secondary"
                        className={cn(
                          "text-xs font-bold",
                          statusStyle.badgeStyle,
                          connectionStatus === "RECEIVING_DATA" &&
                            isLiveDataActive &&
                            "animate-pulse"
                        )}
                      >
                        {statusStyle.icon}
                        <span className="ml-1">
                          {displayStatus === "NOT_CONNECTED"
                            ? "NOT CONNECTED"
                            : displayStatus}
                        </span>
                      </Badge>
                      {isLiveDataActive && (
                        <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200 text-xs">
                          LIVE
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground font-medium">
                      {deviceConfig.label} • ID: {formatDeviceId(device.id)}
                    </p>
                  </div>
                </div>

                {/* Latest Reading */}
                {latestReading && isLiveDataActive && (
                  <div className="text-right">
                    <div className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                      {formatMetricName(latestReading.metric)}
                    </div>
                    <div className="text-lg font-bold text-blue-800 dark:text-blue-200">
                      {latestReading.value}
                      {latestReading.unit && ` ${latestReading.unit}`}
                    </div>
                  </div>
                )}

                {/* Battery & Location */}
                <div className="flex items-center gap-4 text-sm">
                  {currentBatteryLevel !== null &&
                    currentBatteryLevel !== undefined && (
                      <div className="flex items-center gap-1">
                        <Battery className="w-4 h-4" />
                        <span>{currentBatteryLevel}%</span>
                      </div>
                    )}
                  {device.location && (
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      <span className="truncate max-w-24">
                        {device.location}
                      </span>
                    </div>
                  )}
                </div>

                {/* Last Seen */}
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">Last Seen</div>
                  <div className="text-sm font-semibold">
                    {formatLastSeen(currentLastSeen)}
                  </div>
                </div>

                {/* Settings Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 p-0 flex-shrink-0"
                  onClick={handleSettingsClick}
                >
                  <Settings className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Settings Panel (same as grid view) */}
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
                className="fixed right-0 top-0 h-full w-full max-w-lg bg-white dark:bg-slate-900 shadow-2xl z-50 overflow-y-auto"
              >
                <div className="p-6 space-y-6">
                  <div className="flex items-center justify-between border-b pb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "p-3 rounded-xl relative",
                          statusStyle.bg
                        )}
                      >
                        <div className={deviceConfig.color}>
                          {deviceConfig.icon}
                        </div>
                        {isLiveDataActive && (
                          <motion.div
                            className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-500"
                            animate={{ scale: [1, 1.3, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                          />
                        )}
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

                  {/* Enhanced Live Socket Data Section */}
                  {realtimeData && isLiveDataActive && (
                    <>
                      <LiveSocketDataDisplay />
                      <Separator />
                    </>
                  )}

                  {/* Connection Status Section */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Signal className="w-5 h-5" />
                      Connection Status
                      {isLiveDataActive && (
                        <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200">
                          LIVE
                        </Badge>
                      )}
                    </h3>
                    <div className="p-4 rounded-xl border bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700">
                      {getConnectionStatusDisplay()}

                      {/* Socket Session Info */}
                      <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-600">
                        <div className="text-xs text-muted-foreground space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold">
                              Socket Status:
                            </span>
                            <span
                              className={cn(
                                "px-2 py-1 rounded-full text-[10px] font-bold",
                                isConnected
                                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200"
                                  : "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200"
                              )}
                            >
                              {isConnected ? "CONNECTED" : "DISCONNECTED"}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="font-semibold">Subscription:</span>
                            <span
                              className={cn(
                                "px-2 py-1 rounded-full text-[10px] font-bold",
                                isSubscribed
                                  ? "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200"
                                  : "bg-slate-100 text-slate-800 dark:bg-slate-800/50 dark:text-slate-300"
                              )}
                            >
                              {isSubscribed ? "ACTIVE" : "INACTIVE"}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="font-semibold">Data Packets:</span>
                            <span className="font-mono text-emerald-600 dark:text-emerald-400">
                              {dataHistory.length} received
                            </span>
                          </div>
                          <div className="pt-2 border-t border-slate-200 dark:border-slate-600">
                            <div className="flex items-center gap-1 mb-1">
                              <Clock className="w-3 h-3" />
                              <span className="font-semibold">
                                Timeout Policy:
                              </span>
                            </div>
                            <p className="leading-relaxed">
                              Devices are marked as "Not Connected" after 2
                              minutes of inactivity. Real-time monitoring active
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Quick Actions */}
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

                    {/* Socket Control Actions */}
                    {isConnected && (
                      <div className="grid grid-cols-1 gap-2 pt-2 border-t border-slate-200 dark:border-slate-600">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setDataHistory([]);
                            toast.success("Data history cleared");
                          }}
                          className="flex items-center gap-2 h-10"
                          size="sm"
                        >
                          <RotateCcw className="w-3 h-3" />
                          Clear Data History
                        </Button>
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Device Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Info className="w-5 h-5" />
                      Device Information
                    </h3>
                    <div className="grid grid-cols-1 gap-3">
                      <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border">
                        <div className="text-xs text-muted-foreground mb-1">
                          Device ID
                        </div>
                        <div className="font-mono text-sm">{device.id}</div>
                      </div>
                      <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border">
                        <div className="text-xs text-muted-foreground mb-1">
                          Device Type
                        </div>
                        <div className="text-sm font-semibold">
                          {device.type}
                        </div>
                      </div>
                      {device.firmware && (
                        <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border">
                          <div className="text-xs text-muted-foreground mb-1">
                            Firmware
                          </div>
                          <div className="text-sm font-semibold">
                            {device.firmware}
                          </div>
                        </div>
                      )}
                      {device.location && (
                        <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border">
                          <div className="text-xs text-muted-foreground mb-1">
                            Location
                          </div>
                          <div className="text-sm font-semibold">
                            {device.location}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <Separator />

                  {/* Danger Zone */}
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

  // Grid View Layout (default)
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
            "group-hover:border-opacity-100 group-hover:-translate-y-1",
            // Add special glow for live data
            isLiveDataActive &&
              "ring-2 ring-emerald-500/20 ring-offset-2 ring-offset-white dark:ring-offset-slate-900"
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
                    "group-hover:scale-110 group-hover:rotate-6 group-hover:shadow-lg",
                    isLiveDataActive && "ring-2 ring-emerald-400/30"
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

                  {/* STATUS BADGE with live indicator */}
                  <div className="flex items-center gap-2">
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

                    {isLiveDataActive && (
                      <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200 text-xs px-2 py-0.5">
                        LIVE
                      </Badge>
                    )}
                  </div>
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
            {/* Latest Sensor Reading Display - Enhanced */}
            {latestReadingDisplay}

            {/* Secondary Metrics Display */}
            {parsedRealtimeData?.secondary &&
              parsedRealtimeData.secondary.length > 0 &&
              isLiveDataActive && (
                <div className="grid grid-cols-2 gap-3">
                  {parsedRealtimeData.secondary
                    .slice(0, 2)
                    .map((metric, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.1 }}
                        className="p-3 rounded-xl bg-gradient-to-r from-slate-50/50 to-slate-100/50 dark:from-slate-800/30 dark:to-slate-700/30 border border-slate-200/50 dark:border-slate-700/50"
                      >
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-2 flex items-center gap-1">
                          {metric.icon}
                          {formatMetricName(metric.name)}
                        </div>
                        <div className="text-sm font-bold text-foreground">
                          {metric.value}
                          {metric.unit && ` ${metric.unit}`}
                        </div>
                      </motion.div>
                    ))}
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

            {/* Live Data Indicator - Enhanced */}
            {realtimeData && isLiveDataActive && (
              <div className="space-y-2 p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-900/30 border border-emerald-200/50 dark:border-emerald-700/50">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-1">
                  <CheckCircle className="w-3 h-3 text-emerald-500" />
                  Live Data Active
                  <motion.div
                    className="w-1.5 h-1.5 rounded-full bg-emerald-500"
                    animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  />
                </div>
                <div className="text-xs text-emerald-600 dark:text-emerald-400">
                  Receiving real-time updates
                </div>
                <div className="text-xs text-emerald-500 dark:text-emerald-400 font-mono">
                  Data packets: {dataHistory.length} • Last:{" "}
                  {formatTimestamp(
                    realtimeData.timestamp || new Date().toISOString()
                  )}
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
                <div className="text-xs text-orange-500 dark:text-orange-400 font-mono">
                  Last seen: {formatTimestamp(lastDataReceived)}
                </div>
              </div>
            )}

            {/* Socket Connection Info */}
            {isConnected && isSubscribed && (
              <div className="space-y-2 p-3 rounded-xl bg-blue-50/50 dark:bg-blue-900/30 border border-blue-200/50 dark:border-blue-700/50">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-1">
                  <Radio className="w-3 h-3 text-blue-500" />
                  Socket Subscribed
                </div>
                <div className="text-xs text-blue-600 dark:text-blue-400 flex items-center justify-between">
                  <span>Device ID: {formatDeviceId(device.id)}</span>
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
              <div className="flex items-center gap-2">
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
                {isLiveDataActive && (
                  <motion.div
                    className="w-2 h-2 rounded-full bg-emerald-500"
                    animate={{ scale: [1, 1.2, 1], opacity: [1, 0.7, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                )}
              </div>
            </div>
          </CardFooter>
        </Card>
      </motion.div>

      {/* Enhanced Settings Panel - Same as List View */}
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
              className="fixed right-0 top-0 h-full w-full max-w-lg bg-white dark:bg-slate-900 shadow-2xl z-50 overflow-y-auto"
            >
              <div className="p-6 space-y-6">
                <div className="flex items-center justify-between border-b pb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn("p-3 rounded-xl relative", statusStyle.bg)}
                    >
                      <div className={deviceConfig.color}>
                        {deviceConfig.icon}
                      </div>
                      {isLiveDataActive && (
                        <motion.div
                          className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-500"
                          animate={{ scale: [1, 1.3, 1] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        />
                      )}
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

                {/* Enhanced Live Socket Data Section */}
                {realtimeData && isLiveDataActive && (
                  <>
                    <LiveSocketDataDisplay />
                    <Separator />
                  </>
                )}

                {/* Connection Status Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Signal className="w-5 h-5" />
                    Connection Status
                    {isLiveDataActive && (
                      <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200">
                        LIVE
                      </Badge>
                    )}
                  </h3>
                  <div className="p-4 rounded-xl border bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700">
                    {getConnectionStatusDisplay()}

                    {/* Socket Session Info */}
                    <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-600">
                      <div className="text-xs text-muted-foreground space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold">Socket Status:</span>
                          <span
                            className={cn(
                              "px-2 py-1 rounded-full text-[10px] font-bold",
                              isConnected
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200"
                                : "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200"
                            )}
                          >
                            {isConnected ? "CONNECTED" : "DISCONNECTED"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-semibold">Subscription:</span>
                          <span
                            className={cn(
                              "px-2 py-1 rounded-full text-[10px] font-bold",
                              isSubscribed
                                ? "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200"
                                : "bg-slate-100 text-slate-800 dark:bg-slate-800/50 dark:text-slate-300"
                            )}
                          >
                            {isSubscribed ? "ACTIVE" : "INACTIVE"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-semibold">Data Packets:</span>
                          <span className="font-mono text-emerald-600 dark:text-emerald-400">
                            {dataHistory.length} received
                          </span>
                        </div>
                        <div className="pt-2 border-t border-slate-200 dark:border-slate-600">
                          <div className="flex items-center gap-1 mb-1">
                            <Clock className="w-3 h-3" />
                            <span className="font-semibold">
                              Timeout Policy:
                            </span>
                          </div>
                          <p className="leading-relaxed">
                            Devices are marked as "Not Connected" after 2
                            minutes of inactivity. Real-time monitoring active
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Quick Actions */}
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

                  {/* Socket Control Actions */}
                  {isConnected && (
                    <div className="grid grid-cols-1 gap-2 pt-2 border-t border-slate-200 dark:border-slate-600">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setDataHistory([]);
                          toast.success("Data history cleared");
                        }}
                        className="flex items-center gap-2 h-10"
                        size="sm"
                      >
                        <RotateCcw className="w-3 h-3" />
                        Clear Data History
                      </Button>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Device Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Info className="w-5 h-5" />
                    Device Information
                  </h3>
                  <div className="grid grid-cols-1 gap-3">
                    <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border">
                      <div className="text-xs text-muted-foreground mb-1">
                        Device ID
                      </div>
                      <div className="font-mono text-sm">{device.id}</div>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border">
                      <div className="text-xs text-muted-foreground mb-1">
                        Device Type
                      </div>
                      <div className="text-sm font-semibold">{device.type}</div>
                    </div>
                    {device.firmware && (
                      <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border">
                        <div className="text-xs text-muted-foreground mb-1">
                          Firmware
                        </div>
                        <div className="text-sm font-semibold">
                          {device.firmware}
                        </div>
                      </div>
                    )}
                    {device.location && (
                      <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border">
                        <div className="text-xs text-muted-foreground mb-1">
                          Location
                        </div>
                        <div className="text-sm font-semibold">
                          {device.location}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Danger Zone */}
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

// Export the DeviceFilterBar component and helper functions
export { DeviceFilterBar };

// Utility function to filter and sort devices
export const filterAndSortDevices = (
  devices: Device[],
  filters: DeviceFilters
): Device[] => {
  let filteredDevices = devices;

  // Apply search filter
  if (filters.search) {
    const searchTerm = filters.search.toLowerCase();
    filteredDevices = filteredDevices.filter(
      (device) =>
        device.name.toLowerCase().includes(searchTerm) ||
        device.id.toLowerCase().includes(searchTerm) ||
        device.type.toLowerCase().includes(searchTerm) ||
        (device.location && device.location.toLowerCase().includes(searchTerm))
    );
  }

  // Apply status filter
  if (filters.status.length > 0) {
    filteredDevices = filteredDevices.filter((device) =>
      filters.status.includes(device.status)
    );
  }

  // Apply type filter
  if (filters.type.length > 0) {
    filteredDevices = filteredDevices.filter((device) =>
      filters.type.includes(device.type)
    );
  }

  // Apply location filter
  if (filters.hasLocation !== null) {
    filteredDevices = filteredDevices.filter((device) => {
      const hasLocation = !!(device.location && device.location.trim());
      return filters.hasLocation ? hasLocation : !hasLocation;
    });
  }

  // Apply battery filter
  if (filters.hasBattery !== null) {
    filteredDevices = filteredDevices.filter((device) => {
      const hasBattery =
        device.batteryLevel !== null && device.batteryLevel !== undefined;
      return filters.hasBattery ? hasBattery : !hasBattery;
    });
  }

  // Apply sorting
  filteredDevices.sort((a, b) => {
    let aValue: any, bValue: any;

    switch (filters.sortBy) {
      case "name":
        aValue = a.name.toLowerCase();
        bValue = b.name.toLowerCase();
        break;
      case "type":
        aValue = a.type.toLowerCase();
        bValue = b.type.toLowerCase();
        break;
      case "status":
        aValue = a.status.toLowerCase();
        bValue = b.status.toLowerCase();
        break;
      case "lastSeen":
        aValue = a.lastSeen ? new Date(a.lastSeen).getTime() : 0;
        bValue = b.lastSeen ? new Date(b.lastSeen).getTime() : 0;
        break;
      case "battery":
        aValue = a.batteryLevel ?? -1;
        bValue = b.batteryLevel ?? -1;
        break;
      default:
        aValue = a.name.toLowerCase();
        bValue = b.name.toLowerCase();
    }

    if (aValue < bValue) return filters.sortOrder === "asc" ? -1 : 1;
    if (aValue > bValue) return filters.sortOrder === "asc" ? 1 : -1;
    return 0;
  });

  return filteredDevices;
};
