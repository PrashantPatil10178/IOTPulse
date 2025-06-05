"use client";

import { useState, useCallback, useEffect } from "react";
import { deviceApi, type Device } from "@/lib/api";
import { useSocket } from "@/context/SocketContext";
import { toast } from "sonner";

export function useAnalyticsData() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(true);
  const { forceDataSync } = useSocket();

  const fetchDevices = useCallback(async () => {
    try {
      setLoadingDevices(true);
      console.log("🔍 Fetching devices from API...");

      const response = await deviceApi.getAll({
        limit: 100,
      });

      if (response) {
        setDevices(response.devices || []);
        console.log(
          `✅ Fetched ${response.devices?.length || 0} devices from API`
        );
        toast.success(`Loaded ${response.devices?.length || 0} devices`);
      } else {
        throw new Error("Failed to fetch devices");
      }
    } catch (error: any) {
      console.error("❌ Failed to fetch devices:", error);
      toast.error(`Failed to load devices: ${error.message}`);
      setDevices([]);
    } finally {
      setLoadingDevices(false);
    }
  }, []);

  const handleSyncAllDevices = useCallback(async () => {
    toast.info("Syncing all devices...");

    try {
      const deviceIds = devices.map((d) => d.id);
      const syncPromises = deviceIds.map((deviceId) => forceDataSync(deviceId));
      const results = await Promise.allSettled(syncPromises);

      const successful = results.filter(
        (result) => result.status === "fulfilled"
      ).length;
      const failed = results.length - successful;

      if (successful > 0) {
        toast.success(`Successfully synced ${successful} devices`);
      }
      if (failed > 0) {
        toast.error(`Failed to sync ${failed} devices`);
      }

      await fetchDevices();
    } catch (error) {
      toast.error("Failed to sync devices");
      console.error("Sync error:", error);
    }
  }, [devices, forceDataSync, fetchDevices]);

  const handleExportData = useCallback(async () => {
    try {
      toast.info("Preparing analytics data for export...");

      const exportData = {
        timestamp: new Date().toISOString(),
        devices: devices.map((device) => ({
          id: device.id,
          name: device.name,
          type: device.type,
          status: device.status,
          batteryLevel: device.batteryLevel,
          lastSeen: device.lastSeen,
        })),
        statistics: {
          totalDevices: devices.length,
          onlineDevices: devices.filter((d) => d.status === "ONLINE").length,
        },
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: "application/json",
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `iot-analytics-${
        new Date().toISOString().split("T")[0]
      }.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Analytics data exported successfully");
    } catch (error) {
      console.error("Export failed:", error);
      toast.error("Failed to export analytics data");
    }
  }, [devices]);

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  return {
    devices,
    loadingDevices,
    fetchDevices,
    handleSyncAllDevices,
    handleExportData,
  };
}
