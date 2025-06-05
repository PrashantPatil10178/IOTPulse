"use client";

import { useCallback } from "react";

import { useMemo } from "react";

export function useVisualizationConfig() {
  const visualizationConfigs = useMemo(
    () => ({
      TEMPERATURE_SENSOR: {
        primaryMetric: "temperature",
        secondaryMetrics: ["humidity", "pressure"],
        chartType: "line",
        unit: "°C",
        icon: "thermometer",
        color: "#ff6b6b",
        category: "Environment",
      },
      HUMIDITY_SENSOR: {
        primaryMetric: "humidity",
        secondaryMetrics: ["temperature", "dewPoint"],
        chartType: "gauge",
        unit: "%",
        icon: "droplet",
        color: "#4ecdc4",
        category: "Environment",
      },
      MOTION_DETECTOR: {
        primaryMetric: "motion",
        secondaryMetrics: ["confidence", "duration"],
        chartType: "timeline",
        unit: "boolean",
        icon: "activity",
        color: "#ffe66d",
        category: "Security",
      },
      SMART_LIGHT: {
        primaryMetric: "status",
        secondaryMetrics: ["brightness", "powerConsumption"],
        chartType: "status",
        unit: "on/off",
        icon: "lightbulb",
        color: "#ffd93d",
        category: "Smart Home",
      },
      SMART_PLUG: {
        primaryMetric: "powerConsumption",
        secondaryMetrics: ["voltage", "current", "totalEnergyUsed"],
        chartType: "bar",
        unit: "W",
        icon: "plug",
        color: "#6bcf7f",
        category: "Smart Home",
      },
      CAMERA: {
        primaryMetric: "status",
        secondaryMetrics: ["motionDetected"],
        chartType: "status",
        unit: "status",
        icon: "camera",
        color: "#4d96ff",
        category: "Security",
      },
      ENERGY_METER: {
        primaryMetric: "powerUsage",
        secondaryMetrics: ["totalEnergy", "voltage", "current"],
        chartType: "multiline",
        unit: "W",
        icon: "zap",
        color: "#ff9f43",
        category: "Energy",
      },
      WATER_METER: {
        primaryMetric: "flowRate",
        secondaryMetrics: ["totalVolume", "pressure"],
        chartType: "area",
        unit: "L/min",
        icon: "droplets",
        color: "#54a0ff",
        category: "Utilities",
      },
      AIR_QUALITY_SENSOR: {
        primaryMetric: "aqi",
        secondaryMetrics: ["pm25", "pm10", "co2"],
        chartType: "multibar",
        unit: "AQI",
        icon: "wind",
        color: "#5f27cd",
        category: "Environment",
      },
      OTHER: {
        primaryMetric: "primaryMetric.value",
        secondaryMetrics: ["secondaryMetrics"],
        chartType: "dynamic",
        unit: "dynamic",
        icon: "settings",
        color: "#95a5a6",
        category: "Generic",
      },
    }),
    []
  );

  const getConfigForDeviceType = useCallback(
    (deviceType: string) => {
      return (
        visualizationConfigs[deviceType as keyof typeof visualizationConfigs] ||
        visualizationConfigs.OTHER
      );
    },
    [visualizationConfigs]
  );

  return {
    visualizationConfigs,
    getConfigForDeviceType,
  };
}
