"use client";

import React from "react";

interface CircularProgressProps {
  value: number;
  max: number;
  unit?: string;
  title?: string;
  color?: string;
  className?: string;
}

export default function CircularProgress({
  value,
  max,
  unit = "",
  title = "Progress",
  color = "#3b82f6",
  className = "",
}: CircularProgressProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  const circumference = 2 * Math.PI * 45; // radius = 45
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const getStatusColor = () => {
    if (percentage <= 30) return "#10b981"; // Green
    if (percentage <= 70) return "#f59e0b"; // Yellow
    return "#ef4444"; // Red
  };

  const statusColor = color === "#3b82f6" ? getStatusColor() : color;

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div className="relative w-32 h-32">
        <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 100 100">
          {/* Background circle */}
          <circle
            cx="50"
            cy="50"
            r="45"
            stroke="#e5e7eb"
            strokeWidth="8"
            fill="none"
          />
          {/* Progress circle */}
          <circle
            cx="50"
            cy="50"
            r="45"
            stroke={statusColor}
            strokeWidth="8"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-500 ease-in-out"
          />
        </svg>

        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-2xl font-bold" style={{ color: statusColor }}>
            {value.toFixed(1)}
            <span className="text-sm ml-1">{unit}</span>
          </div>
          <div className="text-xs text-muted-foreground">
            {percentage.toFixed(0)}%
          </div>
        </div>
      </div>

      <div className="text-center mt-2">
        <div className="text-sm font-medium">{title}</div>
        <div className="text-xs text-muted-foreground">
          Max: {max}
          {unit}
        </div>
      </div>
    </div>
  );
}
