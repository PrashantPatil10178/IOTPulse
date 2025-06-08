class EnhancedSensorController {
  // Your existing method enhanced
  async getLatestSensorData(req, res) {
    try {
      const { username, deviceId } = req.params;
      const { limit = 10 } = req.query;

      console.log(`📊 Latest sensor data request: ${deviceId} for ${username}`);

      const [user, device] = await Promise.all([
        prisma.user.findFirst({ where: { username } }),
        prisma.device.findFirst({ where: { id: deviceId } }),
      ]);

      if (!user) {
        return res
          .status(404)
          .json(createErrorResponse("User not found.", "USER_NOT_FOUND"));
      }

      if (!device || device.userId !== user.id) {
        return res
          .status(404)
          .json(
            createErrorResponse(
              "Device not found or not owned by user.",
              "DEVICE_NOT_FOUND"
            )
          );
      }

      const sensorData = await prisma.sensorData.findMany({
        where: { deviceId: device.id },
        orderBy: { timestamp: "desc" },
        take: parseInt(limit),
      });

      if (!sensorData.length) {
        return res
          .status(404)
          .json(
            createErrorResponse(
              "No sensor data found for device.",
              "NO_SENSOR_DATA",
              null,
              ["Send some sensor data first", "Check if device is active"]
            )
          );
      }

      // Enhanced response with additional metadata
      const enhancedSensorData = sensorData.map((data) => ({
        ...data,
        // Add formatted timestamp
        formattedTimestamp: new Date(data.timestamp).toISOString(),
        // Add time since reading
        timeSince: this.getTimeSince(data.timestamp),
        // Parse data if it's JSON string
        parsedData: this.parseDataSafely(data.data),
      }));

      console.log(
        `✅ Retrieved ${sensorData.length} sensor readings for device: ${deviceId}`
      );

      return res.json(
        createSuccessResponse(
          {
            device: {
              id: device.id,
              name: device.name,
              type: device.type,
              status: device.status,
              currentLocation: device.currentLocation,
              coordinates:
                device.currentLatitude && device.currentLongitude
                  ? `${device.currentLatitude}, ${device.currentLongitude}`
                  : null,
              lastSeen: device.lastSeen,
              // Add device metadata
              isOnline: this.isDeviceOnline(device.lastSeen),
              connectionStatus: this.getConnectionStatus(
                device.lastSeen,
                device.status
              ),
            },
            dataStructure: DATA_STRUCTURE_TEMPLATES[device.type],
            sensorData: enhancedSensorData,
            totalEntries: sensorData.length,
            latest: enhancedSensorData[0],
            summary: {
              oldestReading: sensorData[sensorData.length - 1]?.timestamp,
              newestReading: sensorData[0]?.timestamp,
              deviceType: device.type,
              readingCount: sensorData.length,
              dataRange: this.calculateDataRange(sensorData),
              averageInterval: this.calculateAverageInterval(sensorData),
            },
            metadata: {
              requestedBy: username,
              requestTime: new Date().toISOString(),
              limit: parseInt(limit),
              apiVersion: "v2",
            },
          },
          `Latest ${device.type} data retrieved successfully`
        )
      );
    } catch (error) {
      console.error(`❌ Error in getLatestSensorData:`, error);
      return res
        .status(500)
        .json(
          createErrorResponse(
            "Internal server error while fetching sensor data",
            "INTERNAL_ERROR",
            error.message
          )
        );
    }
  }

  // NEW: Enhanced historical data endpoint
  async getHistoricalSensorData(req, res) {
    try {
      const { username, deviceId } = req.params;
      const {
        limit = 100,
        startTime,
        endTime,
        timeRange = "24h",
        aggregation = "none",
        metrics = "all",
      } = req.query;

      console.log(`📊 Historical data request: ${deviceId} for ${username}`);
      console.log(`📊 Parameters:`, {
        limit,
        startTime,
        endTime,
        timeRange,
        aggregation,
      });

      // Validate user and device
      const [user, device] = await Promise.all([
        prisma.user.findFirst({ where: { username } }),
        prisma.device.findFirst({ where: { id: deviceId } }),
      ]);

      if (!user) {
        return res
          .status(404)
          .json(createErrorResponse("User not found.", "USER_NOT_FOUND"));
      }

      if (!device || device.userId !== user.id) {
        return res
          .status(404)
          .json(
            createErrorResponse(
              "Device not found or not owned by user.",
              "DEVICE_NOT_FOUND"
            )
          );
      }

      // Calculate time range if not provided
      const timeRanges = this.calculateTimeRange(startTime, endTime, timeRange);

      console.log(
        `📊 Querying data from ${timeRanges.start} to ${timeRanges.end}`
      );

      // Build query conditions
      const whereConditions = {
        deviceId: device.id,
        timestamp: {
          gte: timeRanges.start,
          lte: timeRanges.end,
        },
      };

      // Get total count for pagination info
      const totalCount = await prisma.sensorData.count({
        where: whereConditions,
      });

      // Fetch historical data
      const historicalData = await prisma.sensorData.findMany({
        where: whereConditions,
        orderBy: { timestamp: "asc" }, // Ascending for historical analysis
        take: parseInt(limit),
        select: {
          id: true,
          deviceId: true,
          timestamp: true,
          data: true,
          value: true,
          unit: true,
          sensorType: true,
          batteryLevel: true,
          signalStrength: true,
          createdAt: true,
        },
      });

      console.log(
        `✅ Found ${historicalData.length} historical records out of ${totalCount} total`
      );

      if (!historicalData.length) {
        return res
          .status(404)
          .json(
            createErrorResponse(
              "No historical data found for the specified time range.",
              "NO_HISTORICAL_DATA",
              null,
              [
                "Try expanding the time range",
                "Check if device was active during this period",
                "Verify device has sent data recently",
              ]
            )
          );
      }

      // Transform and enhance data
      const transformedData = historicalData.map((point, index) => {
        const parsedData = this.parseDataSafely(point.data);

        return {
          deviceId: point.deviceId,
          timestamp: point.timestamp.toISOString(),
          data: {
            metrics: {
              primary: {
                name:
                  point.sensorType || this.getPrimaryMetricName(device.type),
                unit: point.unit || this.getDefaultUnit(device.type),
                value: parseFloat(point.value) || 0,
              },
              secondary: this.extractSecondaryMetrics(parsedData, device.type),
            },
            rawData: parsedData,
            template: DATA_STRUCTURE_TEMPLATES[device.type],
            deviceType: device.type,
            visualization: this.getVisualizationConfig(device.type),
          },
          value: point.value,
          unit: point.unit,
          batteryLevel: point.batteryLevel,
          signalStrength: point.signalStrength,
          // Add index for ordering
          sequenceIndex: index,
          // Add time-based metadata
          timeSince: this.getTimeSince(point.timestamp),
          dayOfWeek: this.getDayOfWeek(point.timestamp),
          hourOfDay: point.timestamp.getHours(),
        };
      });

      // Calculate analytics
      const analytics = this.calculateAnalytics(transformedData);

      // Apply aggregation if requested
      const finalData =
        aggregation !== "none"
          ? this.aggregateData(transformedData, aggregation)
          : transformedData;

      const response = {
        device: {
          id: device.id,
          name: device.name,
          type: device.type,
          status: device.status,
          lastSeen: device.lastSeen,
          isOnline: this.isDeviceOnline(device.lastSeen),
        },
        data: finalData,
        pagination: {
          totalRecords: totalCount,
          returnedRecords: finalData.length,
          limit: parseInt(limit),
          hasMore: totalCount > parseInt(limit),
          timeRange: {
            requested: timeRange,
            actual: {
              start: timeRanges.start.toISOString(),
              end: timeRanges.end.toISOString(),
            },
          },
        },
        analytics: {
          ...analytics,
          aggregation,
          dataQuality: this.assessDataQuality(transformedData),
        },
        metadata: {
          requestedBy: username,
          requestTime: new Date().toISOString(),
          processingTime: Date.now() - req.startTime || 0,
          apiVersion: "v2",
        },
      };

      console.log(
        `📈 Returning ${finalData.length} processed data points with analytics`
      );

      return res.json(
        createSuccessResponse(
          response,
          `Historical data retrieved successfully for ${timeRange} period`
        )
      );
    } catch (error) {
      console.error(`❌ Error in getHistoricalSensorData:`, error);
      return res
        .status(500)
        .json(
          createErrorResponse(
            "Internal server error while fetching historical data",
            "INTERNAL_ERROR",
            error.message
          )
        );
    }
  }

  // NEW: Get device analytics summary
  async getDeviceAnalytics(req, res) {
    try {
      const { username, deviceId } = req.params;
      const { timeRange = "24h" } = req.query;

      const [user, device] = await Promise.all([
        prisma.user.findFirst({ where: { username } }),
        prisma.device.findFirst({ where: { id: deviceId } }),
      ]);

      if (!user || !device || device.userId !== user.id) {
        return res
          .status(404)
          .json(
            createErrorResponse(
              "Device not found or access denied",
              "ACCESS_DENIED"
            )
          );
      }

      const timeRanges = this.calculateTimeRange(null, null, timeRange);

      // Get data summary from database
      const summary = await prisma.sensorData.aggregate({
        where: {
          deviceId: device.id,
          timestamp: {
            gte: timeRanges.start,
            lte: timeRanges.end,
          },
        },
        _count: { id: true },
        _avg: { value: true },
        _min: { value: true, timestamp: true },
        _max: { value: true, timestamp: true },
      });

      // Get recent activity
      const recentActivity = await prisma.sensorData.findMany({
        where: {
          deviceId: device.id,
          timestamp: {
            gte: new Date(Date.now() - 60 * 60 * 1000), // Last hour
          },
        },
        orderBy: { timestamp: "desc" },
        take: 10,
      });

      const analytics = {
        device: {
          id: device.id,
          name: device.name,
          type: device.type,
          status: device.status,
          isOnline: this.isDeviceOnline(device.lastSeen),
          lastSeen: device.lastSeen,
        },
        summary: {
          totalReadings: summary._count.id,
          averageValue: summary._avg.value,
          minValue: summary._min.value,
          maxValue: summary._max.value,
          firstReading: summary._min.timestamp,
          lastReading: summary._max.timestamp,
          timeRange: timeRange,
        },
        activity: {
          recentReadings: recentActivity.length,
          isActiveLastHour: recentActivity.length > 0,
          lastActivity: recentActivity[0]?.timestamp || null,
          activityLevel: this.calculateActivityLevel(recentActivity),
        },
        health: {
          dataQuality: this.assessDataQuality(recentActivity),
          connectionStability: this.assessConnectionStability(
            device,
            recentActivity
          ),
          batteryStatus: this.getBatteryStatus(recentActivity),
        },
        metadata: {
          generatedAt: new Date().toISOString(),
          requestedBy: username,
        },
      };

      return res.json(
        createSuccessResponse(
          analytics,
          "Device analytics generated successfully"
        )
      );
    } catch (error) {
      console.error(`❌ Error in getDeviceAnalytics:`, error);
      return res
        .status(500)
        .json(
          createErrorResponse(
            "Failed to generate analytics",
            "ANALYTICS_ERROR",
            error.message
          )
        );
    }
  }

  // Helper Methods

  parseDataSafely(data) {
    if (!data) return null;
    if (typeof data === "object") return data;
    try {
      return JSON.parse(data);
    } catch {
      return { raw: data };
    }
  }

  getTimeSince(timestamp) {
    const now = new Date();
    const past = new Date(timestamp);
    const diffMs = now - past;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    if (diffMins > 0) return `${diffMins}m ago`;
    return "Just now";
  }

  isDeviceOnline(lastSeen) {
    if (!lastSeen) return false;
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return new Date(lastSeen) > fiveMinutesAgo;
  }

  getConnectionStatus(lastSeen, status) {
    if (!lastSeen) return "NEVER_CONNECTED";

    const now = new Date();
    const lastSeenDate = new Date(lastSeen);
    const diffMinutes = (now - lastSeenDate) / (1000 * 60);

    if (diffMinutes <= 2) return "RECEIVING_DATA";
    if (diffMinutes <= 5) return "RECENTLY_ACTIVE";
    if (diffMinutes <= 30) return "IDLE";
    return "DISCONNECTED";
  }

  calculateTimeRange(startTime, endTime, timeRange) {
    const now = new Date();

    if (startTime && endTime) {
      return {
        start: new Date(startTime),
        end: new Date(endTime),
      };
    }

    const timeRangeMap = {
      "1h": 1 * 60 * 60 * 1000,
      "6h": 6 * 60 * 60 * 1000,
      "12h": 12 * 60 * 60 * 1000,
      "24h": 24 * 60 * 60 * 1000,
      "7d": 7 * 24 * 60 * 60 * 1000,
      "30d": 30 * 24 * 60 * 60 * 1000,
    };

    const timeRangeMs = timeRangeMap[timeRange] || timeRangeMap["24h"];

    return {
      start: new Date(now.getTime() - timeRangeMs),
      end: now,
    };
  }

  calculateDataRange(sensorData) {
    if (!sensorData.length) return null;

    const values = sensorData
      .map((d) => parseFloat(d.value))
      .filter((v) => !isNaN(v));

    if (!values.length) return null;

    return {
      min: Math.min(...values),
      max: Math.max(...values),
      range: Math.max(...values) - Math.min(...values),
      average: values.reduce((sum, v) => sum + v, 0) / values.length,
    };
  }

  calculateAverageInterval(sensorData) {
    if (sensorData.length < 2) return null;

    const intervals = [];
    for (let i = 1; i < sensorData.length; i++) {
      const diff =
        new Date(sensorData[i].timestamp) -
        new Date(sensorData[i - 1].timestamp);
      intervals.push(diff);
    }

    const avgMs =
      intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
    return Math.round(avgMs / 1000); // Return in seconds
  }

  getPrimaryMetricName(deviceType) {
    const metricNames = {
      TEMPERATURE_SENSOR: "Temperature",
      HUMIDITY_SENSOR: "Humidity",
      MOTION_DETECTOR: "Motion",
      SMART_LIGHT: "Brightness",
      SMART_PLUG: "Power",
      CAMERA: "Activity",
      ENERGY_METER: "Energy",
      WATER_METER: "Flow",
      AIR_QUALITY_SENSOR: "Air Quality",
    };
    return metricNames[deviceType] || "Value";
  }

  getDefaultUnit(deviceType) {
    const units = {
      TEMPERATURE_SENSOR: "°C",
      HUMIDITY_SENSOR: "%",
      MOTION_DETECTOR: "bool",
      SMART_LIGHT: "lux",
      SMART_PLUG: "W",
      CAMERA: "events",
      ENERGY_METER: "kWh",
      WATER_METER: "L/min",
      AIR_QUALITY_SENSOR: "AQI",
    };
    return units[deviceType] || "";
  }

  extractSecondaryMetrics(parsedData, deviceType) {
    if (!parsedData) return [];

    // Extract secondary metrics based on device type and data structure
    const secondaryMetrics = [];

    if (parsedData.batteryLevel !== undefined) {
      secondaryMetrics.push({
        name: "Battery",
        value: parsedData.batteryLevel,
        unit: "%",
      });
    }

    if (parsedData.signalStrength !== undefined) {
      secondaryMetrics.push({
        name: "Signal",
        value: parsedData.signalStrength,
        unit: "dBm",
      });
    }

    // Device-specific secondary metrics
    switch (deviceType) {
      case "TEMPERATURE_SENSOR":
        if (parsedData.humidity !== undefined) {
          secondaryMetrics.push({
            name: "Humidity",
            value: parsedData.humidity,
            unit: "%",
          });
        }
        break;
      case "ENERGY_METER":
        if (parsedData.voltage !== undefined) {
          secondaryMetrics.push({
            name: "Voltage",
            value: parsedData.voltage,
            unit: "V",
          });
        }
        if (parsedData.current !== undefined) {
          secondaryMetrics.push({
            name: "Current",
            value: parsedData.current,
            unit: "A",
          });
        }
        break;
    }

    return secondaryMetrics;
  }

  getVisualizationConfig(deviceType) {
    const configs = {
      TEMPERATURE_SENSOR: { chartType: "area", color: "#ef4444" },
      HUMIDITY_SENSOR: { chartType: "line", color: "#3b82f6" },
      MOTION_DETECTOR: { chartType: "bar", color: "#8b5cf6" },
      SMART_LIGHT: { chartType: "bar", color: "#f59e0b" },
      SMART_PLUG: { chartType: "area", color: "#10b981" },
      ENERGY_METER: { chartType: "area", color: "#06b6d4" },
    };
    return configs[deviceType] || { chartType: "line", color: "#6b7280" };
  }

  calculateAnalytics(data) {
    if (!data.length) return {};

    const values = data
      .map((d) => d.data.metrics.primary.value)
      .filter((v) => !isNaN(v));

    if (!values.length) return {};

    const sorted = [...values].sort((a, b) => a - b);
    const sum = values.reduce((acc, val) => acc + val, 0);

    return {
      count: values.length,
      average: sum / values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      median: sorted[Math.floor(sorted.length / 2)],
      standardDeviation: this.calculateStandardDeviation(values),
      trend: this.calculateTrend(values),
      dataPoints: data.length,
    };
  }

  calculateStandardDeviation(values) {
    const avg = values.reduce((acc, val) => acc + val, 0) / values.length;
    const squareDiffs = values.map((val) => Math.pow(val - avg, 2));
    const avgSquareDiff =
      squareDiffs.reduce((acc, val) => acc + val, 0) / values.length;
    return Math.sqrt(avgSquareDiff);
  }

  calculateTrend(values) {
    if (values.length < 2) return "insufficient_data";

    const first = values[0];
    const last = values[values.length - 1];
    const change = ((last - first) / first) * 100;

    if (Math.abs(change) < 1) return "stable";
    return change > 0 ? "increasing" : "decreasing";
  }

  getDayOfWeek(timestamp) {
    const days = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    return days[new Date(timestamp).getDay()];
  }

  assessDataQuality(data) {
    if (!data.length) return "no_data";

    const hasValidValues = data.some(
      (d) => d.value !== null && d.value !== undefined
    );
    const hasRecentData = data.some(
      (d) => new Date(d.timestamp) > new Date(Date.now() - 60 * 60 * 1000)
    );

    if (hasValidValues && hasRecentData) return "good";
    if (hasValidValues) return "stale";
    return "poor";
  }

  calculateActivityLevel(recentActivity) {
    const readingsPerHour = recentActivity.length;

    if (readingsPerHour >= 60) return "very_high";
    if (readingsPerHour >= 30) return "high";
    if (readingsPerHour >= 10) return "medium";
    if (readingsPerHour >= 1) return "low";
    return "inactive";
  }

  assessConnectionStability(device, recentActivity) {
    const isOnline = this.isDeviceOnline(device.lastSeen);
    const hasRecentData = recentActivity.length > 0;

    if (isOnline && hasRecentData) return "stable";
    if (isOnline) return "connected_no_data";
    return "unstable";
  }

  getBatteryStatus(recentActivity) {
    const latestWithBattery = recentActivity.find(
      (d) => d.batteryLevel !== null
    );
    if (!latestWithBattery) return "unknown";

    const level = latestWithBattery.batteryLevel;
    if (level >= 80) return "good";
    if (level >= 40) return "medium";
    if (level >= 20) return "low";
    return "critical";
  }

  aggregateData(data, aggregation) {
    // Implementation for data aggregation (hourly, daily, etc.)
    // This is a simplified version - you can enhance based on needs
    switch (aggregation) {
      case "hourly":
        return this.aggregateByHour(data);
      case "daily":
        return this.aggregateByDay(data);
      default:
        return data;
    }
  }

  aggregateByHour(data) {
    const hourlyData = {};

    data.forEach((point) => {
      const hour =
        new Date(point.timestamp).toISOString().slice(0, 13) + ":00:00.000Z";
      if (!hourlyData[hour]) {
        hourlyData[hour] = {
          timestamp: hour,
          values: [],
          data: point.data, // Use structure from first point
        };
      }
      hourlyData[hour].values.push(point.data.metrics.primary.value);
    });

    return Object.values(hourlyData).map((hourData) => ({
      ...hourData.data,
      timestamp: hourData.timestamp,
      data: {
        ...hourData.data,
        metrics: {
          ...hourData.data.metrics,
          primary: {
            ...hourData.data.metrics.primary,
            value:
              hourData.values.reduce((sum, v) => sum + v, 0) /
              hourData.values.length,
          },
        },
      },
    }));
  }

  aggregateByDay(data) {
    // Similar implementation for daily aggregation
    // Implementation details...
    return data; // Simplified for now
  }
}

module.exports = new EnhancedSensorController();
