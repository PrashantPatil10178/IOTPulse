import { useState, useEffect, useCallback, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import alertsService, {
  type GetAlertsParams,
  type AlertsResponse,
} from "@/services/alertService";
import type { Alert } from "@/types";

export interface UseAlertsResult {
  alerts: Alert[];
  pagination: AlertsResponse["pagination"] | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  fetchAlerts: (params?: GetAlertsParams) => Promise<void>;
  refreshAlerts: () => Promise<void>;
  acknowledgeAlert: (alertId: string) => Promise<void>;
  resolveAlert: (alertId: string, resolutionNotes?: string) => Promise<void>;
  bulkAcknowledgeAlerts: (alertIds: string[]) => Promise<void>;
}

export function useAlerts(
  initialParams: GetAlertsParams = {}
): UseAlertsResult {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [pagination, setPagination] = useState<
    AlertsResponse["pagination"] | null
  >(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Store the last used params
  const lastParamsRef = useRef<GetAlertsParams>(initialParams);
  const mountedRef = useRef(false);
  const { toast } = useToast();

  // Core fetch function that doesn't cause re-renders
  const performFetch = useCallback(
    async (params: GetAlertsParams) => {
      try {
        setError(null);
        const response = await alertsService.getAllAlerts(params);
        setAlerts(response.alerts);
        setPagination(response.pagination);
        lastParamsRef.current = params;
      } catch (err: any) {
        const errorMessage =
          err.response?.data?.error || "Failed to fetch alerts";
        setError(errorMessage);
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      }
    },
    [toast]
  );

  const fetchAlerts = useCallback(
    async (params: GetAlertsParams = {}) => {
      const mergedParams = { ...lastParamsRef.current, ...params };
      await performFetch(mergedParams);
      setLoading(false);
      setRefreshing(false);
    },
    [performFetch]
  );

  const refreshAlerts = useCallback(async () => {
    if (!mountedRef.current) return;
    setRefreshing(true);
    await performFetch(lastParamsRef.current);
    setRefreshing(false);
  }, [performFetch]);

  const acknowledgeAlert = useCallback(
    async (alertId: string) => {
      try {
        const updatedAlert = await alertsService.acknowledgeAlert(alertId);

        setAlerts((prevAlerts) =>
          prevAlerts.map((alert) =>
            alert.id === alertId ? { ...alert, ...updatedAlert } : alert
          )
        );

        toast({
          title: "Success",
          description: "Alert acknowledged successfully",
        });
      } catch (err: any) {
        const errorMessage =
          err.response?.data?.error || "Failed to acknowledge alert";
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
        throw err;
      }
    },
    [toast]
  );

  const resolveAlert = useCallback(
    async (alertId: string, resolutionNotes?: string) => {
      try {
        const updatedAlert = await alertsService.resolveAlert(alertId, {
          resolutionNotes,
        });

        setAlerts((prevAlerts) =>
          prevAlerts.map((alert) =>
            alert.id === alertId ? { ...alert, ...updatedAlert } : alert
          )
        );

        toast({
          title: "Success",
          description: "Alert resolved successfully",
        });
      } catch (err: any) {
        const errorMessage =
          err.response?.data?.error || "Failed to resolve alert";
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
        throw err;
      }
    },
    [toast]
  );

  const bulkAcknowledgeAlerts = useCallback(
    async (alertIds: string[]) => {
      try {
        const result = await alertsService.bulkAcknowledgeAlerts(alertIds);
        await refreshAlerts();
        toast({
          title: "Success",
          description: result.message,
        });
      } catch (err: any) {
        const errorMessage =
          err.response?.data?.error || "Failed to acknowledge alerts";
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
        throw err;
      }
    },
    [refreshAlerts, toast]
  );

  // Initial fetch on mount
  useEffect(() => {
    mountedRef.current = true;
    fetchAlerts(initialParams);

    return () => {
      mountedRef.current = false;
    };
  }, []); // Only run once on mount

  return {
    alerts,
    pagination,
    loading,
    refreshing,
    error,
    fetchAlerts,
    refreshAlerts,
    acknowledgeAlert,
    resolveAlert,
    bulkAcknowledgeAlerts,
  };
}
