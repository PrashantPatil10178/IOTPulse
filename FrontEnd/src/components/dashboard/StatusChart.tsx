"use client";

import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, AlertCircle, Clock } from "lucide-react";

interface StatusChartProps {
  status: any;
  deviceType: string;
  color?: string;
  title?: string;
  className?: string;
}

export default function StatusChart({
  status,
  deviceType,
  color = "#3b82f6",
  title = "Device Status",
  className = "",
}: StatusChartProps) {
  const getStatusInfo = () => {
    if (typeof status === "boolean") {
      return {
        value: status ? "Active" : "Inactive",
        color: status ? "#10b981" : "#ef4444",
        icon: status ? CheckCircle : XCircle,
        description: status
          ? "Device is operational"
          : "Device is not operational",
      };
    }

    if (typeof status === "string") {
      const normalizedStatus = status.toLowerCase();

      const statusMap: Record<string, any> = {
        // Common status values
        on: {
          value: "ON",
          color: "#10b981",
          icon: CheckCircle,
          description: "Device is on",
        },
        off: {
          value: "OFF",
          color: "#6b7280",
          icon: XCircle,
          description: "Device is off",
        },
        online: {
          value: "ONLINE",
          color: "#10b981",
          icon: CheckCircle,
          description: "Device is online",
        },
        offline: {
          value: "OFFLINE",
          color: "#ef4444",
          icon: XCircle,
          description: "Device is offline",
        },
        active: {
          value: "ACTIVE",
          color: "#10b981",
          icon: CheckCircle,
          description: "Device is active",
        },
        inactive: {
          value: "INACTIVE",
          color: "#6b7280",
          icon: XCircle,
          description: "Device is inactive",
        },
        recording: {
          value: "RECORDING",
          color: "#ef4444",
          icon: AlertCircle,
          description: "Device is recording",
        },
        idle: {
          value: "IDLE",
          color: "#f59e0b",
          icon: Clock,
          description: "Device is idle",
        },
        error: {
          value: "ERROR",
          color: "#ef4444",
          icon: XCircle,
          description: "Device has an error",
        },
        calibrating: {
          value: "CALIBRATING",
          color: "#f59e0b",
          icon: Clock,
          description: "Device is calibrating",
        },
      };

      return (
        statusMap[normalizedStatus] || {
          value: status.toUpperCase(),
          color: color,
          icon: AlertCircle,
          description: `Device status: ${status}`,
        }
      );
    }

    return {
      value: "UNKNOWN",
      color: "#6b7280",
      icon: AlertCircle,
      description: "Status unknown",
    };
  };

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;

  return (
    <div
      className={`flex flex-col items-center justify-center h-full ${className}`}
    >
      <div className="text-center space-y-6">
        {/* Large Status Icon */}
        <div className="relative">
          <div
            className="w-32 h-32 rounded-full flex items-center justify-center shadow-lg"
            style={{
              backgroundColor: `${statusInfo.color}20`,
              border: `4px solid ${statusInfo.color}`,
            }}
          >
            <StatusIcon
              className="w-16 h-16"
              style={{ color: statusInfo.color }}
            />
          </div>

          {/* Pulse animation for active status */}
          {(statusInfo.value === "ON" ||
            statusInfo.value === "ACTIVE" ||
            statusInfo.value === "RECORDING") && (
            <div
              className="absolute inset-0 w-32 h-32 rounded-full animate-ping opacity-20"
              style={{ backgroundColor: statusInfo.color }}
            />
          )}
        </div>

        {/* Status Text */}
        <div className="space-y-2">
          <div
            className="text-4xl font-bold"
            style={{ color: statusInfo.color }}
          >
            {statusInfo.value}
          </div>
          <div className="text-sm text-muted-foreground">{title}</div>
          <div className="text-xs text-muted-foreground max-w-xs">
            {statusInfo.description}
          </div>
        </div>

        {/* Status Badge */}
        <Badge
          variant="outline"
          className="text-sm"
          style={{
            borderColor: statusInfo.color,
            color: statusInfo.color,
            backgroundColor: `${statusInfo.color}10`,
          }}
        >
          {statusInfo.value}
        </Badge>
      </div>
    </div>
  );
}
