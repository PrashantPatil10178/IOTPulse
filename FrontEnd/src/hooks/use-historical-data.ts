"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { toast } from "sonner";

interface HistoricalDataPoint {
  deviceId: string;
  timestamp: string;
  data: {
    metrics?: {
      primary?: {
        name: string;
        unit: string;
        value: number;
      };
      secondary?: any[];
    };
    rawData?: any;
    template?: any;
    deviceType?: string;
    visualization?: any;
  };
  value?: any;
  unit?: string;
  status?: string;
  batteryLevel?: number;
  lastSeen?: string;
}

interface UseHistoricalDataReturn {
  historicalData: Record<string, HistoricalDataPoint[]>;
  isLoading: boolean;
  error: string | null;
  fetchHistoricalData: (
    deviceId: string,
    limit?: number,
    timeRange?: string
  ) => Promise<void>;
  clearHistoricalData: (deviceId?: string) => void;
  refreshHistoricalData: (deviceId: string) => Promise<void>;
  getLatestHistoricalPoint: (deviceId: string) => HistoricalDataPoint | null;
  mergeWithRealtimeData: (
    deviceId: string,
    realtimeData: any
  ) => HistoricalDataPoint[];
}

export function useHistoricalData(username: string): UseHistoricalDataReturn {
  const [historicalData, setHistoricalData] = useState<
    Record<string, HistoricalDataPoint[]>
  >({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadingDevices = useRef<Set<string>>(new Set());

  // Get API base URL
  const getApiUrl = () => {
    return import.meta.env.PROD
      ? "https://iot.webfuze.in/api"
      : "http://localhost:3001/api";
  };

  // Fetch historical data from database
  const fetchHistoricalData = useCallback(
    async (
      deviceId: string,
      limit: number = 100,
      timeRange: string = "24h"
    ) => {
      if (loadingDevices.current.has(deviceId)) {
        console.log(`⏳ Already loading data for device: ${deviceId}`);
        return;
      }

      try {
        loadingDevices.current.add(deviceId);
        setIsLoading(true);
        setError(null);

        console.log(`📊 Fetching historical data for device: ${deviceId}`);
        console.log(
          `📊 Parameters: limit=${limit}, timeRange=${timeRange}, username=${username}`
        );

        const token = localStorage.getItem("iot-dashboard-token");
        if (!token) {
          throw new Error("Authentication token not found");
        }

        // Calculate time range
        const now = new Date();
        const timeRangeMap: Record<string, number> = {
          "1h": 1 * 60 * 60 * 1000,
          "6h": 6 * 60 * 60 * 1000,
          "12h": 12 * 60 * 60 * 1000,
          "24h": 24 * 60 * 60 * 1000,
          "7d": 7 * 24 * 60 * 60 * 1000,
          "30d": 30 * 24 * 60 * 60 * 1000,
        };

        const timeRangeMs = timeRangeMap[timeRange] || timeRangeMap["24h"];
        const startTime = new Date(now.getTime() - timeRangeMs);

        const queryParams = new URLSearchParams({
          deviceId,
          username,
          limit: limit.toString(),
          startTime: startTime.toISOString(),
          endTime: now.toISOString(),
        });

        const response = await fetch(
          `${getApiUrl()}/devices/historical-data?${queryParams}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.message ||
              `HTTP ${response.status}: ${response.statusText}`
          );
        }

        const result = await response.json();
        console.log(
          `✅ Historical data fetched for ${deviceId}:`,
          result.data?.length || 0,
          "points"
        );

        if (result.success && result.data) {
          // Transform and sort the data
          interface RawMetrics {
            primary?: {
              name: string;
              unit: string;
              value: number;
            };
            secondary?: any[];
          }

          interface RawData {
            metrics?: RawMetrics;
            rawData?: any;
            template?: any;
            deviceType?: string;
            visualization?: any;
          }

          interface RawPoint {
            deviceId?: string;
            timestamp?: string;
            createdAt?: string;
            data?: RawData;
            sensorType?: string;
            unit?: string;
            value?: any;
            status?: string;
            batteryLevel?: number;
            lastSeen?: string;
            deviceType?: string;
          }

          const transformedData: HistoricalDataPoint[] = (
            result.data as RawPoint[]
          )
            .map(
              (point: RawPoint): HistoricalDataPoint => ({
                deviceId: point.deviceId || deviceId,
                timestamp:
                  point.timestamp ||
                  point.createdAt ||
                  new Date().toISOString(),
                data: {
                  metrics: {
                    primary: point.data?.metrics?.primary || {
                      name: point.sensorType || "Value",
                      unit: point.unit || "",
                      value: parseFloat(point.value) || 0,
                    },
                    secondary: point.data?.metrics?.secondary || [],
                  },
                  rawData: point.data?.rawData || point,
                  template: point.data?.template,
                  deviceType: point.deviceType,
                  visualization: point.data?.visualization,
                },
                value: point.value,
                unit: point.unit,
                status: point.status,
                batteryLevel: point.batteryLevel,
                lastSeen: point.lastSeen,
              })
            )
            .sort(
              (a: HistoricalDataPoint, b: HistoricalDataPoint) =>
                new Date(a.timestamp).getTime() -
                new Date(b.timestamp).getTime()
            );

          setHistoricalData((prev) => ({
            ...prev,
            [deviceId]: transformedData,
          }));

          console.log(
            `📈 Stored ${transformedData.length} historical points for device: ${deviceId}`
          );
        } else {
          console.warn(`⚠️ No historical data found for device: ${deviceId}`);
          setHistoricalData((prev) => ({
            ...prev,
            [deviceId]: [],
          }));
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Failed to fetch historical data";
        console.error(
          `❌ Error fetching historical data for ${deviceId}:`,
          err
        );
        setError(errorMessage);
        toast.error(`Failed to load historical data: ${errorMessage}`);

        // Set empty array to prevent infinite loading
        setHistoricalData((prev) => ({
          ...prev,
          [deviceId]: [],
        }));
      } finally {
        loadingDevices.current.delete(deviceId);
        setIsLoading(loadingDevices.current.size > 0);
      }
    },
    [username]
  );

  // Refresh historical data
  const refreshHistoricalData = useCallback(
    async (deviceId: string) => {
      console.log(`🔄 Refreshing historical data for device: ${deviceId}`);
      // Clear existing data first
      setHistoricalData((prev) => {
        const newData = { ...prev };
        delete newData[deviceId];
        return newData;
      });
      // Fetch fresh data
      await fetchHistoricalData(deviceId);
    },
    [fetchHistoricalData]
  );

  // Clear historical data
  const clearHistoricalData = useCallback((deviceId?: string) => {
    if (deviceId) {
      console.log(`🧹 Clearing historical data for device: ${deviceId}`);
      setHistoricalData((prev) => {
        const newData = { ...prev };
        delete newData[deviceId];
        return newData;
      });
    } else {
      console.log(`🧹 Clearing all historical data`);
      setHistoricalData({});
    }
    setError(null);
  }, []);

  // Get latest historical point for a device
  const getLatestHistoricalPoint = useCallback(
    (deviceId: string): HistoricalDataPoint | null => {
      const deviceData = historicalData[deviceId];
      if (!deviceData || deviceData.length === 0) return null;
      return deviceData[deviceData.length - 1];
    },
    [historicalData]
  );

  // Merge historical data with real-time data
  const mergeWithRealtimeData = useCallback(
    (deviceId: string, realtimeData: any): HistoricalDataPoint[] => {
      const historical = historicalData[deviceId] || [];

      if (!realtimeData) {
        return historical;
      }

      // Create real-time data point in historical format
      const realtimePoint: HistoricalDataPoint = {
        deviceId,
        timestamp: realtimeData.timestamp || new Date().toISOString(),
        data: {
          metrics: {
            primary: realtimeData.data?.metrics?.primary || {
              name: "Real-time Value",
              unit: realtimeData.unit || "",
              value: realtimeData.value || 0,
            },
            secondary: realtimeData.data?.metrics?.secondary || [],
          },
          rawData: realtimeData.data?.rawData || realtimeData,
          template: realtimeData.data?.template,
          deviceType: realtimeData.data?.deviceType,
          visualization: realtimeData.data?.visualization,
        },
        value: realtimeData.value,
        unit: realtimeData.unit,
        status: realtimeData.status,
        batteryLevel: realtimeData.batteryLevel,
        lastSeen: realtimeData.lastSeen,
      };

      // Check if this is a new data point (not already in historical data)
      const isNewPoint = !historical.some(
        (point) =>
          Math.abs(
            new Date(point.timestamp).getTime() -
              new Date(realtimePoint.timestamp).getTime()
          ) < 5000
      );

      if (isNewPoint) {
        const merged = [...historical, realtimePoint].sort(
          (a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );

        console.log(
          `🔗 Merged real-time data with historical for device: ${deviceId}`
        );
        return merged;
      }

      return historical;
    },
    [historicalData]
  );

  // Auto-clear loading state if no devices are loading
  useEffect(() => {
    if (loadingDevices.current.size === 0) {
      setIsLoading(false);
    }
  }, []);

  return {
    historicalData,
    isLoading,
    error,
    fetchHistoricalData,
    clearHistoricalData,
    refreshHistoricalData,
    getLatestHistoricalPoint,
    mergeWithRealtimeData,
  };
}
