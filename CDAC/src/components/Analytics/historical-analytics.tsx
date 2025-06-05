"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  History,
  TrendingUp,
  Calendar,
  BarChart3,
  LineChart,
  AreaChart,
} from "lucide-react";
import DataChart from "@/components/dashboard/DataChart";
import { useHistoricalData } from "@/hooks/use-historical-data";
import {
  getDeviceIcon,
  getDeviceColor,
  getDeviceGradient,
} from "@/utils/device-utils";

interface HistoricalAnalyticsProps {
  devices: any[];
  username: string;
  timeRange: string;
  onTimeRangeChange: (range: string) => void;
}

export default function HistoricalAnalytics({
  devices,
  username,
  timeRange,
  onTimeRangeChange,
}: HistoricalAnalyticsProps) {
  const [selectedDevice, setSelectedDevice] = useState<string>("all");
  const [dataLimit, setDataLimit] = useState("100");
  const [chartType, setChartType] = useState<"line" | "area" | "bar">("area");

  const { historicalData, isLoading, fetchHistoricalData } =
    useHistoricalData(username);

  useEffect(() => {
    if (devices.length > 0) {
      devices.forEach((device) => {
        fetchHistoricalData(device.id, Number.parseInt(dataLimit));
      });
    }
  }, [devices, dataLimit, fetchHistoricalData]);

  const getAnalyticsData = () => {
    if (selectedDevice === "all") {
      // Combine data from all devices
      const combinedData: any[] = [];
      const timePoints = new Set<string>();

      devices.forEach((device) => {
        const data = historicalData[device.id] || [];
        data.forEach((point) => timePoints.add(point.timestamp));
      });

      Array.from(timePoints)
        .sort()
        .forEach((timestamp) => {
          const dataPoint: any = { timestamp };

          devices.forEach((device, index) => {
            const data = historicalData[device.id] || [];
            const point = data.find((p) => p.timestamp === timestamp);
            if (point?.data?.metrics?.primary?.value !== undefined) {
              dataPoint[device.name] = point.data.metrics.primary.value;
            }
          });

          if (Object.keys(dataPoint).length > 1) {
            // More than just timestamp
            combinedData.push(dataPoint);
          }
        });

      return combinedData;
    } else {
      // Single device data with secondary metrics
      const data = historicalData[selectedDevice] || [];
      return data.map((point) => {
        const dataPoint: any = {
          timestamp: point.timestamp,
          [point.data?.metrics?.primary?.name || "Primary"]:
            point.data?.metrics?.primary?.value || 0,
        };

        // Add secondary metrics with different colors
        if (
          point.data?.metrics?.secondary &&
          Array.isArray(point.data.metrics.secondary)
        ) {
          point.data.metrics.secondary.forEach((metric: any) => {
            if (metric.name && metric.value !== undefined) {
              dataPoint[metric.name] = metric.value;
            }
          });
        }

        return dataPoint;
      });
    }
  };

  const analyticsData = getAnalyticsData();

  // Get chart colors based on device types and metrics
  const getChartColors = () => {
    if (selectedDevice === "all") {
      return devices.map((device) => getDeviceColor(device.type));
    } else {
      const device = devices.find((d) => d.id === selectedDevice);
      if (!device) return ["#3B82F6"];

      const deviceGradient = getDeviceGradient(device.type);
      const data = historicalData[selectedDevice] || [];

      if (data.length > 0) {
        const samplePoint = data[0];
        const colors = [deviceGradient[0]]; // Primary metric color

        // Add colors for secondary metrics
        if (
          samplePoint.data?.metrics?.secondary &&
          Array.isArray(samplePoint.data.metrics.secondary)
        ) {
          samplePoint.data.metrics.secondary.forEach(
            (metric: any, index: number) => {
              if (metric.name && metric.value !== undefined) {
                colors.push(
                  deviceGradient[Math.min(index + 1, deviceGradient.length - 1)]
                );
              }
            }
          );
        }

        return colors;
      }

      return deviceGradient;
    }
  };

  // Get device-specific chart type
  const getDeviceChartType = (deviceType: string): "line" | "area" | "bar" => {
    const chartTypeMap: Record<string, "line" | "area" | "bar"> = {
      TEMPERATURE_SENSOR: "area",
      HUMIDITY_SENSOR: "line",
      MOTION_DETECTOR: "bar",
      SMART_LIGHT: "bar",
      SMART_PLUG: "area",
      CAMERA: "bar",
      ENERGY_METER: "area",
      WATER_METER: "line",
      AIR_QUALITY_SENSOR: "area",
      OTHER: "line",
    };
    return chartTypeMap[deviceType] || "line";
  };

  // Calculate trends and statistics
  const getStatistics = () => {
    if (analyticsData.length < 2) return null;

    const values =
      selectedDevice === "all"
        ? (analyticsData.flatMap((d) =>
            Object.values(d).filter((v) => typeof v === "number")
          ) as number[])
        : analyticsData
            .map((d) => {
              const numericValues = Object.values(d).filter(
                (v) => typeof v === "number"
              ) as number[];
              return numericValues[0] || 0; // Use primary metric for single device stats
            })
            .filter((v) => v !== undefined);

    if (values.length === 0) return null;

    const latest = values[values.length - 1];
    const previous = values[values.length - 2];
    const change = latest - previous;
    const changePercent = previous !== 0 ? (change / previous) * 100 : 0;

    return {
      latest,
      change,
      changePercent,
      min: Math.min(...values),
      max: Math.max(...values),
      avg: values.reduce((sum, v) => sum + v, 0) / values.length,
      dataPoints: analyticsData.length,
    };
  };

  const statistics = getStatistics();
  const selectedDeviceObj = devices.find((d) => d.id === selectedDevice);
  const defaultChartType = selectedDeviceObj
    ? getDeviceChartType(selectedDeviceObj.type)
    : chartType;

  // Get metric names for legend
  const getMetricNames = () => {
    if (analyticsData.length === 0) return [];
    const sampleData = analyticsData[0];
    return Object.keys(sampleData).filter((key) => key !== "timestamp");
  };

  const metricNames = getMetricNames();

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <CardTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              Historical Analytics & Multi-Metric Visualization
            </CardTitle>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <Select
                  value={selectedDevice}
                  onValueChange={setSelectedDevice}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      All Devices (Multi-Series)
                    </SelectItem>
                    {devices.map((device) => {
                      const IconComponent = getDeviceIcon(device.type);
                      return (
                        <SelectItem key={device.id} value={device.id}>
                          <div className="flex items-center gap-2">
                            <IconComponent className="w-4 h-4" />
                            {device.name}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-muted-foreground" />
                <Select
                  value={chartType}
                  onValueChange={(value: "line" | "area" | "bar") =>
                    setChartType(value)
                  }
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="line">
                      <div className="flex items-center gap-2">
                        <LineChart className="w-4 h-4" />
                        Line Chart
                      </div>
                    </SelectItem>
                    <SelectItem value="area">
                      <div className="flex items-center gap-2">
                        <AreaChart className="w-4 h-4" />
                        Area Chart
                      </div>
                    </SelectItem>
                    <SelectItem value="bar">
                      <div className="flex items-center gap-2">
                        <BarChart3 className="w-4 h-4" />
                        Bar Chart
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Select value={dataLimit} onValueChange={setDataLimit}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="50">50 Points</SelectItem>
                  <SelectItem value="100">100 Points</SelectItem>
                  <SelectItem value="200">200 Points</SelectItem>
                  <SelectItem value="500">500 Points</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Latest Value</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {statistics.latest.toFixed(2)}
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card
            className={`border-l-4 ${
              statistics.change >= 0 ? "border-l-green-500" : "border-l-red-500"
            }`}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Change</p>
                  <p
                    className={`text-2xl font-bold ${
                      statistics.change >= 0 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {statistics.change >= 0 ? "+" : ""}
                    {statistics.change.toFixed(2)}
                  </p>
                  <p
                    className={`text-xs ${
                      statistics.changePercent >= 0
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {statistics.changePercent.toFixed(1)}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <CardContent className="p-4">
              <div>
                <p className="text-sm text-muted-foreground">Range</p>
                <p className="text-lg font-bold text-purple-600">
                  {statistics.min.toFixed(1)} - {statistics.max.toFixed(1)}
                </p>
                <p className="text-sm text-muted-foreground">
                  Avg: {statistics.avg.toFixed(2)}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-orange-500">
            <CardContent className="p-4">
              <div>
                <p className="text-sm text-muted-foreground">Data Points</p>
                <p className="text-2xl font-bold text-orange-600">
                  {statistics.dataPoints}
                </p>
                <Badge variant="outline" className="mt-1">
                  {dataLimit} limit
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Metrics Legend */}
      {selectedDevice !== "all" && metricNames.length > 1 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Metrics Legend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {metricNames.map((metric, index) => {
                const colors = getChartColors();
                const color = colors[index] || colors[0];
                return (
                  <div key={metric} className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-sm font-medium capitalize">
                      {metric.replace(/_/g, " ")}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Historical Chart */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              {selectedDevice === "all" ? (
                <>
                  <BarChart3 className="w-5 h-5" />
                  Multi-Device Historical Comparison
                </>
              ) : (
                <>
                  {(() => {
                    const IconComponent = getDeviceIcon(
                      selectedDeviceObj?.type || "OTHER"
                    );
                    return (
                      <IconComponent
                        className="w-5 h-5"
                        style={{
                          color: getDeviceColor(
                            selectedDeviceObj?.type || "OTHER"
                          ),
                        }}
                      />
                    );
                  })()}
                  {selectedDeviceObj?.name} - Multi-Metric Analysis
                </>
              )}
            </CardTitle>

            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                style={{
                  backgroundColor: `${getChartColors()[0]}20`,
                  borderColor: getChartColors()[0],
                  color: getChartColors()[0],
                }}
              >
                {selectedDevice === "all"
                  ? `${devices.length} Devices`
                  : `${metricNames.length} Metrics`}
              </Badge>
              <Badge variant="secondary">
                {chartType.charAt(0).toUpperCase() + chartType.slice(1)} Chart
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          {analyticsData.length > 0 ? (
            <div className="w-full">
              <DataChart
                title=""
                description=""
                data={analyticsData}
                type={chartType}
                colors={getChartColors()}
                timeFormat="datetime"
                className="w-full h-[500px]"
              />
            </div>
          ) : (
            <div className="h-[500px] flex items-center justify-center text-muted-foreground">
              <div className="text-center space-y-4">
                <History className="w-16 h-16 mx-auto opacity-50" />
                <div>
                  <h3 className="text-lg font-medium">
                    No Historical Data Available
                  </h3>
                  <p className="text-sm">
                    Data is automatically loaded via socket connection
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {isLoading
                      ? "Loading data..."
                      : "Waiting for socket data..."}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Device-Specific Charts Grid */}
      {selectedDevice === "all" && devices.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold">Individual Device Analytics</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {devices.map((device) => {
              const deviceData = historicalData[device.id] || [];
              const chartData = deviceData.map((point) => {
                const dataPoint: any = {
                  timestamp: point.timestamp,
                  [point.data?.metrics?.primary?.name || "Primary"]:
                    point.data?.metrics?.primary?.value || 0,
                };

                // Add secondary metrics
                if (
                  point.data?.metrics?.secondary &&
                  Array.isArray(point.data.metrics.secondary)
                ) {
                  point.data.metrics.secondary.forEach((metric: any) => {
                    if (metric.name && metric.value !== undefined) {
                      dataPoint[metric.name] = metric.value;
                    }
                  });
                }

                return dataPoint;
              });

              const IconComponent = getDeviceIcon(device.type);
              const deviceColors = getDeviceGradient(device.type);
              const deviceChartType = getDeviceChartType(device.type);

              return (
                <Card key={device.id} className="overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="p-2 rounded-lg"
                          style={{ backgroundColor: `${deviceColors[0]}20` }}
                        >
                          <IconComponent
                            className="w-5 h-5"
                            style={{ color: deviceColors[0] }}
                          />
                        </div>
                        <div>
                          <CardTitle className="text-lg">
                            {device.name}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground">
                            {device.type.replace(/_/g, " ")}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        style={{
                          backgroundColor: `${deviceColors[0]}20`,
                          borderColor: deviceColors[0],
                          color: deviceColors[0],
                        }}
                      >
                        {deviceChartType.charAt(0).toUpperCase() +
                          deviceChartType.slice(1)}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="p-4">
                    {chartData.length > 0 ? (
                      <div className="w-full">
                        <DataChart
                          title=""
                          description=""
                          data={chartData}
                          type={deviceChartType}
                          colors={deviceColors}
                          timeFormat="datetime"
                          className="w-full h-[300px]"
                        />
                        <div className="mt-3 text-center">
                          <Badge variant="secondary" className="text-xs">
                            {chartData.length} data points
                          </Badge>
                        </div>
                      </div>
                    ) : (
                      <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                        <div className="text-center">
                          <IconComponent className="w-12 h-12 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">No data available</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
