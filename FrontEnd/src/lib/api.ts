import axios from "axios";

export const API_BASE_URL = "https://iot.webfuze.in/api";

export const api = axios.create({
  baseURL: import.meta.env.PROD ? API_BASE_URL : "https://iot.webfuze.in/api",
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(
  (config) => {
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("iot-dashboard-token")
        : null;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("iot-dashboard-token");
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export const deviceApi = {
  create: async (deviceData: {
    name: string;
    type: string;
    status: string;
    location?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    batteryLevel?: number | null;
    firmware?: string | null;
  }) => {
    const response = await api.post("/devices", deviceData);
    return response.data;
  },

  getAll: async (params?: {
    search?: string;
    type?: string;
    status?: string;
    sortBy?: string;
    order?: string;
    page?: number;
    limit?: number;
  }) => {
    const response = await api.get("/devices", { params });
    return response.data;
  },

  // Get a specific device
  getById: async (deviceId: string) => {
    const response = await api.get(`/devices/${deviceId}`);
    return response.data;
  },

  // Update a device
  update: async (deviceId: string, deviceData: any) => {
    const response = await api.put(`/devices/${deviceId}`, deviceData);
    return response.data;
  },

  // Delete a device
  delete: async (deviceId: string) => {
    const response = await api.delete(`/devices/${deviceId}`);
    return response.data;
  },

  // Send action to device
  sendAction: async (deviceId: string, action: string, value?: any) => {
    const response = await api.post(`/devices/${deviceId}/action`, {
      action,
      value,
    });
    return response.data;
  },
};

export interface Device {
  id: string;
  name: string;
  type: string;
  status: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  batteryLevel?: number;
  firmware?: string;
  lastSeen?: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
}

export default api;
