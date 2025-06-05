"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Activity, MapPin, Clock, Zap, Globe, Wifi } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  useDeviceSubscription,
  useDeviceUpdates,
} from "@/context/SocketContext";
import type { Device } from "@/types";
import { DeviceStatus } from "@/types";

interface RealtimeDeviceCardProps {
  device: Device;
  onUpdate?: (device: Device, updateData: any) => void;
}

export function RealtimeDeviceCard({
  device,
  onUpdate,
}: RealtimeDeviceCardProps) {
  const { isSubscribed, isConnected } = useDeviceSubscription(device.id);
  const { deviceUpdates, sensorReadings, latestUpdate, latestReading } =
    useDeviceUpdates(device.id);
  const [localDevice, setLocalDevice] = useState(device);
  const [lastUpdateTime, setLastUpdateTime] = useState<string | null>(null);

  // Update local device state when real-time updates arrive
  useEffect(() => {
    if (latestUpdate && latestUpdate.deviceId === device.id) {
      console.log(
        `🔄 Updating device ${device.id} with real-time data:`,
        latestUpdate
      );

      const updatedDevice = {
        ...localDevice,
        status: latestUpdate.status || localDevice.status,
        lastSeen: latestUpdate.lastSeen || latestUpdate.timestamp,
        currentLocation:
          latestUpdate.currentLocation || localDevice.currentLocation,
        currentLatitude:
          latestUpdate.currentLatitude ?? localDevice.currentLatitude,
        currentLongitude:
          latestUpdate.currentLongitude ?? localDevice.currentLongitude,
        ipAddress: latestUpdate.ipAddress || localDevice.ipAddress,
        firmware: latestUpdate.firmware || localDevice.firmware,
        locationUpdatedAt:
          latestUpdate.locationUpdatedAt || localDevice.locationUpdatedAt,
      };

      setLocalDevice(updatedDevice);
      setLastUpdateTime(latestUpdate.timestamp);

      // Notify parent component
      onUpdate?.(updatedDevice, latestUpdate);
    }
  }, [latestUpdate, device.id, localDevice, onUpdate]);

  // Log sensor readings
  useEffect(() => {
    if (latestReading && latestReading.deviceId === device.id) {
      console.log(
        `📡 New sensor reading for device ${device.id}:`,
        latestReading
      );
    }
  }, [latestReading, device.id]);

  const getStatusColor = (status: DeviceStatus) => {
    switch (status) {
      case DeviceStatus.ONLINE:
        return "bg-emerald-500";
      case DeviceStatus.OFFLINE:
        return "bg-red-500";
      case DeviceStatus.MAINTENANCE:
        return "bg-yellow-500";
      case DeviceStatus.ERROR:
        return "bg-orange-500";
      default:
        return "bg-gray-500";
    }
  };

  // Get the most relevant location
  const getDisplayLocation = () => {
    return (
      localDevice.currentLocation ||
      localDevice.location ||
      localDevice.lastKnownLocation ||
      "Unknown Location"
    );
  };

  // Get coordinates for display
  const getDisplayCoordinates = () => {
    const lat =
      localDevice.currentLatitude ||
      localDevice.latitude ||
      localDevice.lastKnownLatitude;
    const lng =
      localDevice.currentLongitude ||
      localDevice.longitude ||
      localDevice.lastKnownLongitude;
    return lat && lng ? { lat, lng } : null;
  };

  const coordinates = getDisplayCoordinates();

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="relative overflow-hidden">
        {/* Real-time indicator */}
        <div className="absolute top-2 right-2 flex items-center gap-1">
          {isConnected && isSubscribed && (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-xs text-muted-foreground">Live</span>
            </div>
          )}
        </div>

        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-sm font-medium">
                {localDevice.name}
              </CardTitle>
              <p className="text-xs text-muted-foreground">{localDevice.id}</p>
            </div>
            <Badge
              variant="outline"
              className={`text-xs ${getStatusColor(
                localDevice.status
              )} text-white border-0`}
            >
              {localDevice.status}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {/* Location */}
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">
              {getDisplayLocation()}
            </span>
          </div>

          {/* Coordinates */}
          {coordinates && (
            <div className="flex items-center gap-2 text-sm">
              <Globe className="w-4 h-4 text-blue-500" />
              <span className="text-blue-500 font-mono text-xs">
                {coordinates.lat.toFixed(4)}, {coordinates.lng.toFixed(4)}
              </span>
            </div>
          )}

          {/* IP Address */}
          {localDevice.ipAddress && (
            <div className="flex items-center gap-2 text-sm">
              <Wifi className="w-4 h-4 text-purple-500" />
              <span className="text-purple-500 font-mono text-xs">
                {localDevice.ipAddress}
              </span>
            </div>
          )}

          {/* Firmware */}
          {localDevice.firmware && (
            <div className="flex items-center gap-2 text-sm">
              <Activity className="w-4 h-4 text-indigo-500" />
              <span className="text-indigo-500 text-xs">
                v{localDevice.firmware}
              </span>
            </div>
          )}

          {/* Last Seen */}
          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">
              {lastUpdateTime
                ? `Updated ${new Date(lastUpdateTime).toLocaleTimeString()}`
                : localDevice.lastSeen
                ? `Last seen ${new Date(
                    localDevice.lastSeen
                  ).toLocaleTimeString()}`
                : "Never seen"}
            </span>
          </div>

          {/* Recent Updates Count */}
          {deviceUpdates.length > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <Activity className="w-4 h-4 text-blue-500" />
              <span className="text-blue-500">
                {deviceUpdates.length} recent updates
              </span>
            </div>
          )}

          {/* Recent Sensor Readings Count */}
          {sensorReadings.length > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <Zap className="w-4 h-4 text-purple-500" />
              <span className="text-purple-500">
                {sensorReadings.length} sensor readings
              </span>
            </div>
          )}

          {/* Latest Sensor Reading */}
          {latestReading && latestReading.deviceId === device.id && (
            <div className="mt-2 p-2 bg-muted rounded-md">
              <div className="text-xs text-muted-foreground">
                Latest Reading:
              </div>
              <div className="text-sm font-medium">
                {latestReading.metric}: {latestReading.value}
                {latestReading.unit && latestReading.unit}
              </div>
            </div>
          )}

          {/* Location Update Time */}
          {localDevice.locationUpdatedAt && (
            <div className="text-xs text-muted-foreground border-t pt-2">
              Location updated:{" "}
              {new Date(localDevice.locationUpdatedAt).toLocaleString()}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
