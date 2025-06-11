"use client";

import React from "react";
import { TrendingUp, TrendingDown } from "lucide-react";

interface LiveMetricCardProps {
  value: any;
  unit?: string;
  title?: string;
  color?: string;
  trend?: "up" | "down" | "neutral";
  className?: string;
}

export default function LiveMetricCard({
  value,
  unit = "",
  title = "Metric",
  color = "#3b82f6",
  trend = "neutral",
  className = "",
}: LiveMetricCardProps) {
  const formatValue = (val: any) => {
    if (typeof val === "number") {
      return val.toFixed(2);
    }
    return val?.toString() || "N/A";
  };

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div
        className="w-full max-w-xs p-6 rounded-xl text-center"
        style={{
          backgroundColor: `${color}10`,
          border: `2px solid ${color}30`,
        }}
      >
        <div className="text-sm text-muted-foreground font-medium mb-2">
          {title}
        </div>

        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="text-4xl font-bold" style={{ color: color }}>
            {formatValue(value)}
            {unit && (
              <span className="text-lg text-muted-foreground ml-1">{unit}</span>
            )}
          </div>

          {trend !== "neutral" && (
            <div className="flex items-center">
              {trend === "up" ? (
                <TrendingUp className="w-6 h-6 text-green-500" />
              ) : (
                <TrendingDown className="w-6 h-6 text-red-500" />
              )}
            </div>
          )}
        </div>

        <div className="text-xs text-muted-foreground">Live Data</div>
      </div>
    </div>
  );
}
