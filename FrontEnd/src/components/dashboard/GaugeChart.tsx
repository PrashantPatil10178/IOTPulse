"use client";

import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

interface GaugeChartProps {
  value: number;
  min: number;
  max: number;
  unit?: string;
  title?: string;
  thresholds?: Array<{
    value: number;
    color: string;
    label: string;
  }>;
  color?: string;
  className?: string;
}

export default function GaugeChart({
  value,
  min,
  max,
  unit = "",
  title = "Gauge",
  thresholds = [],
  color = "#3b82f6",
  className = "",
}: GaugeChartProps) {
  // Normalize value to 0-100 range for the gauge
  const normalizedValue = Math.max(
    0,
    Math.min(100, ((value - min) / (max - min)) * 100)
  );

  // Get current threshold color
  const getCurrentColor = () => {
    if (thresholds.length === 0) return color;

    const currentThreshold = thresholds
      .slice()
      .reverse()
      .find((threshold) => value >= threshold.value);

    return currentThreshold?.color || thresholds[0]?.color || color;
  };

  const getCurrentLabel = () => {
    if (thresholds.length === 0) return "";

    const currentThreshold = thresholds
      .slice()
      .reverse()
      .find((threshold) => value >= threshold.value);

    return currentThreshold?.label || "";
  };

  // Create data for the pie chart (gauge)
  const data = [
    { name: "value", value: normalizedValue, color: getCurrentColor() },
    { name: "empty", value: 100 - normalizedValue, color: "#f1f5f9" },
  ];

  // Create background segments for thresholds
  const createThresholdSegments = () => {
    if (thresholds.length === 0) return [];

    const segments = [];
    for (let i = 0; i < thresholds.length; i++) {
      const currentThreshold = thresholds[i];
      const nextThreshold = thresholds[i + 1];
      const startValue = i === 0 ? min : thresholds[i - 1].value;
      const endValue = nextThreshold ? nextThreshold.value : max;

      const startAngle = ((startValue - min) / (max - min)) * 180;
      const endAngle = ((endValue - min) / (max - min)) * 180;

      segments.push({
        startAngle: 180 - endAngle,
        endAngle: 180 - startAngle,
        color: currentThreshold.color + "20", // Add transparency
      });
    }

    return segments;
  };

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div className="relative w-full h-full max-w-sm max-h-sm">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            {/* Background threshold segments */}
            {createThresholdSegments().map((segment, index) => (
              <Pie
                key={`threshold-${index}`}
                data={[{ value: 100 }]}
                dataKey="value"
                cx="50%"
                cy="50%"
                startAngle={segment.startAngle}
                endAngle={segment.endAngle}
                innerRadius="60%"
                outerRadius="75%"
                fill={segment.color}
                stroke="none"
              />
            ))}

            {/* Main gauge */}
            <Pie
              data={data}
              dataKey="value"
              cx="50%"
              cy="50%"
              startAngle={180}
              endAngle={0}
              innerRadius="60%"
              outerRadius="80%"
              stroke="none"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        {/* Center value display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-center">
            <div
              className="text-3xl md:text-4xl font-bold"
              style={{ color: getCurrentColor() }}
            >
              {value.toFixed(1)}
              <span className="text-lg text-muted-foreground ml-1">{unit}</span>
            </div>
            {getCurrentLabel() && (
              <div
                className="text-sm font-medium mt-1"
                style={{ color: getCurrentColor() }}
              >
                {getCurrentLabel()}
              </div>
            )}
            <div className="text-xs text-muted-foreground mt-1">{title}</div>
          </div>
        </div>
      </div>

      {/* Threshold indicators */}
      {thresholds.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2 mt-4">
          {thresholds.map((threshold, index) => (
            <div key={index} className="flex items-center gap-1 text-xs">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: threshold.color }}
              />
              <span className="text-muted-foreground">
                {threshold.label} ({threshold.value}
                {unit})
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
