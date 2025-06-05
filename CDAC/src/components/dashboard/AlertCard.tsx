"use client";
import { motion } from "framer-motion";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  ChevronRight,
  Clock,
  Info,
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
import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";
import type { Alert } from "@/types";

// Severity configuration with icons and styles - Updated for Prisma schema
const severityConfig = {
  LOW: {
    icon: <Info className="h-4 w-4" />,
    color: "text-blue-500",
    bg: "bg-blue-100 dark:bg-blue-900/30",
    border: "border-blue-200 dark:border-blue-800",
    label: "Low",
  },
  MEDIUM: {
    icon: <AlertTriangle className="h-4 w-4" />,
    color: "text-amber-500",
    bg: "bg-amber-100 dark:bg-amber-900/30",
    border: "border-amber-200 dark:border-amber-800",
    label: "Medium",
  },
  HIGH: {
    icon: <AlertCircle className="h-4 w-4" />,
    color: "text-orange-500",
    bg: "bg-orange-100 dark:bg-orange-900/30",
    border: "border-orange-200 dark:border-orange-800",
    label: "High",
  },
  CRITICAL: {
    icon: <AlertCircle className="h-4 w-4" />,
    color: "text-red-600",
    bg: "bg-red-100 dark:bg-red-900/30",
    border: "border-red-200 dark:border-red-800",
    label: "Critical",
  },
};

// Status configuration - Updated for Prisma schema
const statusConfig = {
  ACTIVE: {
    color: "text-red-500 bg-red-100 dark:bg-red-900/30",
    border: "border-red-200 dark:border-red-800",
    label: "Active",
  },
  ACKNOWLEDGED: {
    color: "text-amber-500 bg-amber-100 dark:bg-amber-900/30",
    border: "border-amber-200 dark:border-amber-800",
    label: "Acknowledged",
  },
  RESOLVED: {
    color: "text-emerald-500 bg-emerald-100 dark:bg-emerald-900/30",
    border: "border-emerald-200 dark:border-emerald-800",
    label: "Resolved",
  },
};

interface AlertsCardProps {
  alerts?: Alert[];
  limit?: number;
}

export default function AlertsCard({
  alerts = [],
  limit = 5,
}: AlertsCardProps) {
  // Animation variants for the card
  const cardVariants = {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1, transition: { duration: 0.4 } },
  };

  // Animation variants for each list item
  const itemVariants = {
    initial: { opacity: 0, x: -20 },
    animate: (i: number) => ({
      opacity: 1,
      x: 0,
      transition: { delay: i * 0.1, duration: 0.3 },
    }),
  };

  const limitedAlerts = alerts.slice(0, limit);
  const hasMoreAlerts = alerts.length > limit;

  // Display time difference in a human-readable format
  const getTimeAgo = (timestamp: string) => {
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

  return (
    <motion.div variants={cardVariants} initial="initial" animate="animate">
      <Card className="border dark:border-slate-800">
        <CardHeader className="p-4 pb-2">
          <div className="flex justify-between items-center">
            <CardTitle className="text-base font-semibold flex items-center">
              <AlertCircle className="w-4 h-4 mr-2 text-red-500" />
              Recent Alerts
            </CardTitle>
            <Badge
              variant="outline"
              className={cn(
                "px-2 py-0.5 text-xs font-medium",
                alerts.filter((a) => a.status === "ACTIVE").length > 0
                  ? statusConfig.ACTIVE.color
                  : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300"
              )}
            >
              {alerts.filter((a) => a.status === "ACTIVE").length} active
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-2">
          {alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <CheckCircle className="w-10 h-10 text-emerald-500 mb-2 opacity-80" />
              <p className="text-sm text-muted-foreground">No active alerts</p>
              <p className="text-xs text-muted-foreground">
                All systems operating normally
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {limitedAlerts.map((alert, i) => {
                const severity =
                  severityConfig[alert.severity] || severityConfig.LOW;
                const status =
                  statusConfig[alert.status] || statusConfig.ACTIVE;

                return (
                  <motion.li
                    key={alert.id}
                    custom={i}
                    variants={itemVariants}
                    initial="initial"
                    animate="animate"
                    className={cn(
                      "rounded-lg border p-3 relative overflow-hidden",
                      status.border
                    )}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-start gap-2">
                        <div className={cn("rounded-full p-1", severity.bg)}>
                          <div className={severity.color}>{severity.icon}</div>
                        </div>
                        <div>
                          <p className="text-sm font-medium leading-tight">
                            {alert.title}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {alert.message}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <p className="text-xs text-muted-foreground">
                              {alert.deviceId}
                            </p>
                            <div className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
                            <div className="flex items-center text-xs text-muted-foreground">
                              <Clock className="w-3 h-3 mr-1" />
                              {getTimeAgo(alert.createdAt)}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] uppercase font-medium",
                            status.color
                          )}
                        >
                          {status.label}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] font-medium",
                            severity.color
                          )}
                        >
                          {severity.label}
                        </Badge>
                      </div>
                    </div>
                  </motion.li>
                );
              })}
            </ul>
          )}
        </CardContent>
        {hasMoreAlerts && (
          <CardFooter className="p-4 pt-0">
            <Link to="/alerts" className="w-full">
              <Button variant="outline" className="w-full text-xs">
                View all alerts
                <ChevronRight className="w-3 h-3 ml-1" />
              </Button>
            </Link>
          </CardFooter>
        )}
      </Card>
    </motion.div>
  );
}
