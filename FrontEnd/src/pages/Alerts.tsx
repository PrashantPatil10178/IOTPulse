"use client";

import type React from "react";
import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  Bell,
  CheckCircle,
  Clock,
  Filter,
  Info,
  MoreHorizontal,
  RefreshCw,
  Search,
  Settings,
  Smartphone,
  ChevronDown,
  Thermometer,
  Droplets,
  Activity,
  Lightbulb,
  Plug,
  Camera,
  Zap,
  Wind,
  User,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useAlerts } from "@/hooks/use-alerts";
import AlertConfigDialog from "@/components/Alerts/AlertConfig";
import type { Alert, Device } from "@/types";
import { AlertSeverity, AlertStatus } from "@/types";
import { deviceApi } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

interface SeverityConfig {
  icon: React.ReactNode;
  color: string;
  bg: string;
  border: string;
  label: string;
}

interface StatusConfig {
  color: string;
  bg: string;
  border: string;
}

interface DeviceTypeConfig {
  icon: React.ReactNode;
  color: string;
  label: string;
}

// Enhanced device type configurations based on your IoT controller
const deviceTypeConfig: Record<string, DeviceTypeConfig> = {
  TEMPERATURE_SENSOR: {
    icon: <Thermometer className="w-4 h-4" />,
    color: "text-red-500",
    label: "Temperature Sensor",
  },
  HUMIDITY_SENSOR: {
    icon: <Droplets className="w-4 h-4" />,
    color: "text-blue-500",
    label: "Humidity Sensor",
  },
  MOTION_DETECTOR: {
    icon: <Activity className="w-4 h-4" />,
    color: "text-yellow-500",
    label: "Motion Detector",
  },
  SMART_LIGHT: {
    icon: <Lightbulb className="w-4 h-4" />,
    color: "text-yellow-400",
    label: "Smart Light",
  },
  SMART_PLUG: {
    icon: <Plug className="w-4 h-4" />,
    color: "text-green-500",
    label: "Smart Plug",
  },
  CAMERA: {
    icon: <Camera className="w-4 h-4" />,
    color: "text-purple-500",
    label: "Camera",
  },
  ENERGY_METER: {
    icon: <Zap className="w-4 h-4" />,
    color: "text-orange-500",
    label: "Energy Meter",
  },
  WATER_METER: {
    icon: <Droplets className="w-4 h-4" />,
    color: "text-cyan-500",
    label: "Water Meter",
  },
  AIR_QUALITY_SENSOR: {
    icon: <Wind className="w-4 h-4" />,
    color: "text-purple-600",
    label: "Air Quality Sensor",
  },
  OTHER: {
    icon: <Settings className="w-4 h-4" />,
    color: "text-gray-500",
    label: "Other Device",
  },
};

// Current user info (you can get this from auth context)

export default function Alerts() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [deviceFilter, setDeviceFilter] = useState("all");
  const [deviceTypeFilter, setDeviceTypeFilter] = useState("all");
  const [tab, setTab] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [expandedAlert, setExpandedAlert] = useState<string | null>(null);
  const { user } = useAuth(); // Assuming you have a useAuth hook to get current user info
  const currentUser = {
    username: user?.username || "Guest",
    loginTime: new Date().toLocaleTimeString(),
  };

  // Device and configuration states
  const [devices, setDevices] = useState<Device[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [configDialog, setConfigDialog] = useState(false);
  const [selectedDeviceForConfig, setSelectedDeviceForConfig] =
    useState<string>("");

  // Alert dialogs
  const [acknowledgeDialog, setAcknowledgeDialog] = useState(false);
  const [resolveDialog, setResolveDialog] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [alertNotes, setAlertNotes] = useState("");

  const { toast } = useToast();

  // Build API parameters including device and device type filters
  const apiParams = useMemo(() => {
    const params: any = {
      page: currentPage,
      limit: pageSize,
    };

    if (statusFilter !== "all") {
      params.status = statusFilter;
    }

    if (severityFilter !== "all") {
      params.severity = severityFilter;
    }

    if (deviceFilter !== "all") {
      params.deviceId = deviceFilter;
    }

    return params;
  }, [currentPage, pageSize, statusFilter, severityFilter, deviceFilter]);

  const {
    alerts: allAlerts,
    pagination,
    loading,
    refreshing,
    error,
    fetchAlerts,
    refreshAlerts,
    acknowledgeAlert: acknowledgeAlertAPI,
    resolveAlert: resolveAlertAPI,
  } = useAlerts(apiParams);

  // Fetch devices on component mount
  useEffect(() => {
    fetchDevices();
  }, []);

  const fetchDevices = async () => {
    try {
      setLoadingDevices(true);
      const response = await deviceApi.getAll();
      setDevices(response.devices || []);
    } catch (error) {
      console.error("Error fetching devices:", error);
      toast({
        title: "Error",
        description: "Failed to fetch devices",
        variant: "destructive",
      });
    } finally {
      setLoadingDevices(false);
    }
  };

  // Enhanced filter logic including device type filtering
  const filteredAlerts = useMemo(() => {
    return allAlerts.filter((alert) => {
      // Tab filtering
      if (tab === "active" && alert.status !== AlertStatus.ACTIVE) return false;
      if (tab === "acknowledged" && alert.status !== AlertStatus.ACKNOWLEDGED)
        return false;
      if (tab === "resolved" && alert.status !== AlertStatus.RESOLVED)
        return false;

      // Device type filtering
      if (deviceTypeFilter !== "all") {
        const device = devices.find((d) => d.id === alert.deviceId);
        if (!device || device.type !== deviceTypeFilter) return false;
      }

      // Search filtering
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const device = devices.find((d) => d.id === alert.deviceId);
        return (
          alert.title.toLowerCase().includes(searchLower) ||
          alert.message.toLowerCase().includes(searchLower) ||
          alert.deviceId.toLowerCase().includes(searchLower) ||
          device?.name?.toLowerCase().includes(searchLower) ||
          alert.condition?.toLowerCase().includes(searchLower)
        );
      }

      return true;
    });
  }, [allAlerts, tab, searchTerm, deviceTypeFilter, devices]);

  // Get counts for badges
  const counts = useMemo(
    () => ({
      active: allAlerts.filter((a) => a.status === AlertStatus.ACTIVE).length,
      acknowledged: allAlerts.filter(
        (a) => a.status === AlertStatus.ACKNOWLEDGED
      ).length,
      resolved: allAlerts.filter((a) => a.status === AlertStatus.RESOLVED)
        .length,
    }),
    [allAlerts]
  );

  // Fetch alerts when filters change
  useEffect(() => {
    fetchAlerts(apiParams);
  }, [fetchAlerts, apiParams]);

  // Reset page when filters change
  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [statusFilter, severityFilter, deviceFilter, deviceTypeFilter]);

  // Handle acknowledging an alert
  const handleAcknowledgeAlert = useCallback(async () => {
    if (!selectedAlert) return;

    try {
      await acknowledgeAlertAPI(selectedAlert.id);
      setAcknowledgeDialog(false);
      setSelectedAlert(null);
    } catch (error) {
      // Error is handled by the hook
    }
  }, [selectedAlert, acknowledgeAlertAPI]);

  // Handle resolving an alert
  const handleResolveAlert = useCallback(async () => {
    if (!selectedAlert) return;

    try {
      await resolveAlertAPI(selectedAlert.id, alertNotes);
      setResolveDialog(false);
      setSelectedAlert(null);
      setAlertNotes("");
    } catch (error) {
      // Error is handled by the hook
    }
  }, [selectedAlert, alertNotes, resolveAlertAPI]);

  // Handle page changes
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setSearchTerm("");
    setStatusFilter("all");
    setSeverityFilter("all");
    setDeviceFilter("all");
    setDeviceTypeFilter("all");
    setTab("all");
    setCurrentPage(1);
  }, []);

  // Toggle alert expansion
  const toggleAlertExpansion = useCallback((alertId: string) => {
    setExpandedAlert((current) => (current === alertId ? null : alertId));
  }, []);

  const openConfigForDevice = (deviceId: string) => {
    setSelectedDeviceForConfig(deviceId);
    setConfigDialog(true);
  };

  const openConfigForAll = () => {
    setSelectedDeviceForConfig("");
    setConfigDialog(true);
  };

  // Get device info
  const getDeviceInfo = useCallback(
    (deviceId: string) => {
      return devices.find((d) => d.id === deviceId);
    },
    [devices]
  );

  // Severity config for styling
  const severityConfig: Record<AlertSeverity, SeverityConfig> = useMemo(
    () => ({
      [AlertSeverity.LOW]: {
        icon: <Info className="w-4 h-4" />,
        color: "text-blue-600",
        bg: "bg-blue-100 dark:bg-blue-900/30",
        border: "border-blue-200 dark:border-blue-800",
        label: "Low",
      },
      [AlertSeverity.MEDIUM]: {
        icon: <AlertTriangle className="w-4 h-4" />,
        color: "text-amber-600",
        bg: "bg-amber-100 dark:bg-amber-900/30",
        border: "border-amber-200 dark:border-amber-800",
        label: "Medium",
      },
      [AlertSeverity.HIGH]: {
        icon: <AlertTriangle className="w-4 h-4" />,
        color: "text-orange-600",
        bg: "bg-orange-100 dark:bg-orange-900/30",
        border: "border-orange-200 dark:border-orange-800",
        label: "High",
      },
      [AlertSeverity.CRITICAL]: {
        icon: <AlertTriangle className="w-4 h-4" />,
        color: "text-red-600",
        bg: "bg-red-100 dark:bg-red-900/30",
        border: "border-red-200 dark:border-red-800",
        label: "Critical",
      },
    }),
    []
  );

  // Status config for styling
  const statusConfig: Record<AlertStatus, StatusConfig> = useMemo(
    () => ({
      [AlertStatus.ACTIVE]: {
        color: "text-red-600",
        bg: "bg-red-100 dark:bg-red-900/30",
        border: "border-red-200 dark:border-red-800",
      },
      [AlertStatus.ACKNOWLEDGED]: {
        color: "text-amber-600",
        bg: "bg-amber-100 dark:bg-amber-900/30",
        border: "border-amber-200 dark:border-amber-800",
      },
      [AlertStatus.RESOLVED]: {
        color: "text-emerald-600",
        bg: "bg-emerald-100 dark:bg-emerald-900/30",
        border: "border-emerald-200 dark:border-emerald-800",
      },
    }),
    []
  );

  // Format timestamp to relative time
  const formatTimeAgo = useCallback((timestamp: string | number | Date) => {
    const now = new Date();
    const alertTime = new Date(timestamp);
    const diffMs = now.getTime() - alertTime.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);

    if (diffSeconds < 60) return `${diffSeconds}s ago`;

    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) return `${diffMinutes}m ago`;

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  }, []);

  // Format condition for display
  const formatCondition = useCallback((condition: string) => {
    return (
      condition?.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()) ||
      "Unknown Condition"
    );
  }, []);

  // Get unique device types for filtering
  const deviceTypes = useMemo(() => {
    const types = new Set(devices.map((d) => d.type));
    return Array.from(types);
  }, [devices]);

  return (
    <div className="space-y-6">
      {/* Header with User Info */}
      <motion.div
        className="flex flex-col md:flex-row justify-between gap-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            IoT Alert Management
          </h1>
          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
            <div className="flex items-center gap-1">
              <User className="w-4 h-4" />
              <span>User: {currentUser.username}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>Login: {currentUser.loginTime}</span>
            </div>
            <div className="flex items-center gap-1">
              <Smartphone className="w-4 h-4" />
              <span>{devices.length} devices</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1 md:flex-none"
            onClick={refreshAlerts}
            disabled={refreshing}
          >
            <motion.div
              animate={refreshing ? { rotate: 360 } : { rotate: 0 }}
              transition={
                refreshing
                  ? { duration: 1, repeat: Infinity, ease: "linear" }
                  : {}
              }
            >
              <RefreshCw className="w-4 h-4 mr-2" />
            </motion.div>
            {refreshing ? "Refreshing..." : "Refresh"}
          </Button>
          <Button
            className="flex-1 md:flex-none bg-blue-600 hover:bg-blue-700 text-white"
            onClick={openConfigForAll}
          >
            <Settings className="w-4 h-4 mr-2" />
            Configure Alerts
          </Button>
        </div>
      </motion.div>

      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.div
            className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <span className="text-red-800 dark:text-red-200 font-medium">
                Error loading alerts
              </span>
            </div>
            <p className="text-red-700 dark:text-red-300 text-sm mt-1">
              {error}
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => fetchAlerts(apiParams)}
            >
              Try Again
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="grid grid-cols-4 w-full md:w-auto">
            <TabsTrigger value="all" className="relative">
              All
              <Badge variant="secondary" className="ml-1 text-[10px] py-0">
                {allAlerts.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="active" className="relative">
              Active
              <Badge
                variant="secondary"
                className="ml-1 text-[10px] py-0 bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
              >
                {counts.active}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="acknowledged" className="relative">
              Acknowledged
              <Badge
                variant="secondary"
                className="ml-1 text-[10px] py-0 bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
              >
                {counts.acknowledged}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="resolved" className="relative">
              Resolved
              <Badge
                variant="secondary"
                className="ml-1 text-[10px] py-0 bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
              >
                {counts.resolved}
              </Badge>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </motion.div>

      {/* Enhanced Filters */}
      <motion.div
        className="flex flex-col gap-3"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search alerts by title, message, device, or condition..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Select value={deviceTypeFilter} onValueChange={setDeviceTypeFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Device Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {deviceTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  <div className="flex items-center gap-2">
                    <span
                      className={
                        deviceTypeConfig[type]?.color || "text-gray-500"
                      }
                    >
                      {deviceTypeConfig[type]?.icon || (
                        <Settings className="w-4 h-4" />
                      )}
                    </span>
                    <span>{deviceTypeConfig[type]?.label || type}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={deviceFilter} onValueChange={setDeviceFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Device" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Devices</SelectItem>
              {devices.map((device) => (
                <SelectItem key={device.id} value={device.id}>
                  <div className="flex items-center gap-2">
                    <span
                      className={
                        deviceTypeConfig[device.type]?.color || "text-gray-500"
                      }
                    >
                      {deviceTypeConfig[device.type]?.icon || (
                        <Settings className="w-4 h-4" />
                      )}
                    </span>
                    <span>{device.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {device.status}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value={AlertStatus.ACTIVE}>Active</SelectItem>
              <SelectItem value={AlertStatus.ACKNOWLEDGED}>
                Acknowledged
              </SelectItem>
              <SelectItem value={AlertStatus.RESOLVED}>Resolved</SelectItem>
            </SelectContent>
          </Select>

          <Select value={severityFilter} onValueChange={setSeverityFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Severity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Severity</SelectItem>
              <SelectItem value={AlertSeverity.LOW}>Low</SelectItem>
              <SelectItem value={AlertSeverity.MEDIUM}>Medium</SelectItem>
              <SelectItem value={AlertSeverity.HIGH}>High</SelectItem>
              <SelectItem value={AlertSeverity.CRITICAL}>Critical</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" onClick={clearFilters} className="w-full">
            <Filter className="w-4 h-4 mr-2" />
            Clear Filters
          </Button>
        </div>
      </motion.div>

      {/* Alert List */}
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            className="space-y-4"
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {Array(5)
              .fill(0)
              .map((_, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Skeleton className="h-32" />
                </motion.div>
              ))}
          </motion.div>
        ) : filteredAlerts.length === 0 ? (
          <motion.div
            className="bg-white dark:bg-slate-800 border rounded-lg p-8 text-center"
            key="empty"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <div className="mx-auto w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mb-4">
              <Bell className="w-6 h-6 text-slate-500" />
            </div>
            <h3 className="text-lg font-medium mb-1">No alerts found</h3>
            <p className="text-slate-500 dark:text-slate-400 mb-4">
              {searchTerm ||
              statusFilter !== "all" ||
              severityFilter !== "all" ||
              deviceFilter !== "all" ||
              deviceTypeFilter !== "all"
                ? "Try adjusting your search or filters"
                : "All IoT devices are operating normally"}
            </p>
            {searchTerm ||
            statusFilter !== "all" ||
            severityFilter !== "all" ||
            deviceFilter !== "all" ||
            deviceTypeFilter !== "all" ? (
              <Button variant="outline" onClick={clearFilters}>
                <Filter className="w-4 h-4 mr-2" />
                Clear Filters
              </Button>
            ) : (
              <Button variant="outline" onClick={refreshAlerts}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            )}
          </motion.div>
        ) : (
          <>
            <div key="alerts-list" className="space-y-4">
              {filteredAlerts.map((alert, index) => {
                const severity =
                  severityConfig[alert.severity] ||
                  severityConfig[AlertSeverity.LOW];
                const status =
                  statusConfig[alert.status] ||
                  statusConfig[AlertStatus.ACTIVE];
                const isExpanded = expandedAlert === alert.id;
                const device = getDeviceInfo(alert.deviceId);
                const deviceTypeInfo =
                  deviceTypeConfig[device?.type || "OTHER"] ||
                  deviceTypeConfig.OTHER;

                return (
                  <motion.div
                    key={alert.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05, duration: 0.3 }}
                    whileHover={{ scale: 1.01 }}
                    layout
                  >
                    <Card
                      className={cn(
                        "border overflow-hidden transition-all cursor-pointer",
                        alert.status === AlertStatus.ACTIVE &&
                          alert.severity !== AlertSeverity.LOW &&
                          "border-red-200 dark:border-red-800 shadow-red-100 dark:shadow-red-900/20",
                        isExpanded && "ring-2 ring-blue-500/20"
                      )}
                      onClick={() => toggleAlertExpansion(alert.id)}
                    >
                      <CardHeader className="p-4 pb-3">
                        <div className="flex justify-between items-start">
                          <div className="flex items-start gap-3 flex-1">
                            <div
                              className={cn(
                                "rounded-full p-1.5 mt-0.5",
                                severity.bg
                              )}
                            >
                              <div className={severity.color}>
                                {severity.icon}
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <CardTitle className="text-base font-medium mb-2 leading-tight">
                                {alert.title}
                              </CardTitle>
                              <div className="flex flex-wrap gap-2">
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "text-xs px-2 py-0.5 rounded-full",
                                    status.color,
                                    status.bg,
                                    status.border
                                  )}
                                >
                                  {alert.status}
                                </Badge>
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "text-xs px-2 py-0.5 rounded-full",
                                    severity.color,
                                    severity.bg,
                                    severity.border
                                  )}
                                >
                                  {severity.label}
                                </Badge>
                                <div className="flex items-center text-xs text-muted-foreground gap-1">
                                  <span className={deviceTypeInfo.color}>
                                    {deviceTypeInfo.icon}
                                  </span>
                                  <span>{device?.name || alert.deviceId}</span>
                                </div>
                                <div className="flex items-center text-xs text-muted-foreground gap-1">
                                  <Clock className="w-3 h-3" />
                                  <span>{formatTimeAgo(alert.createdAt)}</span>
                                </div>
                                {alert.condition && (
                                  <div className="flex items-center text-xs text-muted-foreground gap-1">
                                    <AlertTriangle className="w-3 h-3" />
                                    <span>
                                      {formatCondition(alert.condition)}
                                    </span>
                                  </div>
                                )}
                                {device?.currentLocation && (
                                  <div className="flex items-center text-xs text-muted-foreground gap-1">
                                    <MapPin className="w-3 h-3" />
                                    <span className="truncate max-w-32">
                                      {device.currentLocation}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 ml-2">
                            <motion.div
                              animate={{ rotate: isExpanded ? 180 : 0 }}
                              transition={{ duration: 0.2 }}
                            >
                              <ChevronDown className="w-4 h-4 text-muted-foreground" />
                            </motion.div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {alert.status === AlertStatus.ACTIVE && (
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedAlert(alert);
                                      setAcknowledgeDialog(true);
                                    }}
                                  >
                                    <CheckCircle className="w-4 h-4 mr-2 text-amber-500" />
                                    Acknowledge
                                  </DropdownMenuItem>
                                )}

                                {(alert.status === AlertStatus.ACTIVE ||
                                  alert.status ===
                                    AlertStatus.ACKNOWLEDGED) && (
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedAlert(alert);
                                      setResolveDialog(true);
                                    }}
                                  >
                                    <CheckCircle className="w-4 h-4 mr-2 text-emerald-500" />
                                    Resolve
                                  </DropdownMenuItem>
                                )}

                                <DropdownMenuSeparator />

                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openConfigForDevice(alert.deviceId);
                                  }}
                                >
                                  <Settings className="w-4 h-4 mr-2" />
                                  Configure Device Alerts
                                </DropdownMenuItem>

                                <DropdownMenuItem>
                                  <Bell className="w-4 h-4 mr-2" />
                                  View Device Details
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </CardHeader>

                      {/* Expanded Content */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3 }}
                            className="px-4 pb-4"
                          >
                            <CardContent className="p-0">
                              <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4 space-y-3">
                                <div>
                                  <p className="text-sm font-medium text-muted-foreground mb-1">
                                    Alert Message:
                                  </p>
                                  <p className="text-sm">{alert.message}</p>
                                </div>

                                {alert.triggerValue && (
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <p className="text-sm font-medium text-muted-foreground mb-1">
                                        Trigger Value:
                                      </p>
                                      <p className="text-sm font-mono">
                                        {JSON.stringify(alert.triggerValue)}
                                      </p>
                                    </div>
                                    {alert.threshold && (
                                      <div>
                                        <p className="text-sm font-medium text-muted-foreground mb-1">
                                          Threshold:
                                        </p>
                                        <p className="text-sm font-mono">
                                          {alert.threshold}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {device && (
                                  <div>
                                    <p className="text-sm font-medium text-muted-foreground mb-1">
                                      Device Info:
                                    </p>
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                      <div>Name: {device.name}</div>
                                      <div>Type: {deviceTypeInfo.label}</div>
                                      <div>Status: {device.status}</div>
                                      {device.batteryLevel && (
                                        <div>
                                          Battery: {device.batteryLevel}%
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {alert.acknowledgedAt && (
                                  <div>
                                    <p className="text-sm font-medium text-muted-foreground mb-1">
                                      Acknowledged:
                                    </p>
                                    <p className="text-sm">
                                      {new Date(
                                        alert.acknowledgedAt
                                      ).toLocaleString()}
                                    </p>
                                  </div>
                                )}

                                {alert.resolutionNotes && (
                                  <div>
                                    <p className="text-sm font-medium text-muted-foreground mb-1">
                                      Resolution Notes:
                                    </p>
                                    <p className="text-sm">
                                      {alert.resolutionNotes}
                                    </p>
                                  </div>
                                )}

                                {alert.metadata && (
                                  <div>
                                    <p className="text-sm font-medium text-muted-foreground mb-1">
                                      Additional Info:
                                    </p>
                                    <pre className="text-xs bg-slate-100 dark:bg-slate-800 p-2 rounded overflow-x-auto">
                                      {JSON.stringify(alert.metadata, null, 2)}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </Card>
                  </motion.div>
                );
              })}
            </div>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <motion.div
                className="flex items-center justify-between"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <div className="text-sm text-muted-foreground">
                  Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
                  {Math.min(
                    pagination.page * pagination.limit,
                    pagination.total
                  )}{" "}
                  of {pagination.total} alerts
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!pagination.hasPrev}
                    onClick={() => handlePageChange(pagination.page - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!pagination.hasNext}
                    onClick={() => handlePageChange(pagination.page + 1)}
                  >
                    Next
                  </Button>
                </div>
              </motion.div>
            )}
          </>
        )}
      </AnimatePresence>

      {/* Alert Configuration Dialog */}
      <AlertConfigDialog
        open={configDialog}
        onOpenChange={setConfigDialog}
        devices={devices}
        selectedDeviceId={selectedDeviceForConfig}
      />

      {/* Acknowledge Dialog */}
      <AnimatePresence>
        {acknowledgeDialog && (
          <Dialog open={acknowledgeDialog} onOpenChange={setAcknowledgeDialog}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Acknowledge IoT Alert</DialogTitle>
                <DialogDescription>
                  Are you sure you want to acknowledge this IoT device alert?
                </DialogDescription>
              </DialogHeader>

              {selectedAlert && (
                <div className="py-4">
                  <div className="bg-slate-50 dark:bg-slate-800 rounded-md p-3 mb-4">
                    <div className="flex items-start gap-2">
                      <div
                        className={cn(
                          "rounded-full p-1 mt-0.5",
                          severityConfig[selectedAlert.severity].bg
                        )}
                      >
                        <div
                          className={
                            severityConfig[selectedAlert.severity].color
                          }
                        >
                          {severityConfig[selectedAlert.severity].icon}
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{selectedAlert.title}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span>
                              {getDeviceInfo(selectedAlert.deviceId)?.name ||
                                selectedAlert.deviceId}
                            </span>
                            <span>•</span>
                            <span>
                              {formatCondition(selectedAlert.condition || "")}
                            </span>
                            <span>•</span>
                            <span>
                              {new Date(
                                selectedAlert.createdAt
                              ).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground mb-2">
                    Acknowledging this alert will update its status, but it will
                    remain active until resolved. The alert rule will continue
                    monitoring this device.
                  </p>
                </div>
              )}

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setAcknowledgeDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="bg-amber-600 hover:bg-amber-700"
                  onClick={handleAcknowledgeAlert}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Acknowledge Alert
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>

      {/* Resolve Dialog */}
      <AnimatePresence>
        {resolveDialog && (
          <Dialog open={resolveDialog} onOpenChange={setResolveDialog}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Resolve IoT Alert</DialogTitle>
                <DialogDescription>
                  Add notes about how this IoT device alert was resolved.
                </DialogDescription>
              </DialogHeader>

              {selectedAlert && (
                <div className="py-4">
                  <div className="bg-slate-50 dark:bg-slate-800 rounded-md p-3 mb-4">
                    <div className="flex items-start gap-2">
                      <div
                        className={cn(
                          "rounded-full p-1 mt-0.5",
                          severityConfig[selectedAlert.severity].bg
                        )}
                      >
                        <div
                          className={
                            severityConfig[selectedAlert.severity].color
                          }
                        >
                          {severityConfig[selectedAlert.severity].icon}
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{selectedAlert.title}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span>
                              {getDeviceInfo(selectedAlert.deviceId)?.name ||
                                selectedAlert.deviceId}
                            </span>
                            <span>•</span>
                            <span>
                              {formatCondition(selectedAlert.condition || "")}
                            </span>
                            <span>•</span>
                            <span>
                              {new Date(
                                selectedAlert.createdAt
                              ).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Resolution Notes
                      </label>
                      <Textarea
                        placeholder="Describe how the IoT device issue was resolved..."
                        value={alertNotes}
                        onChange={(e) => setAlertNotes(e.target.value)}
                        className="min-h-[80px]"
                      />
                    </div>
                  </div>
                </div>
              )}

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setResolveDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700"
                  onClick={handleResolveAlert}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Resolve Alert
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>
    </div>
  );
}
