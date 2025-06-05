"use client";

import { useState, useEffect, useMemo } from "react";
import { useSocket } from "@/context/SocketContext";
import type { Device } from "@/lib/api";

interface DataPoint {
  timestamp: string;
  [key: string]: number | string;
}

interface ChartData {
  data: DataPoint[];
  isLiveData: boolean;
  hasHistoricalFallback: boolean;
  devicesWithHistoricalData: string[];
}

interface UseAnalyticsChartProps {
  devices: Device[];
  selectedDeviceGroup: string;
  selectedMetric: string;
}

export function useAnalyticsChart({
  devices,
  selectedDeviceGroup,
  selectedMetric,
}: UseAnalyticsChartProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [realTimeData, setRealTimeData] = useState<Record<string, DataPoint[]>>(
    {}
  );
  const { getReceivingDataDevices } = useSocket();

  // Generate mock real-time data
  useEffect(() => {
    const interval = setInterval(() => {
      const receivingDevices = getReceivingDataDevices();

      receivingDevices.forEach((deviceId) => {
        const newDataPoint: DataPoint = {
          timestamp: new Date().toISOString(),
          [selectedMetric]: Math.random() * 30 + 20,
          humidity: Math.random() * 40 + 40,
          pressure: Math.random() * 20 + 1000,
          voltage: Math.random() * 5 + 3,
          current: Math.random() * 2 + 1,
        };

        setRealTimeData((prev) => {
          const currentData = prev[deviceId] || [];
          const updatedData = [...currentData, newDataPoint].slice(-50);
          return {
            ...prev,
            [deviceId]: updatedData,
          };
        });
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [selectedMetric, getReceivingDataDevices]);

  const chartData: ChartData = useMemo(() => {
    const receivingDevices = getReceivingDataDevices();

    if (selectedDeviceGroup === "all" && receivingDevices.length > 0) {
      const combinedData: DataPoint[] = [];
      const timePoints = new Set<string>();

      receivingDevices.forEach((deviceId) => {
        const deviceData = realTimeData[deviceId] || [];
        deviceData.forEach((point) => timePoints.add(point.timestamp));
      });

      Array.from(timePoints)
        .sort()
        .forEach((timestamp) => {
          const dataPoint: DataPoint = { timestamp };
          let totalValue = 0;
          let deviceCount = 0;

          receivingDevices.forEach((deviceId) => {
            const deviceData = realTimeData[deviceId] || [];
            const point = deviceData.find((p) => p.timestamp === timestamp);
            if (point && typeof point[selectedMetric] === "number") {
              totalValue += point[selectedMetric] as number;
              deviceCount++;
            }
          });

          if (deviceCount > 0) {
            dataPoint[selectedMetric] = Number(
              (totalValue / deviceCount).toFixed(1)
            );
            combinedData.push(dataPoint);
          }
        });

      return {
        data: combinedData.slice(-24),
        isLiveData: true,
        hasHistoricalFallback: false,
        devicesWithHistoricalData: [],
      };
    }

    return {
      data: [],
      isLiveData: false,
      hasHistoricalFallback: false,
      devicesWithHistoricalData: [],
    };
  }, [
    selectedDeviceGroup,
    selectedMetric,
    realTimeData,
    getReceivingDataDevices,
  ]);

  const refreshData = () => {
    setIsLoading(true);
    // Simulate refresh
    setTimeout(() => {
      setIsLoading(false);
    }, 1000);
  };

  return {
    chartData,
    isLoading,
    refreshData,
  };
}
