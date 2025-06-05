"use client";

import React, { useRef } from "react";
import { motion } from "framer-motion";
import {
  MapPin,
  Wifi,
  WifiOff,
  Settings,
  AlertTriangle,
  Cpu,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Device } from "@/types";

interface MapViewProps {
  devices: Device[];
}

// Enhanced coordinate system for Indian cities and regions
const LOCATION_COORDINATES: Record<string, { lat: number; lng: number }> = {
  // Major cities
  "Mumbai Central": { lat: 19.0176, lng: 72.8562 },
  "Delhi North": { lat: 28.7041, lng: 77.1025 },
  "Bangalore IT Park": { lat: 12.9716, lng: 77.5946 },
  "Chennai Marina": { lat: 13.0827, lng: 80.2707 },
  Pune: { lat: 18.5204, lng: 73.8567 },
  "Pune, India": { lat: 18.5204, lng: 73.8567 },
  Hyderabad: { lat: 17.385, lng: 78.4867 },
  Kolkata: { lat: 22.5726, lng: 88.3639 },
  Ahmedabad: { lat: 23.0225, lng: 72.5714 },
  Jaipur: { lat: 26.9124, lng: 75.7873 },
  Surat: { lat: 21.1702, lng: 72.8311 },

  "Living Room": { lat: 18.5204, lng: 73.8567 },
  Kitchen: { lat: 18.5214, lng: 73.8577 },
  Bedroom: { lat: 18.5194, lng: 73.8557 },
  Office: { lat: 18.5224, lng: 73.8587 },
};

const DeviceMarker: React.FC<{
  device: Device;
  position: { x: number; y: number };
}> = ({ device, position }) => {
  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case "ONLINE":
        return "bg-green-500";
      case "OFFLINE":
        return "bg-red-500";
      case "MAINTENANCE":
        return "bg-yellow-500";
      case "ERROR":
        return "bg-orange-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toUpperCase()) {
      case "ONLINE":
        return <Wifi className="w-3 h-3" />;
      case "OFFLINE":
        return <WifiOff className="w-3 h-3" />;
      case "MAINTENANCE":
        return <Settings className="w-3 h-3" />;
      case "ERROR":
        return <AlertTriangle className="w-3 h-3" />;
      default:
        return <Cpu className="w-3 h-3" />;
    }
  };

  const getDeviceTypeIcon = (type: string) => {
    switch (type) {
      case "TEMPERATURE_SENSOR":
        return "🌡️";
      case "HUMIDITY_SENSOR":
        return "💧";
      case "SMART_LIGHT":
        return "💡";
      case "SMART_PLUG":
        return "🔌";
      case "CAMERA":
        return "📷";
      case "WATER_METER":
        return "🚰";
      case "ENERGY_METER":
        return "⚡";
      case "AIR_QUALITY_SENSOR":
        return "🌬️";
      case "MOTION_DETECTOR":
        return "👁️";
      default:
        return "📡";
    }
  };

  const formatLastSeen = (lastSeen?: string) => {
    if (!lastSeen) return "Never";
    const date = new Date(lastSeen);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return `${Math.floor(diffMins / 1440)}d ago`;
  };

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: Math.random() * 0.5 }}
      className="absolute transform -translate-x-1/2 -translate-y-1/2 group cursor-pointer z-10"
      style={{ left: position.x, top: position.y }}
    >
      <div
        className={`w-5 h-5 rounded-full ${getStatusColor(device.status)} 
        border-2 border-white shadow-lg flex items-center justify-center text-white
        group-hover:scale-125 transition-all duration-200 relative`}
      >
        {getStatusIcon(device.status)}

        {/* Device type indicator */}
        <div className="absolute -top-1 -right-1 text-xs">
          {getDeviceTypeIcon(device.type)}
        </div>
      </div>

      {/* Enhanced Tooltip */}
      <div
        className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-3 
        opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none z-20"
      >
        <div
          className="bg-black/90 backdrop-blur-sm text-white text-xs rounded-lg px-3 py-2 
          whitespace-nowrap shadow-xl border border-white/20"
        >
          <div className="font-semibold text-sm mb-1">{device.name}</div>
          <div className="text-gray-300 mb-1">
            {device.location || "Unknown Location"}
          </div>
          <div className="flex items-center gap-2 mb-1">
            <Badge
              variant={device.status === "ONLINE" ? "default" : "destructive"}
              className="text-xs py-0 px-2"
            >
              {device.status}
            </Badge>
            <span className="text-gray-400 text-xs">
              {device.type.replace("_", " ")}
            </span>
          </div>
          {device.firmware && (
            <div className="text-gray-400 text-xs">
              Firmware: {device.firmware}
            </div>
          )}
          <div className="text-gray-400 text-xs">
            Last seen: {formatLastSeen(device.lastSeen)}
          </div>
        </div>
        {/* Tooltip arrow */}
        <div
          className="absolute top-full left-1/2 transform -translate-x-1/2 
          border-4 border-transparent border-t-black/90"
        ></div>
      </div>

      {/* Pulse animation for online devices */}
      {device.status === "ONLINE" && (
        <div
          className={`absolute inset-0 rounded-full ${getStatusColor(
            device.status
          )} 
          animate-ping opacity-75`}
        />
      )}
    </motion.div>
  );
};

const MapView: React.FC<MapViewProps> = ({ devices }) => {
  const mapRef = useRef<HTMLDivElement>(null);

  // Convert geographical coordinates to screen coordinates
  const getScreenPosition = (device: Device) => {
    if (!mapRef.current) return { x: 0, y: 0 };

    const rect = mapRef.current.getBoundingClientRect();

    // Use actual coordinates if available, otherwise fallback to location name
    let coords;
    if (device.latitude && device.longitude) {
      coords = { lat: device.latitude, lng: device.longitude };
    } else if (device.currentLatitude && device.currentLongitude) {
      coords = { lat: device.currentLatitude, lng: device.currentLongitude };
    } else {
      coords = LOCATION_COORDINATES[device.location || ""] || {
        lat: 18.5204,
        lng: 73.8567,
      };
    }

    // Simple projection for demonstration (India bounds approximately)
    const minLat = 8,
      maxLat = 37;
    const minLng = 68,
      maxLng = 97;

    const x = ((coords.lng - minLng) / (maxLng - minLng)) * rect.width;
    const y = ((maxLat - coords.lat) / (maxLat - minLat)) * rect.height;

    // Add some randomness for devices at the same location
    const jitter = 10;
    const jitterX = (Math.random() - 0.5) * jitter;
    const jitterY = (Math.random() - 0.5) * jitter;

    return {
      x: Math.max(20, Math.min(rect.width - 20, x + jitterX)),
      y: Math.max(20, Math.min(rect.height - 20, y + jitterY)),
    };
  };

  const deviceStats = {
    online: devices.filter((d) => d.status === "ONLINE").length,
    offline: devices.filter((d) => d.status === "OFFLINE").length,
    maintenance: devices.filter((d) => d.status === "MAINTENANCE").length,
    error: devices.filter((d) => d.status === "ERROR").length,
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Device Locations
          </div>
          <div className="text-sm font-normal text-muted-foreground">
            {devices.length} devices mapped
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div
          className="relative h-96 bg-gradient-to-br from-blue-50 to-indigo-100 
          dark:from-slate-800 dark:to-slate-900 overflow-hidden"
        >
          {/* Enhanced India Map Background */}
          <div
            ref={mapRef}
            className="absolute inset-0 bg-gradient-to-br from-green-50 to-blue-100 
              dark:from-slate-700 dark:to-slate-800 "
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 300'%3E%3Cpath d='M60 40 Q200 20 340 40 Q360 80 350 120 Q340 160 330 200 Q310 240 280 260 Q200 280 120 270 Q80 250 60 220 Q40 180 45 140 Q50 100 60 40 Z' fill='none' stroke='%23e2e8f0' stroke-width='2' stroke-dasharray='5,5'/%3E%3Ccircle cx='100' cy='80' r='2' fill='%23cbd5e1'/%3E%3Ccircle cx='150' cy='90' r='2' fill='%23cbd5e1'/%3E%3Ccircle cx='200' cy='100' r='2' fill='%23cbd5e1'/%3E%3Ccircle cx='250' cy='110' r='2' fill='%23cbd5e1'/%3E%3Ccircle cx='300' cy='120' r='2' fill='%23cbd5e1'/%3E%3C/svg%3E")`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            {/* Grid overlay */}
            <div className="absolute inset-0 opacity-10">
              <div
                className="w-full h-full"
                style={{
                  backgroundImage: `
                    linear-gradient(rgba(59, 130, 246, 0.3) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(59, 130, 246, 0.3) 1px, transparent 1px)
                  `,
                  backgroundSize: "30px 30px",
                }}
              />
            </div>

            {/* Device markers */}
            {devices.map((device) => (
              <DeviceMarker
                key={device.id}
                device={device}
                position={getScreenPosition(device)}
              />
            ))}

            {/* Connection lines for devices in same location */}
            <svg className="absolute inset-0 pointer-events-none">
              {devices.map((device, index) => {
                if (index === 0) return null;
                const pos1 = getScreenPosition(devices[index - 1]);
                const pos2 = getScreenPosition(device);
                const distance = Math.sqrt(
                  Math.pow(pos2.x - pos1.x, 2) + Math.pow(pos2.y - pos1.y, 2)
                );

                if (distance < 50) {
                  return (
                    <line
                      key={`connection-${device.id}`}
                      x1={pos1.x}
                      y1={pos1.y}
                      x2={pos2.x}
                      y2={pos2.y}
                      stroke="rgba(59, 130, 246, 0.2)"
                      strokeWidth="1"
                      strokeDasharray="2,2"
                    />
                  );
                }
                return null;
              })}
            </svg>
          </div>

          {/* Enhanced Legend */}
          <div
            className="absolute bottom-4 left-4 bg-white/95 dark:bg-slate-800/95 
            backdrop-blur-sm rounded-lg p-4 shadow-xl border border-white/20"
          >
            <div className="text-sm font-semibold mb-3">Device Status</div>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span>Online</span>
                </div>
                <span className="font-medium">{deviceStats.online}</span>
              </div>
              <div className="flex items-center justify-between gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span>Offline</span>
                </div>
                <span className="font-medium">{deviceStats.offline}</span>
              </div>
              {deviceStats.maintenance > 0 && (
                <div className="flex items-center justify-between gap-4 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <span>Maintenance</span>
                  </div>
                  <span className="font-medium">{deviceStats.maintenance}</span>
                </div>
              )}
              {deviceStats.error > 0 && (
                <div className="flex items-center justify-between gap-4 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                    <span>Error</span>
                  </div>
                  <span className="font-medium">{deviceStats.error}</span>
                </div>
              )}
            </div>
          </div>

          {/* Real-time indicator */}
          <div
            className="absolute top-4 right-4 bg-white/95 dark:bg-slate-800/95 
            backdrop-blur-sm rounded-lg px-3 py-2 shadow-xl border border-white/20"
          >
            <div className="flex items-center gap-2 text-xs">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="font-medium">Live Updates</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MapView;
