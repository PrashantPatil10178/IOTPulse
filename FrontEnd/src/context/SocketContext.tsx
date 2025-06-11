"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import { io, Socket } from "socket.io-client";
import { toast } from "sonner";
import { useAuth } from "./AuthContext";

interface DeviceData {
  deviceId: string;
  status?: string;
  batteryLevel?: number;
  lastSeen?: string;
  timestamp: string;
  value?: any;
  unit?: string;
  data?: {
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
    timestamp?: string;
    deviceType?: string;
    visualization?: any;
  };
}

interface DeviceError {
  deviceId: string;
  errorType:
    | "CONNECTION_LOST"
    | "DATA_TIMEOUT"
    | "SYNC_FAILED"
    | "NOT_RESPONDING";
  message: string;
  timestamp: string;
  duration?: number; // How long the device has been in error state
}

interface DeviceStats {
  totalDevices: number;
  activeDevices: number;
  idleDevices: number;
  disconnectedDevices: number;
  errorDevices: number; // NEW: Count of devices with errors
  receivingDataDevices: string[];
  deviceErrors: DeviceError[]; // NEW: Array of device errors
}

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  subscribeToAllDevices: (deviceIds: string[]) => Promise<void>;
  getDeviceData: (deviceId: string) => DeviceData | null;
  getLatestSyncedData: (deviceId: string) => DeviceData | null; // NEW: Get latest synced data
  getDeviceStatus: (deviceId: string) => {
    connectionStatus:
      | "RECEIVING_DATA"
      | "NOT_CONNECTED"
      | "DISCONNECTED"
      | "ERROR";
    isSubscribed: boolean;
    lastDataReceived: string | null;
    isLiveDataActive: boolean;
    error?: DeviceError; // NEW: Include error information
  };
  getDeviceStats: () => DeviceStats;
  getActiveDevicesCount: () => number;
  getReceivingDataDevices: () => string[];
  getDeviceErrors: () => DeviceError[]; // NEW: Get all device errors
  clearDeviceData: (deviceId: string) => void;
  forceDataSync: (deviceId: string) => Promise<boolean>; // NEW: Force sync latest data
  acknowledgeDeviceError: (deviceId: string) => void; // NEW: Acknowledge error
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

// Configurable constants
const RECONNECT_DELAY = 5000;
const SOCKET_TIMEOUT = 20000;
const DEVICE_IDLE_TIMEOUT = 2 * 60 * 1000; // 2 minutes
const DATA_SYNC_TIMEOUT = 30 * 1000; // 30 seconds for data sync
const ERROR_RETRY_ATTEMPTS = 3;

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Store device data, errors, and timestamps
  const deviceDataRef = useRef<Map<string, DeviceData>>(new Map());
  const deviceLastSeenRef = useRef<Map<string, number>>(new Map());
  const deviceErrorsRef = useRef<Map<string, DeviceError>>(new Map());
  const subscriptionAttemptsRef = useRef<Set<string>>(new Set());
  const deviceTimeoutsRef = useRef<Map<string, number>>(new Map());
  const syncAttemptsRef = useRef<Map<string, number>>(new Map());

  const { user } = useAuth();
  const reconnectAttempt = useRef(0);
  const socketRef = useRef<Socket | null>(null);

  // NEW: Create device error
  const createDeviceError = useCallback(
    (
      deviceId: string,
      errorType: DeviceError["errorType"],
      message: string,
      duration?: number
    ): DeviceError => {
      return {
        deviceId,
        errorType,
        message,
        timestamp: new Date().toISOString(),
        duration,
      };
    },
    []
  );

  // NEW: Set device error and show toast
  const setDeviceError = useCallback((error: DeviceError) => {
    const existingError = deviceErrorsRef.current.get(error.deviceId);

    // Only show toast if this is a new error or error type changed
    if (!existingError || existingError.errorType !== error.errorType) {
      toast.error(`Device ${error.deviceId}: ${error.message}`, {
        id: `device-error-${error.deviceId}`,
        duration: 5000,
        action: {
          label: "Retry Sync",
          onClick: () => forceDataSync(error.deviceId),
        },
      });
    }

    deviceErrorsRef.current.set(error.deviceId, error);
    // console.error(`🚨 Device Error [${error.deviceId}]:`, error);
  }, []);

  // NEW: Clear device error
  const clearDeviceError = useCallback((deviceId: string) => {
    const hadError = deviceErrorsRef.current.has(deviceId);
    deviceErrorsRef.current.delete(deviceId);

    if (hadError) {
      toast.success(`Device ${deviceId} reconnected`, {
        id: `device-reconnected-${deviceId}`,
        duration: 3000,
      });
      // console.log(`✅ Device error cleared for: ${deviceId}`);
    }
  }, []);

  // Enhanced function to mark device as not connected with error tracking
  const markDeviceAsNotConnected = useCallback(
    (deviceId: string) => {
      const lastSeen = deviceLastSeenRef.current.get(deviceId);
      const duration = lastSeen ? Date.now() - lastSeen : undefined;

      // console.log(
      //   `⏰ Device ${deviceId} marked as NOT_CONNECTED after 2 minutes of inactivity`
      // );

      // Create timeout error
      const error = createDeviceError(
        deviceId,
        "DATA_TIMEOUT",
        "Device stopped sending data for more than 2 minutes",
        duration
      );
      setDeviceError(error);

      // Keep the last data but mark it as stale
      const existingData = deviceDataRef.current.get(deviceId);
      if (existingData) {
        deviceDataRef.current.set(deviceId, {
          ...existingData,
          timestamp: new Date().toISOString(),
        });
      }
    },
    [createDeviceError, setDeviceError]
  );

  // Enhanced function to reset device timeout with error clearing
  const resetDeviceTimeout = useCallback(
    (deviceId: string) => {
      // Clear any existing error for this device
      clearDeviceError(deviceId);

      // Clear existing timeout
      const existingTimeout = deviceTimeoutsRef.current.get(deviceId);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }

      // Set new 2-minute timeout
      const timeoutId = setTimeout(() => {
        markDeviceAsNotConnected(deviceId);
        deviceTimeoutsRef.current.delete(deviceId);
      }, DEVICE_IDLE_TIMEOUT);

      deviceTimeoutsRef.current.set(deviceId, timeoutId);
      // console.log(`⏱️ Reset 2-minute timeout for device: ${deviceId}`);
    },
    [markDeviceAsNotConnected, clearDeviceError]
  );

  // NEW: Force data sync for a specific device
  const forceDataSync = useCallback(
    async (deviceId: string): Promise<boolean> => {
      if (!socket || !isConnected) {
        const error = createDeviceError(
          deviceId,
          "SYNC_FAILED",
          "Socket not connected"
        );
        setDeviceError(error);
        return false;
      }

      try {
        // console.log(`🔄 Force syncing data for device: ${deviceId}`);

        const currentAttempts = syncAttemptsRef.current.get(deviceId) || 0;
        if (currentAttempts >= ERROR_RETRY_ATTEMPTS) {
          const error = createDeviceError(
            deviceId,
            "SYNC_FAILED",
            `Failed to sync after ${ERROR_RETRY_ATTEMPTS} attempts`
          );
          setDeviceError(error);
          return false;
        }

        syncAttemptsRef.current.set(deviceId, currentAttempts + 1);

        // Request latest data from server
        return new Promise<boolean>((resolve) => {
          const timeout = setTimeout(() => {
            const error = createDeviceError(
              deviceId,
              "SYNC_FAILED",
              "Sync request timed out"
            );
            setDeviceError(error);
            resolve(false);
          }, DATA_SYNC_TIMEOUT);

          socket.emit("requestLatestData", deviceId, (response: any) => {
            clearTimeout(timeout);

            if (response.success && response.data) {
              // Update device data with latest from server
              const timestamp = Date.now();
              deviceDataRef.current.set(deviceId, {
                deviceId,
                ...response.data,
                timestamp: new Date().toISOString(),
              });
              deviceLastSeenRef.current.set(deviceId, timestamp);

              // Reset error attempts and clear errors
              syncAttemptsRef.current.delete(deviceId);
              clearDeviceError(deviceId);
              resetDeviceTimeout(deviceId);

              // console.log(`✅ Force sync successful for device: ${deviceId}`);
              resolve(true);
            } else {
              const error = createDeviceError(
                deviceId,
                "SYNC_FAILED",
                response.error || "Failed to retrieve latest data"
              );
              setDeviceError(error);
              resolve(false);
            }
          });
        });
      } catch (error) {
        const deviceError = createDeviceError(
          deviceId,
          "SYNC_FAILED",
          `Sync error: ${error}`
        );
        setDeviceError(deviceError);
        return false;
      }
    },
    [
      socket,
      isConnected,
      createDeviceError,
      setDeviceError,
      clearDeviceError,
      resetDeviceTimeout,
    ]
  );

  // Initialize socket connection with enhanced error handling
  useEffect(() => {
    if (!user) {
      // Cleanup if user logs out
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
        setIsConnected(false);
        deviceDataRef.current.clear();
        deviceLastSeenRef.current.clear();
        deviceErrorsRef.current.clear();
        subscriptionAttemptsRef.current.clear();
        syncAttemptsRef.current.clear();

        // Clear all device timeouts
        deviceTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
        deviceTimeoutsRef.current.clear();
      }
      return;
    }

    const connectSocket = () => {
      // console.log("🔌 Initializing Socket.IO connection");

      const newSocket = io(import.meta.env.URL || "https://iot.webfuze.in", {
        auth: {
          token: localStorage.getItem("iot-dashboard-token") || "",
        },
        transports: ["websocket", "polling"],
        path: "/socket",
        timeout: SOCKET_TIMEOUT,
        forceNew: true,
        reconnectionAttempts: 3,
        reconnectionDelay: RECONNECT_DELAY,
      });

      // Connection event handlers
      newSocket.on("connect", () => {
        // console.log("✅ Socket.IO connected");
        setIsConnected(true);
        reconnectAttempt.current = 0;
        toast.success("Real-time connection established");

        // Clear all connection errors when socket reconnects
        deviceErrorsRef.current.forEach((error, deviceId) => {
          if (error.errorType === "CONNECTION_LOST") {
            clearDeviceError(deviceId);
          }
        });
      });

      newSocket.on("disconnect", (reason) => {
        // console.log("❌ Socket.IO disconnected:", reason);
        setIsConnected(false);

        // Create connection errors for all active devices
        subscriptionAttemptsRef.current.forEach((deviceId) => {
          const error = createDeviceError(
            deviceId,
            "CONNECTION_LOST",
            "Socket connection lost"
          );
          setDeviceError(error);
        });

        // Clear all device timeouts when socket disconnects
        deviceTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
        deviceTimeoutsRef.current.clear();

        if (reason === "io server disconnect") {
          setTimeout(() => {
            newSocket.connect();
          }, RECONNECT_DELAY);
        }
      });

      newSocket.on("connect_error", (error) => {
        // console.error("🚨 Socket.IO connection error:", error);
        setIsConnected(false);

        if (reconnectAttempt.current < 3) {
          reconnectAttempt.current += 1;
          toast.warning(`Connection attempt ${reconnectAttempt.current} of 3`);
        } else {
          toast.error("Failed to establish real-time connection");

          // Create connection errors for all subscribed devices
          subscriptionAttemptsRef.current.forEach((deviceId) => {
            const error = createDeviceError(
              deviceId,
              "CONNECTION_LOST",
              "Failed to establish connection"
            );
            setDeviceError(error);
          });
        }
      });

      // Enhanced device subscription confirmations
      newSocket.on("subscribedToDevice", (data) => {
        // console.log("✅ Subscribed to device:", data.deviceId);
        subscriptionAttemptsRef.current.add(data.deviceId);
        clearDeviceError(data.deviceId);
      });

      newSocket.on("unsubscribedFromDevice", (data) => {
        // console.log("✅ Unsubscribed from device:", data.deviceId);
        subscriptionAttemptsRef.current.delete(data.deviceId);
        deviceDataRef.current.delete(data.deviceId);
        deviceLastSeenRef.current.delete(data.deviceId);
        clearDeviceError(data.deviceId);
        syncAttemptsRef.current.delete(data.deviceId);

        // Clear device timeout
        const timeoutId = deviceTimeoutsRef.current.get(data.deviceId);
        if (timeoutId) {
          clearTimeout(timeoutId);
          deviceTimeoutsRef.current.delete(data.deviceId);
        }
      });

      // Enhanced real-time device updates
      newSocket.on("deviceStatusUpdate", (data: DeviceData) => {
        // console.log("🔄 Device status update received:", data.deviceId);

        // Store the latest device data
        const timestamp = Date.now();
        deviceDataRef.current.set(data.deviceId, {
          ...data,
          timestamp: new Date().toISOString(),
        });
        deviceLastSeenRef.current.set(data.deviceId, timestamp);

        // Clear any sync errors and reset timeout
        syncAttemptsRef.current.delete(data.deviceId);
        clearDeviceError(data.deviceId);
        resetDeviceTimeout(data.deviceId);
      });

      newSocket.on("newSensorReading", (data: DeviceData) => {
        // console.log("📡 Sensor reading received:", data.deviceId);

        // Store the latest sensor data
        const timestamp = Date.now();
        const existingData = deviceDataRef.current.get(data.deviceId);
        deviceDataRef.current.set(data.deviceId, {
          ...existingData,
          ...data,
          timestamp: new Date().toISOString(),
        });
        deviceLastSeenRef.current.set(data.deviceId, timestamp);

        // Clear any sync errors and reset timeout
        syncAttemptsRef.current.delete(data.deviceId);
        clearDeviceError(data.deviceId);
        resetDeviceTimeout(data.deviceId);
      });

      // NEW: Handle device errors from server
      newSocket.on(
        "deviceError",
        (errorData: { deviceId: string; error: string; type?: string }) => {
          // console.error("🚨 Device error received from server:", errorData);
          const error = createDeviceError(
            errorData.deviceId,
            (errorData.type as DeviceError["errorType"]) || "NOT_RESPONDING",
            errorData.error
          );
          setDeviceError(error);
        }
      );

      newSocket.on("error", (error) => {
        // console.error("🚨 Socket error:", error);
        toast.error(`Socket error: ${error.message}`);
      });

      socketRef.current = newSocket;
      setSocket(newSocket);

      return newSocket;
    };

    const socketInstance = connectSocket();

    return () => {
      // console.log("🧹 Cleaning up socket connection");
      socketInstance.disconnect();
      socketRef.current = null;
      setSocket(null);
      setIsConnected(false);
      deviceDataRef.current.clear();
      deviceLastSeenRef.current.clear();
      deviceErrorsRef.current.clear();
      subscriptionAttemptsRef.current.clear();
      syncAttemptsRef.current.clear();

      // Clear all device timeouts
      deviceTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
      deviceTimeoutsRef.current.clear();
    };
  }, [
    user,
    resetDeviceTimeout,
    createDeviceError,
    setDeviceError,
    clearDeviceError,
  ]);

  // Enhanced subscribe to multiple devices
  const subscribeToAllDevices = useCallback(
    async (deviceIds: string[]) => {
      if (!socket || !isConnected) {
        // console.warn("⚠️ Cannot subscribe - socket not connected");
        deviceIds.forEach((deviceId) => {
          const error = createDeviceError(
            deviceId,
            "CONNECTION_LOST",
            "Cannot subscribe - socket not connected"
          );
          setDeviceError(error);
        });
        return;
      }

      // console.log("📡 Subscribing to all devices:", deviceIds);

      const subscriptionPromises = deviceIds.map(async (deviceId) => {
        if (!subscriptionAttemptsRef.current.has(deviceId)) {
          try {
            await new Promise<void>((resolve, reject) => {
              socket.emit(
                "subscribeToDevice",
                deviceId,
                (response: { success: boolean; error?: string }) => {
                  if (response.success) {
                    // console.log(
                    //   "✅ Subscription confirmed for device:",
                    //   deviceId
                    // );
                    clearDeviceError(deviceId);
                    resolve();
                  } else {
                    // console.error(
                    //   "❌ Subscription failed for device:",
                    //   deviceId,
                    //   response.error
                    // );
                    const error = createDeviceError(
                      deviceId,
                      "CONNECTION_LOST",
                      response.error || "Subscription failed"
                    );
                    setDeviceError(error);
                    reject(new Error(response.error || "Subscription failed"));
                  }
                }
              );

              // Add timeout
              setTimeout(() => {
                const error = createDeviceError(
                  deviceId,
                  "CONNECTION_LOST",
                  "Subscription timeout"
                );
                setDeviceError(error);
                reject(new Error("Subscription timeout"));
              }, 5000);
            });
          } catch (error) {
            // console.error(`Failed to subscribe to device ${deviceId}:`, error);
          }
        }
      });

      await Promise.allSettled(subscriptionPromises);
    },
    [socket, isConnected, createDeviceError, setDeviceError, clearDeviceError]
  );

  // Get device data
  const getDeviceData = useCallback((deviceId: string): DeviceData | null => {
    return deviceDataRef.current.get(deviceId) || null;
  }, []);

  // NEW: Get latest synced data with error handling
  const getLatestSyncedData = useCallback(
    (deviceId: string): DeviceData | null => {
      const data = deviceDataRef.current.get(deviceId);
      const error = deviceErrorsRef.current.get(deviceId);

      // If there's a sync error, try to force sync
      if (
        error &&
        (error.errorType === "SYNC_FAILED" ||
          error.errorType === "DATA_TIMEOUT")
      ) {
        // console.log(
        //   `⚠️ Device ${deviceId} has sync issues, attempting force sync...`
        // );
        forceDataSync(deviceId);
      }

      return data || null;
    },
    []
  );

  // Enhanced device status with error information
  const getDeviceStatus = useCallback(
    (deviceId: string) => {
      const lastSeen = deviceLastSeenRef.current.get(deviceId);
      const hasSubscriptionAttempt =
        subscriptionAttemptsRef.current.has(deviceId);
      const hasData = deviceDataRef.current.has(deviceId);
      const hasActiveTimeout = deviceTimeoutsRef.current.has(deviceId);
      const error = deviceErrorsRef.current.get(deviceId);

      if (!isConnected) {
        return {
          connectionStatus: "DISCONNECTED" as const,
          isSubscribed: false,
          lastDataReceived: null,
          isLiveDataActive: false,
          error:
            error ||
            createDeviceError(
              deviceId,
              "CONNECTION_LOST",
              "Socket disconnected"
            ),
        };
      }

      // If there's an active error, return error status
      if (error) {
        return {
          connectionStatus: "ERROR" as const,
          isSubscribed: hasSubscriptionAttempt,
          lastDataReceived: lastSeen ? new Date(lastSeen).toISOString() : null,
          isLiveDataActive: false,
          error,
        };
      }

      if (hasData && lastSeen) {
        const timeSinceLastData = Date.now() - lastSeen;

        // If we have recent data (within 2 minutes) and an active timeout
        if (timeSinceLastData < DEVICE_IDLE_TIMEOUT && hasActiveTimeout) {
          return {
            connectionStatus: "RECEIVING_DATA" as const,
            isSubscribed: true,
            lastDataReceived: new Date(lastSeen).toISOString(),
            isLiveDataActive: true,
          };
        }

        // If we have data but it's older than 2 minutes (device went idle)
        if (timeSinceLastData >= DEVICE_IDLE_TIMEOUT || !hasActiveTimeout) {
          return {
            connectionStatus: "NOT_CONNECTED" as const,
            isSubscribed: hasSubscriptionAttempt,
            lastDataReceived: new Date(lastSeen).toISOString(),
            isLiveDataActive: false,
          };
        }
      }

      // If we attempted to subscribe but no data yet
      if (hasSubscriptionAttempt) {
        return {
          connectionStatus: "NOT_CONNECTED" as const,
          isSubscribed: true,
          lastDataReceived: lastSeen ? new Date(lastSeen).toISOString() : null,
          isLiveDataActive: false,
        };
      }

      return {
        connectionStatus: "NOT_CONNECTED" as const,
        isSubscribed: false,
        lastDataReceived: null,
        isLiveDataActive: false,
      };
    },
    [isConnected, createDeviceError]
  );

  // Enhanced device statistics with error tracking
  const getDeviceStats = useCallback((): DeviceStats => {
    const allSubscribedDevices = Array.from(subscriptionAttemptsRef.current);
    const deviceErrors = Array.from(deviceErrorsRef.current.values());

    const stats = {
      totalDevices: allSubscribedDevices.length,
      activeDevices: 0,
      idleDevices: 0,
      disconnectedDevices: 0,
      errorDevices: deviceErrors.length,
      receivingDataDevices: [] as string[],
      deviceErrors,
    };

    if (!isConnected) {
      stats.disconnectedDevices = stats.totalDevices;
      return stats;
    }

    allSubscribedDevices.forEach((deviceId) => {
      const deviceStatus = getDeviceStatus(deviceId);

      switch (deviceStatus.connectionStatus) {
        case "RECEIVING_DATA":
          stats.activeDevices++;
          stats.receivingDataDevices.push(deviceId);
          break;
        case "NOT_CONNECTED":
          stats.idleDevices++;
          break;
        case "DISCONNECTED":
          stats.disconnectedDevices++;
          break;
        case "ERROR":
          // Error devices are counted separately but also affect other categories
          if (deviceStatus.isLiveDataActive) {
            stats.activeDevices++;
          } else {
            stats.idleDevices++;
          }
          break;
      }
    });

    // console.log("📊 Enhanced Device Stats:", stats);
    return stats;
  }, [isConnected, getDeviceStatus]);

  // Get count of devices actively receiving data
  const getActiveDevicesCount = useCallback((): number => {
    if (!isConnected) return 0;

    const activeCount = Array.from(subscriptionAttemptsRef.current).filter(
      (deviceId) => {
        const status = getDeviceStatus(deviceId);
        return (
          status.connectionStatus === "RECEIVING_DATA" &&
          status.isLiveDataActive
        );
      }
    ).length;

    // console.log(`📈 Active devices receiving data: ${activeCount}`);
    return activeCount;
  }, [isConnected, getDeviceStatus]);

  // Get array of device IDs that are actively receiving data
  const getReceivingDataDevices = useCallback((): string[] => {
    if (!isConnected) return [];

    const receivingDevices = Array.from(subscriptionAttemptsRef.current).filter(
      (deviceId) => {
        const status = getDeviceStatus(deviceId);
        return (
          status.connectionStatus === "RECEIVING_DATA" &&
          status.isLiveDataActive
        );
      }
    );

    // console.log("📡 Devices receiving data:", receivingDevices);
    return receivingDevices;
  }, [isConnected, getDeviceStatus]);

  // NEW: Get all device errors
  const getDeviceErrors = useCallback((): DeviceError[] => {
    return Array.from(deviceErrorsRef.current.values());
  }, []);

  // NEW: Acknowledge device error (for user interaction)
  const acknowledgeDeviceError = useCallback(
    (deviceId: string) => {
      clearDeviceError(deviceId);
      // Optionally trigger a sync attempt
      forceDataSync(deviceId);
    },
    [clearDeviceError]
  );

  // Enhanced clear device data
  const clearDeviceData = useCallback((deviceId: string) => {
    deviceDataRef.current.delete(deviceId);
    deviceLastSeenRef.current.delete(deviceId);
    deviceErrorsRef.current.delete(deviceId);
    subscriptionAttemptsRef.current.delete(deviceId);
    syncAttemptsRef.current.delete(deviceId);

    // Clear device timeout
    const timeoutId = deviceTimeoutsRef.current.get(deviceId);
    if (timeoutId) {
      clearTimeout(timeoutId);
      deviceTimeoutsRef.current.delete(deviceId);
    }
  }, []);

  const value: SocketContextType = {
    socket,
    isConnected,
    subscribeToAllDevices,
    getDeviceData,
    getLatestSyncedData,
    getDeviceStatus,
    getDeviceStats,
    getActiveDevicesCount,
    getReceivingDataDevices,
    getDeviceErrors,
    clearDeviceData,
    forceDataSync,
    acknowledgeDeviceError,
  };

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
}

// Enhanced hook for device data with error handling
export function useDeviceData(deviceId: string) {
  const { getLatestSyncedData, getDeviceStatus, forceDataSync } = useSocket();
  const [data, setData] = useState<DeviceData | null>(null);
  const [status, setStatus] = useState<{
    connectionStatus:
      | "RECEIVING_DATA"
      | "NOT_CONNECTED"
      | "DISCONNECTED"
      | "ERROR";
    isSubscribed: boolean;
    lastDataReceived: string | null;
    isLiveDataActive: boolean;
    error?: DeviceError;
  }>({
    connectionStatus: "DISCONNECTED",
    isSubscribed: false,
    lastDataReceived: null,
    isLiveDataActive: false,
    error: undefined,
  });
  const [isSyncing, setIsSyncing] = useState(false);

  // Auto-sync function
  const autoSync = useCallback(async () => {
    if (status.connectionStatus === "ERROR" || !status.isLiveDataActive) {
      setIsSyncing(true);
      try {
        await forceDataSync(deviceId);
      } catch (error) {
        // console.error(`Auto-sync failed for device ${deviceId}:`, error);
      } finally {
        setIsSyncing(false);
      }
    }
  }, [
    deviceId,
    status.connectionStatus,
    status.isLiveDataActive,
    forceDataSync,
  ]);

  // Check for updates every 1 second for responsive UI
  useEffect(() => {
    const interval = setInterval(() => {
      const deviceData = getLatestSyncedData(deviceId);
      const deviceStatus = getDeviceStatus(deviceId);

      setData(deviceData);
      setStatus(deviceStatus);
    }, 1000);

    // Initial check
    const deviceData = getLatestSyncedData(deviceId);
    const deviceStatus = getDeviceStatus(deviceId);
    setData(deviceData);
    setStatus(deviceStatus);

    return () => clearInterval(interval);
  }, [deviceId, getLatestSyncedData, getDeviceStatus]);

  // Auto-sync when device has errors
  useEffect(() => {
    if (status.error && !isSyncing) {
      const timeoutId = setTimeout(autoSync, 5000); // Auto-sync after 5 seconds
      return () => clearTimeout(timeoutId);
    }
  }, [status.error, isSyncing, autoSync]);

  return {
    data,
    connectionStatus: status.connectionStatus,
    isSubscribed: status.isSubscribed,
    lastDataReceived: status.lastDataReceived,
    isLiveDataActive: status.isLiveDataActive,
    error: status.error,
    hasData: data !== null,
    isSyncing,
    forceSync: () => forceDataSync(deviceId),
  };
}

// Enhanced hook to get real-time device statistics with errors
export function useDeviceStats() {
  const {
    getDeviceStats,
    getActiveDevicesCount,
    getReceivingDataDevices,
    getDeviceErrors,
    isConnected,
  } = useSocket();

  const [stats, setStats] = useState<DeviceStats>({
    totalDevices: 0,
    activeDevices: 0,
    idleDevices: 0,
    disconnectedDevices: 0,
    errorDevices: 0,
    receivingDataDevices: [],
    deviceErrors: [],
  });
  const [activeCount, setActiveCount] = useState(0);
  const [receivingDevices, setReceivingDevices] = useState<string[]>([]);
  const [deviceErrors, setDeviceErrors] = useState<DeviceError[]>([]);

  // Update stats every 2 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      const currentStats = getDeviceStats();
      const currentActiveCount = getActiveDevicesCount();
      const currentReceivingDevices = getReceivingDataDevices();
      const currentErrors = getDeviceErrors();

      setStats(currentStats);
      setActiveCount(currentActiveCount);
      setReceivingDevices(currentReceivingDevices);
      setDeviceErrors(currentErrors);
    }, 2000);

    // Initial check
    const currentStats = getDeviceStats();
    const currentActiveCount = getActiveDevicesCount();
    const currentReceivingDevices = getReceivingDataDevices();
    const currentErrors = getDeviceErrors();

    setStats(currentStats);
    setActiveCount(currentActiveCount);
    setReceivingDevices(currentReceivingDevices);
    setDeviceErrors(currentErrors);

    return () => clearInterval(interval);
  }, [
    getDeviceStats,
    getActiveDevicesCount,
    getReceivingDataDevices,
    getDeviceErrors,
    isConnected,
  ]);

  return {
    stats,
    activeDevicesCount: activeCount,
    receivingDataDevices: receivingDevices,
    deviceErrors,
    isConnected,
  };
}

export function useMultipleDevicesData(deviceIds: string[]) {
  const { getLatestSyncedData, getDeviceStatus } = useSocket();
  const [devicesData, setDevicesData] = useState<
    Map<
      string,
      {
        data: DeviceData | null;
        status: ReturnType<typeof getDeviceStatus>;
      }
    >
  >(new Map());

  useEffect(() => {
    const interval = setInterval(() => {
      const newDevicesData = new Map();

      deviceIds.forEach((deviceId) => {
        const data = getLatestSyncedData(deviceId);
        const status = getDeviceStatus(deviceId);
        newDevicesData.set(deviceId, { data, status });
      });

      setDevicesData(newDevicesData);
    }, 1000);

    return () => clearInterval(interval);
  }, [deviceIds, getLatestSyncedData, getDeviceStatus]);

  return {
    devicesData,
    getDeviceData: (deviceId: string) =>
      devicesData.get(deviceId)?.data || null,
    getDeviceStatus: (deviceId: string) => devicesData.get(deviceId)?.status,
    getAllActiveDevices: () =>
      Array.from(devicesData.entries())
        .filter(
          ([_, { status }]) => status.connectionStatus === "RECEIVING_DATA"
        )
        .map(([deviceId]) => deviceId),
  };
}

// Enhanced hook for real-time dashboard stats
export function useRealtimeDashboardStats() {
  const { stats, deviceErrors, isConnected } = useDeviceStats();
  const [realtimeStats, setRealtimeStats] = useState({
    ...stats,
    connectionHealth: "good" as "good" | "warning" | "critical",
    systemStatus: "operational" as "operational" | "degraded" | "down",
  });

  useEffect(() => {
    const connectionHealth =
      stats.errorDevices > stats.totalDevices * 0.5
        ? "critical"
        : stats.errorDevices > stats.totalDevices * 0.2
        ? "warning"
        : "good";

    const systemStatus = !isConnected
      ? "down"
      : stats.errorDevices > stats.totalDevices * 0.3
      ? "degraded"
      : "operational";

    setRealtimeStats({
      ...stats,
      connectionHealth,
      systemStatus,
    });
  }, [stats, isConnected]);

  return {
    ...realtimeStats,
    healthScore: Math.max(
      0,
      100 -
        (realtimeStats.errorDevices / Math.max(realtimeStats.totalDevices, 1)) *
          100
    ),
    uptime: isConnected ? "Connected" : "Disconnected",
  };
}
