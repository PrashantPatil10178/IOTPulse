import api from "@/lib/api";
import type { Alert } from "@/types";

export interface AlertsResponse {
  alerts: Alert[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface GetAlertsParams {
  status?: "ACTIVE" | "ACKNOWLEDGED" | "RESOLVED";
  severity?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  deviceId?: string;
  page?: number;
  limit?: number;
}

export interface CreateAlertData {
  deviceId: string;
  title: string;
  message: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
}

export interface ResolveAlertData {
  resolutionNotes?: string;
}

class AlertsService {
  private readonly endpoint = "/alerts";

  async getAllAlerts(params: GetAlertsParams = {}): Promise<AlertsResponse> {
    try {
      const response = await api.get<AlertsResponse>(this.endpoint, { params });
      return response.data;
    } catch (error) {
      console.error("Error fetching alerts:", error);
      throw error;
    }
  }

  async getAlert(alertId: string): Promise<Alert> {
    try {
      const response = await api.get<Alert>(`${this.endpoint}/${alertId}`);
      return response.data;
    } catch (error) {
      console.error("Error fetching alert:", error);
      throw error;
    }
  }

  async acknowledgeAlert(alertId: string): Promise<Alert> {
    try {
      const response = await api.post<Alert>(
        `${this.endpoint}/${alertId}/acknowledge`
      );
      return response.data;
    } catch (error) {
      console.error("Error acknowledging alert:", error);
      throw error;
    }
  }

  async resolveAlert(alertId: string, data: ResolveAlertData): Promise<Alert> {
    try {
      const response = await api.post<Alert>(
        `${this.endpoint}/${alertId}/resolve`,
        data
      );
      return response.data;
    } catch (error) {
      console.error("Error resolving alert:", error);
      throw error;
    }
  }

  async createAlert(data: CreateAlertData): Promise<Alert> {
    try {
      console.log("Creating alert with data:", data);
      const response = await api.post<Alert>(this.endpoint, data);
      return response.data;
    } catch (error) {
      console.error("Error creating alert:", error);
      throw error;
    }
  }

  async bulkAcknowledgeAlerts(
    alertIds: string[]
  ): Promise<{ message: string; acknowledgedCount: number }> {
    try {
      const response = await api.post(`${this.endpoint}/bulk-acknowledge`, {
        alertIds,
      });
      return response.data;
    } catch (error) {
      console.error("Error bulk acknowledging alerts:", error);
      throw error;
    }
  }
}

export const alertsService = new AlertsService();
export default alertsService;
