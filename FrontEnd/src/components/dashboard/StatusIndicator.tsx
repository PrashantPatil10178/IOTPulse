"use client";

import React from "react";
import { CheckCircle, XCircle, AlertCircle, Clock, Power } from "lucide-react";

interface StatusIndicatorProps {
  status: any;
  deviceType: string;
  color?: string;
  title?: string;
  className?: string;
}

export default function StatusIndicator({
  status,
  deviceType,
  color = "#3b82f6",
  title = "Status",
  className = "",
}: StatusIndicatorProps) {
  const getStatusInfo = () => {
    if (typeof status === "boolean") {
      return {
        value: status ? "ACTIVE" : "INACTIVE",
        color: status ? "#10b981" : "#6b7280",
        icon: status ? CheckCircle : XCircle,
        bgColor: status ? "#10b98120" : "#6b728020",
      };
    }

    if (typeof status === "string") {
      const normalizedStatus = status.toLowerCase();

      const statusMap: Record<string, any> = {
        on: {
          value: "ON",
          color: "#10b981",
          icon: Power,
          bgColor: "#10b98120",
        },
        off: {
          value: "OFF",
          color: "#6b7280",
          icon: Power,
          bgColor: "#6b728020",
        },
        online: {
          value: "ONLINE",
          color: "#10b981",
          icon: CheckCircle,
          bgColor: "#10b98120",
        },
        offline: {
          value: "OFFLINE",
          color: "#ef4444",
          icon: XCircle,
          bgColor: "#ef444420",
        },
        active: {
          value: "ACTIVE",
          color: "#10b981",
          icon: CheckCircle,
          bgColor: "#10b98120",
        },
        inactive: {
          value: "INACTIVE",
          color: "#6b7280",
          icon: XCircle,
          bgColor: "#6b728020",
        },
        recording: {
          value: "RECORDING",
          color: "#ef4444",
          icon: AlertCircle,
          bgColor: "#ef444420",
        },
        idle: {
          value: "IDLE",
          color: "#f59e0b",
          icon: Clock,
          bgColor: "#f59e0b20",
        },
      };

      return (
        statusMap[normalizedStatus] || {
          value: status.toUpperCase(),
          color: color,
          icon: AlertCircle,
          bgColor: `${color}20`,
        }
      );
    }

    return {
      value: "UNKNOWN",
      color: "#6b7280",
      icon: AlertCircle,
      bgColor: "#6b728020",
    };
  };

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div
        className="w-32 h-32 rounded-full flex items-center justify-center mb-4 relative"
        style={{ backgroundColor: statusInfo.bgColor }}
      >
        <StatusIcon className="w-16 h-16" style={{ color: statusInfo.color }} />

        {/* Pulse animation for active status */}
        {(statusInfo.value === "ON" || statusInfo.value === "ACTIVE") && (
          <div
            className="absolute inset-0 rounded-full animate-ping opacity-20"
            style={{ backgroundColor: statusInfo.color }}
          />
        )}
      </div>

      <div className="text-center">
        <div
          className="text-2xl font-bold mb-1"
          style={{ color: statusInfo.color }}
        >
          {statusInfo.value}
        </div>
        <div className="text-sm text-muted-foreground">{title}</div>
      </div>
    </div>
  );
}
