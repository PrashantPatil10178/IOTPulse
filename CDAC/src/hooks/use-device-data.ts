"use client";

import { useState, useEffect, useCallback } from "react";
import { deviceApi } from "@/lib/api";
import { toast } from "sonner";

export function useDeviceData(username?: string) {
  const [devices, setDevices] = useState<any[]>([]);
  const [deviceData, setDeviceData] = useState<Record<string, any[]>>({});
  const [isLoading, setIsLoading] = useState(true);

  const fetchDevices = useCallback(async () => {
    if (!username) return;

    try {
      setIsLoading(true);
      const response = await deviceApi.getAll({ limit: 100 });

      if (response?.devices) {
        setDevices(response.devices);
        toast.success(`Loaded ${response.devices.length} devices`);
      }
    } catch (error: any) {
      console.error("Failed to fetch devices:", error);
      toast.error("Failed to load devices");
    } finally {
      setIsLoading(false);
    }
  }, [username]);

  const refreshData = useCallback(async () => {
    await fetchDevices();
  }, [fetchDevices]);

  const exportData = useCallback(() => {
    const exportData = {
      timestamp: new Date().toISOString(),
      devices,
      deviceData,
      totalDevices: devices.length,
      totalDataPoints: Object.values(deviceData).reduce(
        (sum, data) => sum + data.length,
        0
      ),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `iot-analytics-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success("Analytics data exported successfully");
  }, [devices, deviceData]);

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  return {
    devices,
    deviceData,
    isLoading,
    refreshData,
    exportData,
  };
}
