import {
  Thermometer,
  Droplets,
  Activity,
  Lightbulb,
  Plug,
  Camera,
  Zap,
  Droplet,
  Wind,
  Settings,
  Database,
} from "lucide-react";

export function getDeviceIcon(deviceType: string) {
  const iconMap = {
    TEMPERATURE_SENSOR: Thermometer,
    HUMIDITY_SENSOR: Droplets,
    MOTION_DETECTOR: Activity,
    SMART_LIGHT: Lightbulb,
    SMART_PLUG: Plug,
    CAMERA: Camera,
    ENERGY_METER: Zap,
    WATER_METER: Droplet,
    AIR_QUALITY_SENSOR: Wind,
    OTHER: Settings,
    all: Database,
  };

  return iconMap[deviceType as keyof typeof iconMap] || Settings;
}

export function formatDeviceType(deviceType: string): string {
  return deviceType
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

export function getDeviceColor(deviceType: string): string {
  const colorMap = {
    TEMPERATURE_SENSOR: "#FF6B6B", // Warm red
    HUMIDITY_SENSOR: "#4ECDC4", // Teal
    MOTION_DETECTOR: "#FFE66D", // Yellow
    SMART_LIGHT: "#FFD93D", // Golden yellow
    SMART_PLUG: "#6BCF7F", // Green
    CAMERA: "#4D96FF", // Blue
    ENERGY_METER: "#FF9F43", // Orange
    WATER_METER: "#54A0FF", // Light blue
    AIR_QUALITY_SENSOR: "#5F27CD", // Purple
    OTHER: "#95A5A6", // Gray
  };

  return colorMap[deviceType as keyof typeof colorMap] || "#95A5A6";
}

export function getDeviceGradient(deviceType: string): string[] {
  const gradientMap = {
    TEMPERATURE_SENSOR: ["#FF6B6B", "#FF8E8E", "#FFB1B1", "#FFD4D4"],
    HUMIDITY_SENSOR: ["#4ECDC4", "#6DD5CD", "#8CDDD6", "#ABE5DF"],
    MOTION_DETECTOR: ["#FFE66D", "#FFEB85", "#FFF09D", "#FFF5B5"],
    SMART_LIGHT: ["#FFD93D", "#FFE066", "#FFE78F", "#FFEEB8"],
    SMART_PLUG: ["#6BCF7F", "#85D795", "#9FDFAB", "#B9E7C1"],
    CAMERA: ["#4D96FF", "#70A8FF", "#93BAFF", "#B6CCFF"],
    ENERGY_METER: ["#FF9F43", "#FFB366", "#FFC789", "#FFDBAC"],
    WATER_METER: ["#54A0FF", "#77B3FF", "#9AC6FF", "#BDD9FF"],
    AIR_QUALITY_SENSOR: ["#5F27CD", "#7B4FD3", "#9777D9", "#B39FDF"],
    OTHER: ["#95A5A6", "#A8B3B5", "#BBC1C4", "#CECFD3"],
  };

  return (
    gradientMap[deviceType as keyof typeof gradientMap] || [
      "#95A5A6",
      "#A8B3B5",
      "#BBC1C4",
      "#CECFD3",
    ]
  );
}

export function getChartTypeForDevice(
  deviceType: string
): "line" | "area" | "bar" {
  const chartTypeMap = {
    TEMPERATURE_SENSOR: "area" as const,
    HUMIDITY_SENSOR: "line" as const,
    MOTION_DETECTOR: "bar" as const,
    SMART_LIGHT: "bar" as const,
    SMART_PLUG: "area" as const,
    CAMERA: "bar" as const,
    ENERGY_METER: "area" as const,
    WATER_METER: "line" as const,
    AIR_QUALITY_SENSOR: "area" as const,
    OTHER: "line" as const,
  };

  return chartTypeMap[deviceType as keyof typeof chartTypeMap] || "line";
}
