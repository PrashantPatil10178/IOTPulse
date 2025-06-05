"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
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
import { cn } from "@/lib/utils";
import type { Alert } from "@/types";
import { AlertSeverity, AlertStatus } from "@/types";

interface SeverityConfig {
  icon: React.ReactNode;
  color: string;
  bg: string;
  border: string;
}

interface StatusConfig {
  color: string;
  bg: string;
  border: string;
}

// Demo alerts data
const demoAlerts: Alert[] = [
  {
    id: "1",
    title: "CPU usage exceeded threshold (95%)",
    message: "CPU usage exceeded threshold (95%)",
    deviceId: "server-001",
    userId: "user-1",
    timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    status: AlertStatus.ACTIVE,
    severity: AlertSeverity.CRITICAL,
  },
  {
    id: "2",
    title: "Device offline for more than 30 minutes",
    message: "Device offline for more than 30 minutes",
    deviceId: "sensor-042",
    userId: "user-1",
    timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    status: AlertStatus.ACKNOWLEDGED,
    severity: AlertSeverity.MEDIUM,
  },
  {
    id: "3",
    title: "Battery level below 10%",
    message: "Battery level below 10%",
    deviceId: "device-128",
    userId: "user-1",
    timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    status: AlertStatus.RESOLVED,
    severity: AlertSeverity.MEDIUM,
  },
  {
    id: "4",
    title: "Memory usage at 85%",
    message: "Memory usage at 85%",
    deviceId: "server-002",
    userId: "user-1",
    timestamp: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    status: AlertStatus.ACTIVE,
    severity: AlertSeverity.MEDIUM,
  },
  {
    id: "5",
    title: "Unauthorized access attempt detected",
    message: "Unauthorized access attempt detected",
    deviceId: "gateway-001",
    userId: "user-1",
    timestamp: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
    status: AlertStatus.ACTIVE,
    severity: AlertSeverity.CRITICAL,
  },
  {
    id: "6",
    title: "Database connection pool exhausted",
    message: "Database connection pool exhausted",
    deviceId: "db-001",
    userId: "user-1",
    timestamp: new Date(Date.now() - 1000 * 60 * 300).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 300).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 300).toISOString(),
    status: AlertStatus.ACKNOWLEDGED,
    severity: AlertSeverity.CRITICAL,
  },
  {
    id: "7",
    title: "Scheduled maintenance required",
    message: "Scheduled maintenance required",
    deviceId: "router-003",
    userId: "user-1",
    timestamp: new Date(Date.now() - 1000 * 60 * 1440).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 1440).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 1440).toISOString(),
    status: AlertStatus.RESOLVED,
    severity: AlertSeverity.LOW,
  },
];

export default function Alerts() {
  const [allAlerts, setAllAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [tab, setTab] = useState("all");
  const [refreshing, setRefreshing] = useState(false);

  // Alert dialogs
  const [acknowledgeDialog, setAcknowledgeDialog] = useState(false);
  const [resolveDialog, setResolveDialog] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [alertNotes, setAlertNotes] = useState("");

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      setAllAlerts(demoAlerts);
    } catch (error) {
      console.error("Error fetching alerts:", error);
    } finally {
      setLoading(false);
    }
  };

  const refreshAlerts = async () => {
    setRefreshing(true);
    await fetchAlerts();
    setRefreshing(false);
  };

  // Filtered alerts based on search and filters
  const filteredAlerts = allAlerts.filter((alert) => {
    if (tab === "active" && alert.status !== AlertStatus.ACTIVE) return false;
    if (tab === "acknowledged" && alert.status !== AlertStatus.ACKNOWLEDGED)
      return false;
    if (tab === "resolved" && alert.status !== AlertStatus.RESOLVED)
      return false;

    if (
      searchTerm &&
      !alert.message.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !alert.deviceId.toLowerCase().includes(searchTerm.toLowerCase())
    ) {
      return false;
    }

    if (statusFilter !== "all" && alert.status !== statusFilter) return false;
    if (severityFilter !== "all" && alert.severity !== severityFilter)
      return false;

    return true;
  });

  // Get counts for badges
  const counts = {
    active: allAlerts.filter((a) => a.status === AlertStatus.ACTIVE).length,
    acknowledged: allAlerts.filter((a) => a.status === AlertStatus.ACKNOWLEDGED)
      .length,
    resolved: allAlerts.filter((a) => a.status === AlertStatus.RESOLVED).length,
  };

  // Handle acknowledging an alert
  const acknowledgeAlert = async () => {
    if (!selectedAlert) return;

    try {
      const user = "Admin";
      setAllAlerts((prevAlerts) =>
        prevAlerts.map((alert) =>
          alert.id === selectedAlert.id
            ? {
                ...alert,
                status: AlertStatus.ACKNOWLEDGED,
                acknowledgedAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              }
            : alert
        )
      );
      setAcknowledgeDialog(false);
    } catch (error) {
      console.error("Error acknowledging alert:", error);
    }
  };

  // Handle resolving an alert
  const resolveAlert = async () => {
    if (!selectedAlert) return;

    try {
      const user = "Admin";
      setAllAlerts((prevAlerts) =>
        prevAlerts.map((alert) =>
          alert.id === selectedAlert.id
            ? {
                ...alert,
                status: AlertStatus.RESOLVED,
                resolvedAt: new Date().toISOString(),
                resolutionNotes: alertNotes,
                updatedAt: new Date().toISOString(),
              }
            : alert
        )
      );
      setResolveDialog(false);
      setAlertNotes("");
    } catch (error) {
      console.error("Error resolving alert:", error);
    }
  };

  // Severity config for styling
  const severityConfig: Record<AlertSeverity, SeverityConfig> = {
    [AlertSeverity.LOW]: {
      icon: <Info className="w-4 h-4" />,
      color: "text-blue-600",
      bg: "bg-blue-100 dark:bg-blue-900/30",
      border: "border-blue-200 dark:border-blue-800",
    },
    [AlertSeverity.MEDIUM]: {
      icon: <AlertTriangle className="w-4 h-4" />,
      color: "text-amber-600",
      bg: "bg-amber-100 dark:bg-amber-900/30",
      border: "border-amber-200 dark:border-amber-800",
    },
    [AlertSeverity.HIGH]: {
      icon: <AlertTriangle className="w-4 h-4" />,
      color: "text-orange-600",
      bg: "bg-orange-100 dark:bg-orange-900/30",
      border: "border-orange-200 dark:border-orange-800",
    },
    [AlertSeverity.CRITICAL]: {
      icon: <AlertTriangle className="w-4 h-4" />,
      color: "text-red-600",
      bg: "bg-red-100 dark:bg-red-900/30",
      border: "border-red-200 dark:border-red-800",
    },
  };

  // Status config for styling
  const statusConfig: Record<AlertStatus, StatusConfig> = {
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
  };

  // Format timestamp to relative time
  const formatTimeAgo = (timestamp: string | number | Date) => {
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
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Alerts</h1>
          <p className="text-muted-foreground">
            Monitor and manage system alerts and notifications
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1 md:flex-none"
            onClick={refreshAlerts}
            disabled={refreshing}
          >
            <RefreshCw
              className={cn("w-4 h-4 mr-2", refreshing && "animate-spin")}
            />
            {refreshing ? "Refreshing..." : "Refresh"}
          </Button>
          <Button className="flex-1 md:flex-none bg-blue-600 hover:bg-blue-700">
            <Settings className="w-4 h-4 mr-2" />
            Configure Alerts
          </Button>
        </div>
      </div>

      {/* Tabs */}
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

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search alerts..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-3">
          <Select
            value={statusFilter}
            onValueChange={(value: string) => setStatusFilter(value)}
          >
            <SelectTrigger className="w-full md:w-[140px]">
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

          <Select
            value={severityFilter}
            onValueChange={(value: string) => setSeverityFilter(value)}
          >
            <SelectTrigger className="w-full md:w-[140px]">
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
        </div>
      </div>

      {/* Alert List */}
      {loading ? (
        <div className="space-y-4">
          {Array(5)
            .fill(0)
            .map((_, index) => (
              <Skeleton key={index} className="h-28" />
            ))}
        </div>
      ) : filteredAlerts.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 border rounded-lg p-8 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mb-4">
            <Bell className="w-6 h-6 text-slate-500" />
          </div>
          <h3 className="text-lg font-medium mb-1">No alerts found</h3>
          <p className="text-slate-500 dark:text-slate-400 mb-4">
            {searchTerm || statusFilter !== "all" || severityFilter !== "all"
              ? "Try adjusting your search or filters"
              : "All systems are operating normally"}
          </p>
          {searchTerm || statusFilter !== "all" || severityFilter !== "all" ? (
            <Button
              variant="outline"
              onClick={() => {
                setSearchTerm("");
                setStatusFilter("all");
                setSeverityFilter("all");
              }}
            >
              <Filter className="w-4 h-4 mr-2" />
              Clear Filters
            </Button>
          ) : (
            <Button variant="outline" onClick={refreshAlerts}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          )}
        </div>
      ) : (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="space-y-4"
        >
          {filteredAlerts.map((alert) => {
            const severity =
              severityConfig[alert.severity] ||
              severityConfig[AlertSeverity.LOW];
            const status =
              statusConfig[alert.status] || statusConfig[AlertStatus.ACTIVE];

            return (
              <motion.div
                key={alert.id}
                variants={itemVariants}
                layoutId={alert.id}
              >
                <Card
                  className={cn(
                    "border overflow-hidden transition-all",
                    alert.status === AlertStatus.ACTIVE &&
                      alert.severity !== AlertSeverity.LOW &&
                      "border-red-200 dark:border-red-800"
                  )}
                >
                  <CardHeader className="p-4 pb-3">
                    <div className="flex justify-between items-start">
                      <div className="flex items-start gap-3">
                        <div
                          className={cn(
                            "rounded-full p-1.5 mt-0.5",
                            severity.bg
                          )}
                        >
                          <div className={severity.color}>{severity.icon}</div>
                        </div>
                        <div>
                          <CardTitle className="text-base font-medium">
                            {alert.title}
                          </CardTitle>
                          <div className="flex flex-wrap gap-2 mt-1">
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
                            <div className="flex items-center text-xs text-muted-foreground">
                              <Smartphone className="w-3 h-3 mr-1" />
                              {alert.deviceId}
                            </div>
                            <div className="flex items-center text-xs text-muted-foreground">
                              <Clock className="w-3 h-3 mr-1" />
                              {formatTimeAgo(
                                alert.timestamp || alert.createdAt
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {alert.status === AlertStatus.ACTIVE && (
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedAlert(alert);
                                setAcknowledgeDialog(true);
                              }}
                            >
                              <CheckCircle className="w-4 h-4 mr-2 text-amber-500" />
                              Acknowledge
                            </DropdownMenuItem>
                          )}

                          {(alert.status === AlertStatus.ACTIVE ||
                            alert.status === AlertStatus.ACKNOWLEDGED) && (
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedAlert(alert);
                                setResolveDialog(true);
                              }}
                            >
                              <CheckCircle className="w-4 h-4 mr-2 text-emerald-500" />
                              Resolve
                            </DropdownMenuItem>
                          )}

                          <DropdownMenuSeparator />

                          <DropdownMenuItem>
                            <Bell className="w-4 h-4 mr-2" />
                            Snooze
                          </DropdownMenuItem>

                          <DropdownMenuItem>
                            <Settings className="w-4 h-4 mr-2" />
                            Alert Details
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* Acknowledge Dialog */}
      <Dialog open={acknowledgeDialog} onOpenChange={setAcknowledgeDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Acknowledge Alert</DialogTitle>
            <DialogDescription>
              Are you sure you want to acknowledge this alert?
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
                      className={severityConfig[selectedAlert.severity].color}
                    >
                      {severityConfig[selectedAlert.severity].icon}
                    </div>
                  </div>
                  <div>
                    <div className="font-medium">{selectedAlert.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {selectedAlert.deviceId} •{" "}
                      {new Date(
                        selectedAlert.timestamp || selectedAlert.createdAt
                      ).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-sm text-muted-foreground mb-2">
                Acknowledging this alert will update its status, but it will
                remain in the system until resolved.
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
              onClick={acknowledgeAlert}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Acknowledge
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Resolve Dialog */}
      <Dialog open={resolveDialog} onOpenChange={setResolveDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Resolve Alert</DialogTitle>
            <DialogDescription>
              Add notes about how this alert was resolved.
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
                      className={severityConfig[selectedAlert.severity].color}
                    >
                      {severityConfig[selectedAlert.severity].icon}
                    </div>
                  </div>
                  <div>
                    <div className="font-medium">{selectedAlert.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {selectedAlert.deviceId} •{" "}
                      {new Date(
                        selectedAlert.timestamp || selectedAlert.createdAt
                      ).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <label className="text-right text-sm">Resolution Notes</label>
                  <textarea
                    className="col-span-3 min-h-[80px] flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    placeholder="Describe how the issue was resolved..."
                    value={alertNotes}
                    onChange={(e) => setAlertNotes(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveDialog(false)}>
              Cancel
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={resolveAlert}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Resolve Alert
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
