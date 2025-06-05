"use client";

import { useState, useCallback } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";

export function useHistoricalData(username?: string) {
  const [historicalData, setHistoricalData] = useState<Record<string, any[]>>(
    {}
  );
  const [isLoading, setIsLoading] = useState(false);

  const fetchHistoricalData = useCallback(
    async (deviceId: string, limit = 100) => {
      if (!username) return;

      try {
        setIsLoading(true);

        const response = await api.get(
          `/data/${username}/${deviceId}/latest?limit=${limit}`,
          {
            headers: {
              "Content-Type": "application/json",
              "x-api-key":
                "d9fb83a35cf25ea8ca0942b5468cf019012fc70842d18a3dd885453e5ce0f600",
            },
          }
        );

        if (response.data?.success) {
          const data = response.data.data.sensorData || [];
          setHistoricalData((prev) => ({
            ...prev,
            [deviceId]: data.reverse(), // Reverse to get chronological order
          }));

          console.log(
            `✅ Fetched ${data.length} historical data points for device: ${deviceId}`
          );
        } else {
          throw new Error(
            response.data?.message || "Failed to fetch historical data"
          );
        }
      } catch (error: any) {
        console.error(
          `❌ Failed to fetch historical data for device ${deviceId}:`,
          error
        );

        if (error.response?.status === 404) {
          toast.warning(
            `No historical data found for device ${deviceId.slice(-4)}`
          );
        } else {
          toast.error(`Failed to load historical data: ${error.message}`);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [username]
  );

  return {
    historicalData,
    isLoading,
    fetchHistoricalData,
  };
}
