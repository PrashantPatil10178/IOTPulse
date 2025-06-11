"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";

interface SensorDataPoint {
  id: string;
  deviceId: string;
  data: {
    metrics: {
      primary: {
        name: string;
        unit: string;
        value: number;
      };
      secondary: Array<{
        name: string;
        unit: string;
        value: number;
      }>;
    };
    rawData: {
      cost?: number;
      current?: number;
      voltage?: number;
      frequency?: number;
      timestamp: string;
      peakDemand?: number;
      powerUsage?: number;
      powerFactor?: number;
      totalEnergy?: number;
      [key: string]: any; // For other device types
    };
    template: {
      icon: string;
      unit: string;
      color: string;
      category: string;
      chartType: string;
      primaryMetric: string;
      secondaryMetrics: string[];
    };
    timestamp: string;
    deviceType: string;
    visualization: {
      icon: string;
      color: string;
      category: string;
      chartType: string;
    };
  };
  timestamp: string;
}

interface DeviceInfo {
  id: string;
  name: string;
  type: string;
  status: string;
  currentLocation: string;
  coordinates: string;
  lastSeen: string;
}

interface DataStructure {
  primaryMetric: string;
  secondaryMetrics: string[];
  chartType: string;
  unit: string;
  icon: string;
  color: string;
  category: string;
}

interface ApiResponse {
  success: boolean;
  message: string;
  data: {
    device: DeviceInfo;
    dataStructure: DataStructure;
    sensorData: SensorDataPoint[];
    totalEntries: number;
    latest: SensorDataPoint;
    summary: {
      oldestReading: string;
      newestReading: string;
      deviceType: string;
    };
  };
  timestamp: string;
}

interface ProcessedDataPoint {
  timestamp: string;
  [metricName: string]: number | string; // Dynamic metric values
}

interface UseHistoricalDataReturn {
  historicalData: Record<string, ProcessedDataPoint[]>;
  deviceInfo: Record<string, DeviceInfo>;
  dataStructures: Record<string, DataStructure>;
  isLoading: boolean;
  error: string | null;
  fetchHistoricalData: (deviceId: string, limit?: number) => Promise<void>;
  clearHistoricalData: (deviceId?: string) => void;
  refreshHistoricalData: (deviceId: string) => Promise<void>;
  getLatestPoint: (deviceId: string) => ProcessedDataPoint | null;
  getDeviceMetrics: (deviceId: string) => string[];
  bulkFetchHistoricalData: (
    deviceIds: string[],
    limit?: number
  ) => Promise<void>;
  getDataStats: (deviceId: string) => {
    totalPoints: number;
    timeRange: { start: string; end: string } | null;
    lastUpdate: string | null;
    deviceInfo: DeviceInfo | null;
    dataStructure: DataStructure | null;
  };
  mergeWithRealtimeData: (
    deviceId: string,
    realtimeData: any
  ) => ProcessedDataPoint[];
}

// Cache configurations
const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes
const MAX_CACHE_SIZE = 50; // Maximum cached requests
const requestCache = new Map<
  string,
  { promise: Promise<any>; timestamp: number }
>();

// Memory optimization for large datasets
const MEMORY_LIMIT = 1000; // Max points per device in memory
const COMPRESSION_THRESHOLD = 500; // Start compressing when over this limit

export function useHistoricalData(username: string): UseHistoricalDataReturn {
  const [historicalData, setHistoricalData] = useState<
    Record<string, ProcessedDataPoint[]>
  >({});
  const [deviceInfo, setDeviceInfo] = useState<Record<string, DeviceInfo>>({});
  const [dataStructures, setDataStructures] = useState<
    Record<string, DataStructure>
  >({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadingDevices = useRef<Set<string>>(new Set());
  const abortControllers = useRef<Map<string, AbortController>>(new Map());

  // Memory-optimized data compression for large datasets
  const compressDataPoints = useCallback(
    (points: ProcessedDataPoint[]): ProcessedDataPoint[] => {
      if (points.length <= COMPRESSION_THRESHOLD) return points;

      // Keep first 100, last 100, and sample every 5th from the middle
      const start = points.slice(0, 100);
      const end = points.slice(-100);
      const middle = points
        .slice(100, -100)
        .filter((_, index) => index % 5 === 0);

      console.log(
        `🗜️ Compressed ${points.length} points to ${
          start.length + middle.length + end.length
        }`
      );
      return [...start, ...middle, ...end].sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
    },
    []
  );

  // Optimized data transformation for your exact API structure
  const transformSensorData = useCallback(
    (sensorData: SensorDataPoint[]): ProcessedDataPoint[] => {
      return sensorData
        .map((point) => {
          const result: ProcessedDataPoint = {
            timestamp: point.timestamp,
            // Add primary metric
            [point.data.metrics.primary.name]: point.data.metrics.primary.value,
          };

          // Add all secondary metrics dynamically
          point.data.metrics.secondary.forEach((metric) => {
            result[metric.name] = metric.value;
          });

          // Add useful raw data fields for energy meters
          if (point.data.rawData.cost !== undefined) {
            result.cost = point.data.rawData.cost;
          }
          if (point.data.rawData.frequency !== undefined) {
            result.frequency = point.data.rawData.frequency;
          }
          if (point.data.rawData.powerFactor !== undefined) {
            result.powerFactor = point.data.rawData.powerFactor;
          }
          if (point.data.rawData.peakDemand !== undefined) {
            result.peakDemand = point.data.rawData.peakDemand;
          }

          return result;
        })
        .sort(
          (a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
    },
    []
  );

  // Cache management with cleanup
  const cleanupCache = useCallback(() => {
    const now = Date.now();
    let cleanupCount = 0;

    requestCache.forEach((value, key) => {
      if (now - value.timestamp > CACHE_DURATION) {
        requestCache.delete(key);
        cleanupCount++;
      }
    });

    // If cache is still too large, remove oldest entries
    if (requestCache.size > MAX_CACHE_SIZE) {
      const entries = Array.from(requestCache.entries()).sort(
        (a, b) => a[1].timestamp - b[1].timestamp
      );

      const toRemove = entries.slice(0, requestCache.size - MAX_CACHE_SIZE);
      toRemove.forEach(([key]) => requestCache.delete(key));
      cleanupCount += toRemove.length;
    }

    if (cleanupCount > 0) {
      console.log(`🧹 Cleaned up ${cleanupCount} cache entries`);
    }
  }, []);

  // Enhanced error handling for your API
  const handleError = useCallback(
    (err: any, deviceId: string) => {
      let errorMessage = "Failed to fetch historical data";
      let toastDuration = 5000;

      if (err.response) {
        const { status, data } = err.response;

        switch (status) {
          case 404:
            if (data.errorCode === "USER_NOT_FOUND") {
              errorMessage = `User '${username}' not found`;
            } else if (data.errorCode === "DEVICE_NOT_FOUND") {
              errorMessage = "Device not found or access denied";
            } else if (data.errorCode === "NO_SENSOR_DATA") {
              errorMessage = "No sensor data available";
              toastDuration = 3000; // Shorter duration for "no data"
            }
            break;
          case 401:
            errorMessage = "Invalid API key or authentication failed";
            break;
          case 403:
            errorMessage = "Access denied - insufficient permissions";
            break;
          case 429:
            errorMessage = "Rate limit exceeded - please wait";
            break;
          case 500:
            errorMessage = "Server error - please try again";
            break;
          default:
            errorMessage = data.message || `HTTP ${status}`;
        }
      } else if (err.request) {
        errorMessage = "Network error - check connection";
      } else if (err.code === "ECONNABORTED") {
        errorMessage = "Request timeout";
      }

      console.error(`❌ Error fetching data for ${deviceId}:`, err);
      setError(errorMessage);

      if (
        err.response?.status === 404 &&
        err.response?.data?.errorCode === "NO_SENSOR_DATA"
      ) {
        toast.warning(`No data for device ${deviceId}`, {
          description: "Device may be new or inactive",
          duration: toastDuration,
        });
      } else {
        toast.error(`Failed to load data: ${errorMessage}`, {
          description: `Device: ${deviceId}`,
          duration: toastDuration,
        });
      }

      setHistoricalData((prev) => ({ ...prev, [deviceId]: [] }));
    },
    [username]
  );

  // Main fetch function optimized for large datasets
  const fetchHistoricalData = useCallback(
    async (deviceId: string, limit: number = 100) => {
      const cacheKey = `${username}-${deviceId}-${limit}`;
      const now = Date.now();

      // Check cache first
      const cached = requestCache.get(cacheKey);
      if (cached && now - cached.timestamp < CACHE_DURATION) {
        console.log(`⚡ Using cached data for ${deviceId}`);
        return cached.promise;
      }

      if (loadingDevices.current.has(deviceId)) {
        console.log(`⏳ Already loading ${deviceId}`);
        return;
      }

      try {
        loadingDevices.current.add(deviceId);
        setIsLoading(true);
        setError(null);

        // Cancel previous request
        const existingController = abortControllers.current.get(deviceId);
        if (existingController) {
          existingController.abort();
        }

        const abortController = new AbortController();
        abortControllers.current.set(deviceId, abortController);

        console.log(`📊 Fetching ${limit} points for device: ${deviceId}`);

        // Create request promise
        const requestPromise = api.get(`/data/${username}/${deviceId}/latest`, {
          params: { limit },
          headers: {
            "x-api-key":
              "d9fb83a35cf25ea8ca0942b5468cf019012fc70842d18a3dd885453e5ce0f600", // You should move this to env
          },
          signal: abortController.signal,
          timeout: 45000, // Longer timeout for large datasets
        });

        // Cache the request
        requestCache.set(cacheKey, { promise: requestPromise, timestamp: now });

        const response = await requestPromise;

        if (response.data.success && response.data.data) {
          const { device, dataStructure, sensorData, summary } = response.data
            .data as ApiResponse["data"];

          console.log(
            `✅ Fetched ${sensorData.length} points for ${device.name}`
          );

          // Store device info and structure
          setDeviceInfo((prev) => ({ ...prev, [deviceId]: device }));
          setDataStructures((prev) => ({ ...prev, [deviceId]: dataStructure }));

          // Transform and potentially compress data
          let transformedData = transformSensorData(sensorData);

          // Apply compression for large datasets
          if (transformedData.length > MEMORY_LIMIT) {
            transformedData = compressDataPoints(transformedData);
          }

          setHistoricalData((prev) => ({
            ...prev,
            [deviceId]: transformedData,
          }));

          // Success toast with details
          toast.success(`Data loaded for ${device.name}`, {
            description: `${sensorData.length} points${
              transformedData.length !== sensorData.length
                ? ` (compressed to ${transformedData.length})`
                : ""
            } • ${new Date(
              summary.oldestReading
            ).toLocaleDateString()} to ${new Date(
              summary.newestReading
            ).toLocaleDateString()}`,
            duration: 3000,
          });
        }

        // Cleanup cache periodically
        if (Math.random() < 0.1) {
          // 10% chance to trigger cleanup
          cleanupCache();
        }
      } catch (err: any) {
        if (err.name !== "AbortError" && err.code !== "ERR_CANCELED") {
          handleError(err, deviceId);
        }
      } finally {
        loadingDevices.current.delete(deviceId);
        abortControllers.current.delete(deviceId);
        setIsLoading(loadingDevices.current.size > 0);
      }
    },
    [
      username,
      transformSensorData,
      compressDataPoints,
      cleanupCache,
      handleError,
    ]
  );

  // Optimized bulk fetch for multiple devices
  const bulkFetchHistoricalData = useCallback(
    async (deviceIds: string[], limit: number = 100) => {
      console.log(
        `📦 Bulk fetching ${deviceIds.length} devices (${limit} points each)`
      );

      try {
        setIsLoading(true);
        setError(null);

        // Batch requests with concurrency limit to avoid overwhelming server
        const CONCURRENT_REQUESTS = 5;
        const batches = [];

        for (let i = 0; i < deviceIds.length; i += CONCURRENT_REQUESTS) {
          batches.push(deviceIds.slice(i, i + CONCURRENT_REQUESTS));
        }

        let successCount = 0;
        let errorCount = 0;

        for (const batch of batches) {
          const batchPromises = batch.map((deviceId) =>
            api
              .get(`/data/${username}/${deviceId}/latest`, {
                params: { limit },
                headers: {
                  "x-api-key":
                    "d9fb83a35cf25ea8ca0942b5468cf019012fc70842d18a3dd885453e5ce0f600",
                },
                timeout: 45000,
              })
              .then((response) => ({ deviceId, response }))
              .catch((error) => ({ deviceId, error }))
          );

          const results = await Promise.allSettled(batchPromises);

          results.forEach((result) => {
            if (result.status === "fulfilled") {
              const resultValue = result.value;

              if ("error" in resultValue) {
                handleError(resultValue.error, resultValue.deviceId);
                errorCount++;
              } else if (resultValue.response?.data.success) {
                const { device, dataStructure, sensorData } =
                  resultValue.response.data.data;

                setDeviceInfo((prev) => ({
                  ...prev,
                  [resultValue.deviceId]: device,
                }));
                setDataStructures((prev) => ({
                  ...prev,
                  [resultValue.deviceId]: dataStructure,
                }));

                let transformedData = transformSensorData(sensorData);
                if (transformedData.length > MEMORY_LIMIT) {
                  transformedData = compressDataPoints(transformedData);
                }

                setHistoricalData((prev) => ({
                  ...prev,
                  [resultValue.deviceId]: transformedData,
                }));
                successCount++;
              }
            } else {
              errorCount++;
            }
          });

          // Small delay between batches to be gentle on server
          if (batches.indexOf(batch) < batches.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 200));
          }
        }

        toast.success(`Bulk fetch completed`, {
          description: `${successCount} devices loaded${
            errorCount > 0 ? `, ${errorCount} failed` : ""
          }`,
          duration: 4000,
        });

        console.log(
          `✅ Bulk fetch: ${successCount} success, ${errorCount} errors`
        );
      } catch (err) {
        console.error(`❌ Bulk fetch error:`, err);
        toast.error("Bulk fetch failed");
      } finally {
        setIsLoading(false);
      }
    },
    [username, transformSensorData, compressDataPoints, handleError]
  );

  // Get latest data point
  const getLatestPoint = useCallback(
    (deviceId: string): ProcessedDataPoint | null => {
      const data = historicalData[deviceId];
      return data && data.length > 0 ? data[data.length - 1] : null;
    },
    [historicalData]
  );

  // Get available metrics for a device
  const getDeviceMetrics = useCallback(
    (deviceId: string): string[] => {
      const data = historicalData[deviceId];
      if (!data || data.length === 0) return [];

      const samplePoint = data[0];
      return Object.keys(samplePoint).filter((key) => key !== "timestamp");
    },
    [historicalData]
  );

  // Enhanced data statistics
  const getDataStats = useCallback(
    (deviceId: string) => {
      const data = historicalData[deviceId] || [];
      const device = deviceInfo[deviceId] || null;
      const structure = dataStructures[deviceId] || null;

      if (data.length === 0) {
        return {
          totalPoints: 0,
          timeRange: null,
          lastUpdate: null,
          deviceInfo: device,
          dataStructure: structure,
        };
      }

      const timestamps = data.map((point) =>
        new Date(point.timestamp).getTime()
      );

      return {
        totalPoints: data.length,
        timeRange: {
          start: new Date(Math.min(...timestamps)).toISOString(),
          end: new Date(Math.max(...timestamps)).toISOString(),
        },
        lastUpdate: new Date(Math.max(...timestamps)).toISOString(),
        deviceInfo: device,
        dataStructure: structure,
      };
    },
    [historicalData, deviceInfo, dataStructures]
  );

  // Merge with real-time data
  const mergeWithRealtimeData = useCallback(
    (deviceId: string, realtimeData: any): ProcessedDataPoint[] => {
      const historical = historicalData[deviceId] || [];

      if (!realtimeData) return historical;

      // Create real-time point matching your data structure
      const realtimePoint: ProcessedDataPoint = {
        timestamp: realtimeData.timestamp || new Date().toISOString(),
      };

      // Add metrics from real-time data
      if (realtimeData.data?.metrics?.primary) {
        realtimePoint[realtimeData.data.metrics.primary.name] =
          realtimeData.data.metrics.primary.value;
      }

      if (realtimeData.data?.metrics?.secondary) {
        realtimeData.data.metrics.secondary.forEach((metric: any) => {
          realtimePoint[metric.name] = metric.value;
        });
      }

      // Check for duplicates (within 10 seconds)
      const realtimeTimestamp = new Date(realtimePoint.timestamp).getTime();
      const isDuplicate = historical.some(
        (point) =>
          Math.abs(new Date(point.timestamp).getTime() - realtimeTimestamp) <
          10000
      );

      if (!isDuplicate) {
        const merged = [...historical, realtimePoint].sort(
          (a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );

        console.log(
          `🔗 Merged real-time data for ${deviceId}: ${historical.length} + 1 = ${merged.length}`
        );
        return merged;
      }

      return historical;
    },
    [historicalData]
  );

  // Enhanced refresh
  const refreshHistoricalData = useCallback(
    async (deviceId: string) => {
      console.log(`🔄 Refreshing data for ${deviceId}`);

      const controller = abortControllers.current.get(deviceId);
      if (controller) controller.abort();

      // Clear cached data
      const cacheKey = `${username}-${deviceId}`;
      requestCache.forEach((_, key) => {
        if (key.startsWith(cacheKey)) {
          requestCache.delete(key);
        }
      });

      setHistoricalData((prev) => {
        const newData = { ...prev };
        delete newData[deviceId];
        return newData;
      });

      setError(null);
      await fetchHistoricalData(deviceId);
    },
    [username, fetchHistoricalData]
  );

  // Clear data
  const clearHistoricalData = useCallback((deviceId?: string) => {
    if (deviceId) {
      console.log(`🧹 Clearing data for ${deviceId}`);

      const controller = abortControllers.current.get(deviceId);
      if (controller) {
        controller.abort();
        abortControllers.current.delete(deviceId);
      }

      setHistoricalData((prev) => {
        const newData = { ...prev };
        delete newData[deviceId];
        return newData;
      });

      setDeviceInfo((prev) => {
        const newData = { ...prev };
        delete newData[deviceId];
        return newData;
      });

      setDataStructures((prev) => {
        const newData = { ...prev };
        delete newData[deviceId];
        return newData;
      });

      loadingDevices.current.delete(deviceId);
    } else {
      console.log(`🧹 Clearing all data`);

      abortControllers.current.forEach((controller) => controller.abort());
      abortControllers.current.clear();
      requestCache.clear();

      setHistoricalData({});
      setDeviceInfo({});
      setDataStructures({});
      loadingDevices.current.clear();
    }

    setError(null);
    setIsLoading(loadingDevices.current.size > 0);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortControllers.current.forEach((controller) => controller.abort());
      abortControllers.current.clear();
      requestCache.clear();
    };
  }, []);

  return {
    historicalData,
    deviceInfo,
    dataStructures,
    isLoading,
    error,
    fetchHistoricalData,
    clearHistoricalData,
    refreshHistoricalData,
    getLatestPoint,
    getDeviceMetrics,
    bulkFetchHistoricalData,
    getDataStats,
    mergeWithRealtimeData,
  };
}
