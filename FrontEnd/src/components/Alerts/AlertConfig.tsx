"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import {
  AlertTriangle,
  Plus,
  Trash2,
  Edit,
  Settings,
  Thermometer,
  Droplets,
  Activity,
  Lightbulb,
  Plug,
  Camera,
  Zap,
  Wind,
  WifiOff,
  Battery,
  Gauge,
  Clock,
  Info,
  CheckCircle,
  XCircle,
  Eye,
  Save,
  RotateCcw,
  Loader2,
  User,
  Calendar,
  MapPin,
  Signal,
  Smartphone,
} from "lucide-react";
import alertsService from "@/services/alertService";
import type { Device } from "@/types";
import { AlertSeverity } from "@/types";
import { cn } from "@/lib/utils";

// Define AlertRule interface locally
interface AlertRule {
  id?: string;
  deviceId: string;
  name: string;
  condition: string;
  threshold: number;
  severity: AlertSeverity;
  enabled: boolean;
  description?: string;
  metricPath?: string;
  operator: string;
  cooldownMinutes: number;
  createdAt?: string;
  updatedAt?: string;
}

interface AlertConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  devices: Device[];
  selectedDeviceId?: string;
}

interface ConditionOption {
  value: string;
  label: string;
  unit: string;
  icon: React.ReactNode;
  deviceTypes: string[];
  description: string;
  category: string;
}

// Enhanced condition options with better categorization
const conditionCategories = {
  environmental: {
    label: "Environmental",
    icon: <Thermometer className="w-4 h-4" />,
    color: "text-green-600",
  },
  power: {
    label: "Power & Energy",
    icon: <Zap className="w-4 h-4" />,
    color: "text-yellow-600",
  },
  connectivity: {
    label: "Connectivity",
    icon: <WifiOff className="w-4 h-4" />,
    color: "text-red-600",
  },
  safety: {
    label: "Safety & Security",
    icon: <AlertTriangle className="w-4 h-4" />,
    color: "text-orange-600",
  },
  water: {
    label: "Water Systems",
    icon: <Droplets className="w-4 h-4" />,
    color: "text-blue-600",
  },
  air: {
    label: "Air Quality",
    icon: <Wind className="w-4 h-4" />,
    color: "text-purple-600",
  },
  custom: {
    label: "Custom Metrics",
    icon: <Settings className="w-4 h-4" />,
    color: "text-gray-600",
  },
};

const conditionOptions: ConditionOption[] = [
  // Environmental
  {
    value: "temperature_high",
    label: "High Temperature",
    unit: "°C",
    icon: <Thermometer className="w-4 h-4 text-red-500" />,
    deviceTypes: [
      "TEMPERATURE_SENSOR",
      "HUMIDITY_SENSOR",
      "AIR_QUALITY_SENSOR",
    ],
    description: "Alert when temperature exceeds threshold",
    category: "environmental",
  },
  {
    value: "temperature_low",
    label: "Low Temperature",
    unit: "°C",
    icon: <Thermometer className="w-4 h-4 text-blue-500" />,
    deviceTypes: [
      "TEMPERATURE_SENSOR",
      "HUMIDITY_SENSOR",
      "AIR_QUALITY_SENSOR",
    ],
    description: "Alert when temperature drops below threshold",
    category: "environmental",
  },
  {
    value: "humidity_high",
    label: "High Humidity",
    unit: "%",
    icon: <Droplets className="w-4 h-4 text-blue-600" />,
    deviceTypes: [
      "HUMIDITY_SENSOR",
      "TEMPERATURE_SENSOR",
      "AIR_QUALITY_SENSOR",
    ],
    description: "Alert when humidity exceeds threshold",
    category: "environmental",
  },
  {
    value: "humidity_low",
    label: "Low Humidity",
    unit: "%",
    icon: <Droplets className="w-4 h-4 text-orange-400" />,
    deviceTypes: [
      "HUMIDITY_SENSOR",
      "TEMPERATURE_SENSOR",
      "AIR_QUALITY_SENSOR",
    ],
    description: "Alert when humidity drops below threshold",
    category: "environmental",
  },

  // Safety & Security
  {
    value: "motion_detected",
    label: "Motion Detection",
    unit: "",
    icon: <Activity className="w-4 h-4 text-yellow-500" />,
    deviceTypes: ["MOTION_DETECTOR", "CAMERA"],
    description: "Alert when motion is detected",
    category: "safety",
  },
  {
    value: "battery_low",
    label: "Low Battery",
    unit: "%",
    icon: <Battery className="w-4 h-4 text-red-500" />,
    deviceTypes: ["MOTION_DETECTOR", "CAMERA", "OTHER"],
    description: "Alert when battery level drops below threshold",
    category: "safety",
  },

  // Connectivity
  {
    value: "device_offline",
    label: "Device Offline",
    unit: "min",
    icon: <WifiOff className="w-4 h-4 text-red-600" />,
    deviceTypes: ["ALL"],
    description: "Alert when device hasn't communicated for specified time",
    category: "connectivity",
  },

  // Power & Energy
  {
    value: "power_high",
    label: "High Power Usage",
    unit: "W",
    icon: <Zap className="w-4 h-4 text-orange-500" />,
    deviceTypes: ["SMART_PLUG", "SMART_LIGHT", "ENERGY_METER"],
    description: "Alert when power consumption exceeds threshold",
    category: "power",
  },
  {
    value: "energy_spike",
    label: "Energy Spike",
    unit: "W",
    icon: <Zap className="w-4 h-4 text-red-500" />,
    deviceTypes: ["ENERGY_METER", "SMART_PLUG"],
    description: "Alert on sudden energy consumption spikes",
    category: "power",
  },

  // Water Systems
  {
    value: "pressure_high",
    label: "High Water Pressure",
    unit: "bar",
    icon: <Gauge className="w-4 h-4 text-red-500" />,
    deviceTypes: ["WATER_METER"],
    description: "Alert when water pressure exceeds safe levels",
    category: "water",
  },
  {
    value: "pressure_low",
    label: "Low Water Pressure",
    unit: "bar",
    icon: <Gauge className="w-4 h-4 text-orange-500" />,
    deviceTypes: ["WATER_METER"],
    description: "Alert when water pressure drops below threshold",
    category: "water",
  },
  {
    value: "flow_rate_high",
    label: "High Flow Rate",
    unit: "L/min",
    icon: <Droplets className="w-4 h-4 text-blue-500" />,
    deviceTypes: ["WATER_METER"],
    description: "Alert when water flow rate exceeds threshold",
    category: "water",
  },
  {
    value: "flow_rate_low",
    label: "Low Flow Rate",
    unit: "L/min",
    icon: <Droplets className="w-4 h-4 text-yellow-500" />,
    deviceTypes: ["WATER_METER"],
    description: "Alert when water flow rate drops below threshold",
    category: "water",
  },
  {
    value: "leak_detected",
    label: "Water Leak",
    unit: "",
    icon: <AlertTriangle className="w-4 h-4 text-red-600" />,
    deviceTypes: ["WATER_METER"],
    description: "Immediate alert when water leak is detected",
    category: "water",
  },

  // Air Quality
  {
    value: "aqi_high",
    label: "Poor Air Quality",
    unit: "AQI",
    icon: <Wind className="w-4 h-4 text-purple-600" />,
    deviceTypes: ["AIR_QUALITY_SENSOR"],
    description: "Alert when Air Quality Index exceeds healthy levels",
    category: "air",
  },
  {
    value: "pm25_high",
    label: "High PM2.5",
    unit: "µg/m³",
    icon: <Wind className="w-4 h-4 text-red-500" />,
    deviceTypes: ["AIR_QUALITY_SENSOR"],
    description: "Alert when PM2.5 particles exceed safe levels",
    category: "air",
  },
  {
    value: "co2_high",
    label: "High CO2 Levels",
    unit: "ppm",
    icon: <Wind className="w-4 h-4 text-orange-500" />,
    deviceTypes: ["AIR_QUALITY_SENSOR"],
    description: "Alert when CO2 concentration exceeds threshold",
    category: "air",
  },

  // Custom
  {
    value: "custom_metric",
    label: "Custom Metric",
    unit: "custom",
    icon: <Settings className="w-4 h-4 text-gray-500" />,
    deviceTypes: ["OTHER"],
    description: "Create custom alerts for specific sensor metrics",
    category: "custom",
  },
];

const severityConfig = {
  [AlertSeverity.LOW]: {
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-950/50",
    border: "border-blue-200 dark:border-blue-800",
    label: "Low",
    description: "Informational alerts for awareness",
    icon: <Info className="w-4 h-4" />,
  },
  [AlertSeverity.MEDIUM]: {
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-950/50",
    border: "border-amber-200 dark:border-amber-800",
    label: "Medium",
    description: "Moderate issues requiring attention",
    icon: <AlertTriangle className="w-4 h-4" />,
  },
  [AlertSeverity.HIGH]: {
    color: "text-orange-600 dark:text-orange-400",
    bg: "bg-orange-50 dark:bg-orange-950/50",
    border: "border-orange-200 dark:border-orange-800",
    label: "High",
    description: "Serious issues needing prompt action",
    icon: <AlertTriangle className="w-4 h-4" />,
  },
  [AlertSeverity.CRITICAL]: {
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-50 dark:bg-red-950/50",
    border: "border-red-200 dark:border-red-800",
    label: "Critical",
    description: "Urgent issues requiring immediate action",
    icon: <XCircle className="w-4 h-4" />,
  },
};

const operatorOptions = [
  { value: "gt", label: "Greater than", symbol: ">" },
  { value: "gte", label: "Greater than or equal", symbol: "≥" },
  { value: "lt", label: "Less than", symbol: "<" },
  { value: "lte", label: "Less than or equal", symbol: "≤" },
  { value: "eq", label: "Equal to", symbol: "=" },
];

const deviceTypeIcons: Record<
  string,
  { icon: React.ReactNode; color: string; label: string }
> = {
  TEMPERATURE_SENSOR: {
    icon: <Thermometer className="w-4 h-4" />,
    color: "text-red-500",
    label: "Temperature",
  },
  HUMIDITY_SENSOR: {
    icon: <Droplets className="w-4 h-4" />,
    color: "text-blue-500",
    label: "Humidity",
  },
  MOTION_DETECTOR: {
    icon: <Activity className="w-4 h-4" />,
    color: "text-yellow-500",
    label: "Motion",
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
    label: "Air Quality",
  },
  OTHER: {
    icon: <Settings className="w-4 h-4" />,
    color: "text-gray-500",
    label: "Custom Device",
  },
};

// Animation variants
const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0 },
};

export default function AlertConfigDialog({
  open,
  onOpenChange,
  devices,
  selectedDeviceId,
}: AlertConfigDialogProps) {
  const [activeTab, setActiveTab] = useState("existing");
  const [alertRules, setAlertRules] = useState<AlertRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editingRule, setEditingRule] = useState<AlertRule | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<string | null>(null);

  // Current user info
  const currentUser = {
    username: "Nikhil178-tech",
    loginTime: "2025-06-05 09:34:24",
  };

  // New rule form state with proper defaults
  const [newRule, setNewRule] = useState<Omit<AlertRule, "id">>({
    deviceId: selectedDeviceId || "",
    name: "",
    condition: "",
    threshold: 0,
    severity: AlertSeverity.MEDIUM,
    enabled: true,
    description: "",
    metricPath: "",
    operator: "gt",
    cooldownMinutes: 30,
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      fetchAlertRules();
      setFormErrors({});
      if (selectedDeviceId && selectedDeviceId !== newRule.deviceId) {
        setNewRule((prev) => ({
          ...prev,
          deviceId: selectedDeviceId,
          condition: "",
          threshold: 0,
        }));
      }
    }
  }, [open, selectedDeviceId]);

  const fetchAlertRules = async () => {
    try {
      setLoading(true);
      const rules = await alertsService.getAlertRules(selectedDeviceId);
      setAlertRules(Array.isArray(rules) ? rules : []);
    } catch (error) {
      console.error("Failed to fetch alert rules:", error);
      toast({
        title: "Error",
        description: "Failed to fetch alert rules. Please try again.",
        variant: "destructive",
      });
      setAlertRules([]);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!newRule.name.trim()) {
      errors.name = "Rule name is required";
    }
    if (!newRule.deviceId) {
      errors.deviceId = "Please select a device";
    }
    if (!newRule.condition) {
      errors.condition = "Please select a condition";
    }
    if (
      newRule.condition !== "motion_detected" &&
      newRule.condition !== "leak_detected" &&
      newRule.threshold <= 0
    ) {
      errors.threshold = "Threshold must be greater than 0";
    }
    if (newRule.condition === "custom_metric" && !newRule.metricPath?.trim()) {
      errors.metricPath = "Metric path is required for custom metrics";
    }
    if (newRule.cooldownMinutes < 1 || newRule.cooldownMinutes > 1440) {
      errors.cooldownMinutes = "Cooldown must be between 1 and 1440 minutes";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateRule = async () => {
    if (!validateForm()) {
      toast({
        title: "Validation Error",
        description: "Please fix the errors in the form",
        variant: "destructive",
      });
      return;
    }

    try {
      setCreating(true);
      const createdAlert = await alertsService.createAlert({
        ...newRule,
        title: newRule.name,
        message:
          newRule.description ||
          `Alert when ${
            selectedCondition?.label || newRule.condition
          } threshold is exceeded`,
      });

      // Transform the Alert response back to AlertRule format
      const createdRule: AlertRule = {
        id: createdAlert.id,
        deviceId: newRule.deviceId,
        name: newRule.name,
        condition: newRule.condition,
        threshold: newRule.threshold,
        severity: newRule.severity,
        enabled: newRule.enabled,
        description: newRule.description,
        metricPath: newRule.metricPath,
        operator: newRule.operator,
        cooldownMinutes: newRule.cooldownMinutes,
        createdAt: createdAlert.createdAt,
        updatedAt: createdAlert.updatedAt,
      };

      setAlertRules((prev) => [...prev, createdRule]);

      // Reset form
      setNewRule({
        deviceId: selectedDeviceId || "",
        name: "",
        condition: "",
        threshold: 0,
        severity: AlertSeverity.MEDIUM,
        enabled: true,
        description: "",
        metricPath: "",
        operator: "gt",
        cooldownMinutes: 30,
      });
      setFormErrors({});
      setActiveTab("existing");

      toast({
        title: "Success",
        description: "Alert rule created successfully",
      });
    } catch (error: any) {
      console.error("Failed to create alert rule:", error);
      toast({
        title: "Error",
        description:
          error.message || "Failed to create alert rule. Please try again.",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateRule = async (
    ruleId: string,
    updates: Partial<AlertRule>
  ) => {
    try {
      const updatedRule = await alertsService.updateAlertRule(ruleId, updates);
      setAlertRules((prev) =>
        prev.map((rule) => (rule.id === ruleId ? updatedRule : rule))
      );
      setEditingRule(null);

      toast({
        title: "Success",
        description: "Alert rule updated successfully",
      });
    } catch (error: any) {
      console.error("Failed to update alert rule:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update alert rule",
        variant: "destructive",
      });
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    try {
      await alertsService.deleteAlertRule(ruleId);
      setAlertRules((prev) => prev.filter((rule) => rule.id !== ruleId));
      setDeleteDialogOpen(null);

      toast({
        title: "Success",
        description: "Alert rule deleted successfully",
      });
    } catch (error: any) {
      console.error("Failed to delete alert rule:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete alert rule",
        variant: "destructive",
      });
    }
  };

  const getDeviceInfo = (deviceId: string) => {
    return devices.find((d) => d.id === deviceId);
  };

  const getAvailableConditions = (deviceType: string) => {
    return conditionOptions.filter(
      (condition) =>
        condition.deviceTypes.includes(deviceType) ||
        condition.deviceTypes.includes("ALL")
    );
  };

  const getConditionInfo = (condition: string) => {
    return conditionOptions.find((opt) => opt.value === condition);
  };

  const selectedDevice = getDeviceInfo(newRule.deviceId);
  const availableConditions = selectedDevice
    ? getAvailableConditions(selectedDevice.type)
    : [];
  const selectedCondition = getConditionInfo(newRule.condition);

  // Group conditions by category
  const groupedConditions = availableConditions.reduce((acc, condition) => {
    if (!acc[condition.category]) {
      acc[condition.category] = [];
    }
    acc[condition.category].push(condition);
    return acc;
  }, {} as Record<string, ConditionOption[]>);

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    return `${diffDays} days ago`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden p-0">
        <div className="flex flex-col h-full">
          {/* Header */}
          <DialogHeader className="px-6 py-4 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="flex items-center gap-2 text-xl">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Settings className="w-5 h-5 text-primary" />
                  </div>
                  IoT Alert Configuration
                </DialogTitle>
                <DialogDescription className="mt-2">
                  Configure intelligent monitoring rules for your IoT devices
                  {selectedDeviceId && (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm font-medium">
                        Selected Device:
                      </span>
                      <Badge variant="secondary" className="gap-1">
                        {selectedDevice && (
                          <span
                            className={
                              deviceTypeIcons[selectedDevice.type]?.color
                            }
                          >
                            {deviceTypeIcons[selectedDevice.type]?.icon}
                          </span>
                        )}
                        {selectedDevice?.name || selectedDeviceId}
                      </Badge>
                    </div>
                  )}
                </DialogDescription>
              </div>
              <div className="text-right text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  <span>{currentUser.username}</span>
                </div>
                <div className="flex items-center gap-1 mt-1">
                  <Calendar className="w-3 h-3" />
                  <span>{currentUser.loginTime}</span>
                </div>
              </div>
            </div>
          </DialogHeader>

          {/* Content */}
          <div className="flex-1 overflow-hidden">
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="h-full flex flex-col"
            >
              <div className="px-6 py-3 border-b border-border">
                <TabsList className="grid w-full grid-cols-2 max-w-md">
                  <TabsTrigger
                    value="existing"
                    className="flex items-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    Existing Rules
                    {alertRules.length > 0 && (
                      <Badge variant="secondary" className="ml-1 text-xs">
                        {alertRules.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger
                    value="create"
                    className="flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Create New
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* Existing Rules Tab */}
              <TabsContent value="existing" className="flex-1 m-0">
                <ScrollArea className="h-[calc(90vh-240px)]">
                  <div className="p-6">
                    {loading ? (
                      <motion.div
                        className="space-y-4"
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                      >
                        {[1, 2, 3].map((i) => (
                          <motion.div key={i} variants={itemVariants}>
                            <Card className="h-32">
                              <CardContent className="p-4">
                                <div className="animate-pulse space-y-3">
                                  <div className="h-4 bg-muted rounded w-3/4"></div>
                                  <div className="h-3 bg-muted rounded w-1/2"></div>
                                  <div className="h-3 bg-muted rounded w-2/3"></div>
                                </div>
                              </CardContent>
                            </Card>
                          </motion.div>
                        ))}
                      </motion.div>
                    ) : alertRules.length === 0 ? (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center py-16"
                      >
                        <div className="mx-auto w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-6">
                          <AlertTriangle className="w-10 h-10 text-muted-foreground" />
                        </div>
                        <h3 className="text-xl font-semibold mb-2">
                          No Alert Rules Configured
                        </h3>
                        <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                          {selectedDeviceId
                            ? `No monitoring rules found for ${
                                selectedDevice?.name || "this device"
                              }. Create your first rule to start monitoring.`
                            : "Start monitoring your IoT devices by creating alert rules. Get notified when something needs your attention."}
                        </p>
                        <Button
                          onClick={() => setActiveTab("create")}
                          size="lg"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Create Your First Rule
                        </Button>
                      </motion.div>
                    ) : (
                      <motion.div
                        className="space-y-4"
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                      >
                        {alertRules.map((rule, index) => {
                          const device = getDeviceInfo(rule.deviceId);
                          const condition = getConditionInfo(rule.condition);
                          const severity = severityConfig[rule.severity];
                          const deviceIcon = device
                            ? deviceTypeIcons[device.type]
                            : deviceTypeIcons.OTHER;

                          return (
                            <motion.div key={rule.id} variants={itemVariants}>
                              <Card
                                className={cn(
                                  "transition-all duration-200 hover:shadow-md",
                                  !rule.enabled && "opacity-60",
                                  rule.enabled && "border-l-4 border-l-primary"
                                )}
                              >
                                <CardHeader className="pb-3">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      <TooltipProvider>
                                        <Tooltip>
                                          <TooltipTrigger>
                                            <div
                                              className={cn(
                                                "p-2 rounded-lg",
                                                severity.bg,
                                                severity.border,
                                                "border"
                                              )}
                                            >
                                              <div className={severity.color}>
                                                {condition?.icon || (
                                                  <Settings className="w-4 h-4" />
                                                )}
                                              </div>
                                            </div>
                                          </TooltipTrigger>
                                          <TooltipContent>
                                            <p>
                                              {condition?.description ||
                                                "Custom alert condition"}
                                            </p>
                                          </TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>

                                      <div className="flex-1">
                                        <CardTitle className="text-lg flex items-center gap-2">
                                          {rule.name}
                                          {rule.enabled && (
                                            <Badge
                                              variant="secondary"
                                              className="text-xs"
                                            >
                                              <CheckCircle className="w-3 h-3 mr-1 text-green-500" />
                                              Active
                                            </Badge>
                                          )}
                                        </CardTitle>
                                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                                          <div className="flex items-center gap-1">
                                            <span className={deviceIcon?.color}>
                                              {deviceIcon?.icon}
                                            </span>
                                            <span>
                                              {device?.name || "Unknown Device"}
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-1">
                                            <Signal className="w-3 h-3" />
                                            <span>
                                              {condition?.label ||
                                                rule.condition}
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            <span>
                                              {rule.cooldownMinutes}min cooldown
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                      <Badge
                                        className={cn(
                                          severity.bg,
                                          severity.color,
                                          severity.border,
                                          "border"
                                        )}
                                      >
                                        {severity.icon}
                                        <span className="ml-1">
                                          {severity.label}
                                        </span>
                                      </Badge>

                                      <div className="flex items-center gap-1">
                                        <Switch
                                          checked={rule.enabled}
                                          onCheckedChange={(enabled) =>
                                            rule.id &&
                                            handleUpdateRule(rule.id, {
                                              enabled,
                                            })
                                          }
                                        />
                                      </div>

                                      <div className="flex gap-1">
                                        <TooltipProvider>
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() =>
                                                  setEditingRule(rule)
                                                }
                                              >
                                                <Edit className="w-4 h-4" />
                                              </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                              Edit rule
                                            </TooltipContent>
                                          </Tooltip>
                                        </TooltipProvider>

                                        <AlertDialog
                                          open={deleteDialogOpen === rule.id}
                                          onOpenChange={(open) =>
                                            !open && setDeleteDialogOpen(null)
                                          }
                                        >
                                          <AlertDialogTrigger asChild>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() =>
                                                setDeleteDialogOpen(rule.id)
                                              }
                                            >
                                              <Trash2 className="w-4 h-4 text-destructive" />
                                            </Button>
                                          </AlertDialogTrigger>
                                          <AlertDialogContent>
                                            <AlertDialogHeader>
                                              <AlertDialogTitle>
                                                Delete Alert Rule
                                              </AlertDialogTitle>
                                              <AlertDialogDescription>
                                                Are you sure you want to delete
                                                "{rule.name}"? This action
                                                cannot be undone.
                                              </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                              <AlertDialogCancel>
                                                Cancel
                                              </AlertDialogCancel>
                                              <AlertDialogAction
                                                onClick={() =>
                                                  rule.id &&
                                                  handleDeleteRule(rule.id)
                                                }
                                                className="bg-destructive text-destructive-foreground"
                                              >
                                                Delete
                                              </AlertDialogAction>
                                            </AlertDialogFooter>
                                          </AlertDialogContent>
                                        </AlertDialog>
                                      </div>
                                    </div>
                                  </div>
                                </CardHeader>

                                <CardContent className="pt-0">
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg">
                                    <div>
                                      <Label className="text-xs text-muted-foreground">
                                        Condition
                                      </Label>
                                      <div className="font-medium text-sm">
                                        {
                                          operatorOptions.find(
                                            (op) => op.value === rule.operator
                                          )?.symbol
                                        }{" "}
                                        {rule.threshold}
                                        {condition?.unit && (
                                          <span className="ml-1 text-muted-foreground">
                                            {condition.unit}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <div>
                                      <Label className="text-xs text-muted-foreground">
                                        Device Status
                                      </Label>
                                      <div className="flex items-center gap-2 text-sm">
                                        <div
                                          className={cn(
                                            "w-2 h-2 rounded-full",
                                            device?.status === "ONLINE"
                                              ? "bg-green-500"
                                              : "bg-red-500"
                                          )}
                                        />
                                        {device?.status || "UNKNOWN"}
                                      </div>
                                    </div>
                                    <div>
                                      <Label className="text-xs text-muted-foreground">
                                        Created
                                      </Label>
                                      <div className="text-sm font-medium">
                                        {rule.createdAt
                                          ? formatTimeAgo(rule.createdAt)
                                          : "Unknown"}
                                      </div>
                                    </div>
                                  </div>

                                  {rule.description && (
                                    <>
                                      <Separator className="my-3" />
                                      <div>
                                        <Label className="text-xs text-muted-foreground">
                                          Description
                                        </Label>
                                        <p className="text-sm mt-1">
                                          {rule.description}
                                        </p>
                                      </div>
                                    </>
                                  )}
                                </CardContent>
                              </Card>
                            </motion.div>
                          );
                        })}
                      </motion.div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* Create New Rule Tab */}
              <TabsContent value="create" className="flex-1 m-0">
                <ScrollArea className="h-[calc(90vh-240px)]">
                  <div className="p-6">
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="max-w-4xl mx-auto space-y-8"
                    >
                      {/* Device Selection */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Smartphone className="w-5 h-5" />
                            Device Selection
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="device">Target Device *</Label>
                              <Select
                                value={newRule.deviceId}
                                onValueChange={(value) => {
                                  setNewRule((prev) => ({
                                    ...prev,
                                    deviceId: value,
                                    condition: "", // Reset condition when device changes
                                    threshold: 0,
                                  }));
                                  setFormErrors((prev) => ({
                                    ...prev,
                                    deviceId: "",
                                  }));
                                }}
                              >
                                <SelectTrigger
                                  className={cn(
                                    formErrors.deviceId && "border-destructive"
                                  )}
                                >
                                  <SelectValue placeholder="Choose a device to monitor" />
                                </SelectTrigger>
                                <SelectContent>
                                  {devices.map((device) => {
                                    const deviceIcon =
                                      deviceTypeIcons[device.type] ||
                                      deviceTypeIcons.OTHER;
                                    return (
                                      <SelectItem
                                        key={device.id}
                                        value={device.id}
                                      >
                                        <div className="flex items-center gap-3 py-1">
                                          <span className={deviceIcon.color}>
                                            {deviceIcon.icon}
                                          </span>
                                          <div>
                                            <div className="font-medium">
                                              {device.name}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                              {deviceIcon.label} •{" "}
                                              {device.status}
                                              {device.currentLocation && (
                                                <span className="ml-1">
                                                  • {device.currentLocation}
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      </SelectItem>
                                    );
                                  })}
                                </SelectContent>
                              </Select>
                              {formErrors.deviceId && (
                                <p className="text-xs text-destructive">
                                  {formErrors.deviceId}
                                </p>
                              )}
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="name">Rule Name *</Label>
                              <Input
                                id="name"
                                value={newRule.name}
                                onChange={(e) => {
                                  setNewRule((prev) => ({
                                    ...prev,
                                    name: e.target.value,
                                  }));
                                  setFormErrors((prev) => ({
                                    ...prev,
                                    name: "",
                                  }));
                                }}
                                placeholder="e.g., High Temperature Warning"
                                className={cn(
                                  formErrors.name && "border-destructive"
                                )}
                              />
                              {formErrors.name && (
                                <p className="text-xs text-destructive">
                                  {formErrors.name}
                                </p>
                              )}
                            </div>
                          </div>

                          {selectedDevice && (
                            <div className="p-4 bg-muted/50 rounded-lg">
                              <div className="flex items-center gap-3">
                                <div
                                  className={cn(
                                    "p-2 rounded-lg",
                                    deviceTypeIcons[selectedDevice.type]?.color
                                  )}
                                >
                                  {deviceTypeIcons[selectedDevice.type]?.icon}
                                </div>
                                <div>
                                  <div className="font-medium">
                                    {selectedDevice.name}
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    {
                                      deviceTypeIcons[selectedDevice.type]
                                        ?.label
                                    }{" "}
                                    • Status: {selectedDevice.status}
                                    {selectedDevice.batteryLevel && (
                                      <span>
                                        {" "}
                                        • Battery: {selectedDevice.batteryLevel}
                                        %
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      {/* Condition Configuration */}
                      {selectedDevice && (
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <AlertTriangle className="w-5 h-5" />
                              Alert Condition
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-6">
                            <div className="space-y-2">
                              <Label htmlFor="condition">
                                Monitoring Condition *
                              </Label>
                              <Select
                                value={newRule.condition}
                                onValueChange={(value) => {
                                  setNewRule((prev) => ({
                                    ...prev,
                                    condition: value,
                                  }));
                                  setFormErrors((prev) => ({
                                    ...prev,
                                    condition: "",
                                  }));
                                }}
                              >
                                <SelectTrigger
                                  className={cn(
                                    formErrors.condition && "border-destructive"
                                  )}
                                >
                                  <SelectValue placeholder="What should trigger this alert?" />
                                </SelectTrigger>
                                <SelectContent>
                                  {Object.entries(groupedConditions).map(
                                    ([category, conditions]) => (
                                      <div key={category}>
                                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                          <div className="flex items-center gap-2">
                                            <span
                                              className={
                                                conditionCategories[
                                                  category as keyof typeof conditionCategories
                                                ]?.color
                                              }
                                            >
                                              {
                                                conditionCategories[
                                                  category as keyof typeof conditionCategories
                                                ]?.icon
                                              }
                                            </span>
                                            {
                                              conditionCategories[
                                                category as keyof typeof conditionCategories
                                              ]?.label
                                            }
                                          </div>
                                        </div>
                                        {conditions.map((condition) => (
                                          <SelectItem
                                            key={condition.value}
                                            value={condition.value}
                                          >
                                            <div className="flex items-center gap-3 py-1">
                                              {condition.icon}
                                              <div>
                                                <div className="font-medium">
                                                  {condition.label}
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                  {condition.description}
                                                </div>
                                              </div>
                                            </div>
                                          </SelectItem>
                                        ))}
                                        <Separator className="my-1" />
                                      </div>
                                    )
                                  )}
                                </SelectContent>
                              </Select>
                              {formErrors.condition && (
                                <p className="text-xs text-destructive">
                                  {formErrors.condition}
                                </p>
                              )}
                            </div>

                            {selectedCondition && (
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                  <Label htmlFor="operator">Comparison</Label>
                                  <Select
                                    value={newRule.operator}
                                    onValueChange={(value) =>
                                      setNewRule((prev) => ({
                                        ...prev,
                                        operator: value,
                                      }))
                                    }
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {operatorOptions.map((option) => (
                                        <SelectItem
                                          key={option.value}
                                          value={option.value}
                                        >
                                          <div className="flex items-center gap-2">
                                            <code className="px-1 py-0.5 bg-muted rounded text-xs">
                                              {option.symbol}
                                            </code>
                                            {option.label}
                                          </div>
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div className="space-y-2">
                                  <Label htmlFor="threshold">
                                    Threshold Value *
                                  </Label>
                                  <div className="flex">
                                    <Input
                                      id="threshold"
                                      type="number"
                                      step="0.1"
                                      value={newRule.threshold}
                                      onChange={(e) => {
                                        setNewRule((prev) => ({
                                          ...prev,
                                          threshold: Number(e.target.value),
                                        }));
                                        setFormErrors((prev) => ({
                                          ...prev,
                                          threshold: "",
                                        }));
                                      }}
                                      placeholder="Enter value"
                                      className={cn(
                                        "rounded-r-none",
                                        formErrors.threshold &&
                                          "border-destructive"
                                      )}
                                    />
                                    <div className="px-3 py-2 bg-muted border border-l-0 rounded-r-md text-sm font-medium min-w-[60px] flex items-center justify-center">
                                      {selectedCondition.unit || "value"}
                                    </div>
                                  </div>
                                  {formErrors.threshold && (
                                    <p className="text-xs text-destructive">
                                      {formErrors.threshold}
                                    </p>
                                  )}
                                </div>

                                <div className="space-y-2">
                                  <Label htmlFor="cooldown">
                                    Cooldown Period
                                  </Label>
                                  <div className="flex">
                                    <Input
                                      id="cooldown"
                                      type="number"
                                      min="1"
                                      max="1440"
                                      value={newRule.cooldownMinutes}
                                      onChange={(e) => {
                                        setNewRule((prev) => ({
                                          ...prev,
                                          cooldownMinutes: Number(
                                            e.target.value
                                          ),
                                        }));
                                        setFormErrors((prev) => ({
                                          ...prev,
                                          cooldownMinutes: "",
                                        }));
                                      }}
                                      className={cn(
                                        "rounded-r-none",
                                        formErrors.cooldownMinutes &&
                                          "border-destructive"
                                      )}
                                    />
                                    <div className="px-3 py-2 bg-muted border border-l-0 rounded-r-md text-sm font-medium">
                                      min
                                    </div>
                                  </div>
                                  {formErrors.cooldownMinutes && (
                                    <p className="text-xs text-destructive">
                                      {formErrors.cooldownMinutes}
                                    </p>
                                  )}
                                </div>
                              </div>
                            )}

                            {newRule.condition === "custom_metric" && (
                              <div className="space-y-2">
                                <Label htmlFor="metricPath">
                                  Custom Metric Path *
                                </Label>
                                <Input
                                  id="metricPath"
                                  value={newRule.metricPath}
                                  onChange={(e) => {
                                    setNewRule((prev) => ({
                                      ...prev,
                                      metricPath: e.target.value,
                                    }));
                                    setFormErrors((prev) => ({
                                      ...prev,
                                      metricPath: "",
                                    }));
                                  }}
                                  placeholder="e.g., rawData.moisture or metrics.primary.value"
                                  className={cn(
                                    formErrors.metricPath &&
                                      "border-destructive"
                                  )}
                                />
                                {formErrors.metricPath && (
                                  <p className="text-xs text-destructive">
                                    {formErrors.metricPath}
                                  </p>
                                )}
                                <p className="text-xs text-muted-foreground">
                                  Specify the JSON path to the metric you want
                                  to monitor
                                </p>
                              </div>
                            )}

                            {selectedCondition && (
                              <div className="p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                                <div className="flex items-start gap-3">
                                  <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                                  <div>
                                    <div className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                                      {selectedCondition.label}
                                    </div>
                                    <p className="text-sm text-blue-700 dark:text-blue-300">
                                      {selectedCondition.description}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      )}

                      {/* Alert Settings */}
                      {newRule.condition && (
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <Settings className="w-5 h-5" />
                              Alert Settings
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-6">
                            <div className="space-y-2">
                              <Label htmlFor="severity">Alert Severity *</Label>
                              <Select
                                value={newRule.severity}
                                onValueChange={(value: AlertSeverity) =>
                                  setNewRule((prev) => ({
                                    ...prev,
                                    severity: value,
                                  }))
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {Object.entries(severityConfig).map(
                                    ([value, config]) => (
                                      <SelectItem key={value} value={value}>
                                        <div className="flex items-center gap-3 py-1">
                                          <div
                                            className={cn(
                                              "p-1 rounded",
                                              config.bg
                                            )}
                                          >
                                            <div className={config.color}>
                                              {config.icon}
                                            </div>
                                          </div>
                                          <div>
                                            <div className="font-medium">
                                              {config.label}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                              {config.description}
                                            </div>
                                          </div>
                                        </div>
                                      </SelectItem>
                                    )
                                  )}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="description">
                                Description (Optional)
                              </Label>
                              <Textarea
                                id="description"
                                value={newRule.description}
                                onChange={(e) =>
                                  setNewRule((prev) => ({
                                    ...prev,
                                    description: e.target.value,
                                  }))
                                }
                                placeholder="Add additional context or instructions for this alert..."
                                rows={3}
                                className="resize-none"
                              />
                            </div>

                            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                              <div>
                                <Label
                                  htmlFor="enabled"
                                  className="text-base font-medium"
                                >
                                  Enable Rule
                                </Label>
                                <p className="text-sm text-muted-foreground">
                                  Start monitoring immediately after creation
                                </p>
                              </div>
                              <Switch
                                id="enabled"
                                checked={newRule.enabled}
                                onCheckedChange={(enabled) =>
                                  setNewRule((prev) => ({ ...prev, enabled }))
                                }
                              />
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* Preview */}
                      {newRule.name &&
                        newRule.condition &&
                        newRule.deviceId &&
                        selectedCondition && (
                          <Card className="border-2 border-dashed border-primary/30">
                            <CardHeader>
                              <CardTitle className="flex items-center gap-2 text-primary">
                                <Eye className="w-5 h-5" />
                                Rule Preview
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-4">
                                <div className="p-4 bg-primary/5 rounded-lg">
                                  <div className="text-lg font-semibold mb-2">
                                    {newRule.name}
                                  </div>
                                  <p className="text-sm text-muted-foreground">
                                    <strong>Device:</strong>{" "}
                                    {selectedDevice?.name} (
                                    {
                                      deviceTypeIcons[
                                        selectedDevice?.type || "OTHER"
                                      ]?.label
                                    }
                                    )
                                    <br />
                                    <strong>Condition:</strong> Alert when{" "}
                                    {selectedCondition.label.toLowerCase()} is{" "}
                                    {operatorOptions
                                      .find(
                                        (op) => op.value === newRule.operator
                                      )
                                      ?.label.toLowerCase()}{" "}
                                    {newRule.threshold}
                                    {selectedCondition.unit &&
                                      ` ${selectedCondition.unit}`}
                                    <br />
                                    <strong>Severity:</strong>{" "}
                                    {severityConfig[newRule.severity].label}
                                    <br />
                                    <strong>Cooldown:</strong>{" "}
                                    {newRule.cooldownMinutes} minutes between
                                    alerts
                                    <br />
                                    <strong>Status:</strong>{" "}
                                    {newRule.enabled
                                      ? "✅ Active"
                                      : "⏸️ Inactive"}
                                  </p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        )}
                    </motion.div>
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </div>

          {/* Footer */}
          <DialogFooter className="px-6 py-4 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex justify-between w-full">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              {activeTab === "create" && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setNewRule({
                        deviceId: selectedDeviceId || "",
                        name: "",
                        condition: "",
                        threshold: 0,
                        severity: AlertSeverity.MEDIUM,
                        enabled: true,
                        description: "",
                        metricPath: "",
                        operator: "gt",
                        cooldownMinutes: 30,
                      });
                      setFormErrors({});
                    }}
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Reset
                  </Button>
                  <Button
                    onClick={handleCreateRule}
                    disabled={
                      creating ||
                      !newRule.name ||
                      !newRule.condition ||
                      !newRule.deviceId
                    }
                  >
                    {creating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Create Alert Rule
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
