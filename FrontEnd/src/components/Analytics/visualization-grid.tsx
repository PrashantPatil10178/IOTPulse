"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  BarChart3,
  LineChart,
  AreaChart,
  Grid3X3,
  Maximize2,
} from "lucide-react";
import DataChart from "@/components/dashboard/DataChart";
import { getDeviceIcon, getDeviceColor } from "@/utils/device-utils";

interface VisualizationGridProps {
  devices: any[];
  deviceData: Record<string, any[]>;
  visualizationConfigs: Record<string, any>;
}

export default function VisualizationGrid({
  devices,
  deviceData,
  visualizationConfigs,
}: VisualizationGridProps) {
  const [gridLayout, setGridLayout] = useState<"1" | "2" | "3">("2");
  const [chartTypeOverride, setChartTypeOverride] = useState<
    "auto" | "line" | "area" | "bar"
  >("auto");

  const getChartData = (device: any) => {
    const data = deviceData[device.id] || [];
    return data.map((point) => ({
      timestamp: point.timestamp,
      value: point.data?.metrics?.primary?.value || 0,
      ...(point.data?.metrics?.secondary?.reduce((acc: any, metric: any) => {
        if (metric && metric.name && metric.value !== undefined) {
          acc[metric.name] = metric.value;
        }
        return acc;
      }, {}) || {}),
    }));
  };

  const getChartType = (deviceType: string): "line" | "area" | "bar" => {
    if (chartTypeOverride !== "auto") {
      return chartTypeOverride as "line" | "area" | "bar";
    }

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

  const getGridColumns = () => {
    const colMap = {
      "1": "grid-cols-1",
      "2": "grid-cols-1 lg:grid-cols-2",
      "3": "grid-cols-1 md:grid-cols-2 xl:grid-cols-3",
    };
    return colMap[gridLayout];
  };

  const getCardHeight = () => {
    const heightMap = {
      "1": "h-[600px]",
      "2": "h-[450px]",
      "3": "h-[400px]",
    };
    return heightMap[gridLayout];
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div className="flex items-center gap-2">
              <Grid3X3 className="w-5 h-5" />
              <h2 className="text-2xl font-bold">
                Advanced Device Visualizations
              </h2>
              <Badge variant="outline">{devices.length} Active Devices</Badge>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Maximize2 className="w-4 h-4 text-muted-foreground" />
                <Select
                  value={gridLayout}
                  onValueChange={(value: "1" | "2" | "3") =>
                    setGridLayout(value)
                  }
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 Column</SelectItem>
                    <SelectItem value="2">2 Columns</SelectItem>
                    <SelectItem value="3">3 Columns</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-muted-foreground" />
                <Select
                  value={chartTypeOverride}
                  onValueChange={(value: "auto" | "line" | "area" | "bar") =>
                    setChartTypeOverride(value)
                  }
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Auto (Device-Based)</SelectItem>
                    <SelectItem value="line">
                      <div className="flex items-center gap-2">
                        <LineChart className="w-4 h-4" />
                        Force Line Charts
                      </div>
                    </SelectItem>
                    <SelectItem value="area">
                      <div className="flex items-center gap-2">
                        <AreaChart className="w-4 h-4" />
                        Force Area Charts
                      </div>
                    </SelectItem>
                    <SelectItem value="bar">
                      <div className="flex items-center gap-2">
                        <BarChart3 className="w-4 h-4" />
                        Force Bar Charts
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Visualization Grid */}
      <div className={`grid ${getGridColumns()} gap-6`}>
        {devices.map((device) => {
          const IconComponent = getDeviceIcon(device.type);
          const config = visualizationConfigs[device.type] || {};
          const chartData = getChartData(device);
          const chartType = getChartType(device.type);
          const deviceColor = getDeviceColor(device.type);

          return (
            <Card
              key={device.id}
              className="overflow-hidden border-2 hover:border-primary/20 transition-all duration-200"
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="p-3 rounded-xl shadow-sm"
                      style={{
                        backgroundColor: `${deviceColor}15`,
                        border: `2px solid ${deviceColor}30`,
                      }}
                    >
                      <IconComponent
                        className="w-6 h-6"
                        style={{ color: deviceColor }}
                      />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-bold">
                        {device.name}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {device.type.replace(/_/g, " ")} •{" "}
                        {config?.category || "Generic"}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge
                      variant={
                        device.status === "ONLINE" ? "default" : "secondary"
                      }
                      style={{
                        backgroundColor:
                          device.status === "ONLINE" ? deviceColor : undefined,
                        color: device.status === "ONLINE" ? "white" : undefined,
                      }}
                    >
                      {device.status}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {chartType.charAt(0).toUpperCase() + chartType.slice(1)}
                    </Badge>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-4">
                {chartData.length > 0 ? (
                  <div className="space-y-4">
                    {/* Latest Value Display */}
                    <div
                      className="flex items-center justify-between p-4 rounded-xl shadow-sm"
                      style={{ backgroundColor: `${deviceColor}10` }}
                    >
                      <div>
                        <div className="text-sm text-muted-foreground font-medium">
                          {config?.primaryMetric?.replace(/_/g, " ") ||
                            "Primary Metric"}
                        </div>
                        <div
                          className="text-3xl font-bold"
                          style={{ color: deviceColor }}
                        >
                          {chartData[chartData.length - 1]?.value?.toFixed(2) ||
                            "N/A"}
                          <span className="text-lg text-muted-foreground ml-2">
                            {config?.unit || ""}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">
                          Data Points
                        </div>
                        <div
                          className="text-lg font-bold"
                          style={{ color: deviceColor }}
                        >
                          {chartData.length}
                        </div>
                      </div>
                    </div>

                    {/* Chart Container - Fixed height and proper sizing */}
                    <div className={`w-full ${getCardHeight()} relative`}>
                      <div className="absolute inset-0 p-2">
                        <DataChart
                          title=""
                          description=""
                          data={chartData}
                          type={chartType}
                          colors={[
                            deviceColor,
                            `${deviceColor}80`,
                            `${deviceColor}60`,
                          ]}
                          timeFormat="time"
                          className="w-full h-full"
                        />
                      </div>
                    </div>

                    {/* Secondary Metrics Grid */}
                    {config?.secondaryMetrics &&
                      Array.isArray(config.secondaryMetrics) &&
                      config.secondaryMetrics.length > 0 && (
                        <div className="grid grid-cols-2 gap-3 mt-4">
                          {config.secondaryMetrics
                            .slice(0, 4)
                            .map((metric: string, index: number) => {
                              const latestValue =
                                chartData[chartData.length - 1]?.[metric];
                              const metricColor = `${deviceColor}${
                                80 - index * 15
                              }`;

                              return (
                                <div
                                  key={metric}
                                  className="text-center p-3 rounded-lg border-2"
                                  style={{
                                    backgroundColor: `${deviceColor}08`,
                                    borderColor: `${deviceColor}20`,
                                  }}
                                >
                                  <div className="text-xs text-muted-foreground font-medium mb-1">
                                    {metric.replace(/_/g, " ")}
                                  </div>
                                  <div
                                    className="font-bold text-lg"
                                    style={{ color: metricColor }}
                                  >
                                    {latestValue?.toFixed(1) || "N/A"}
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      )}

                    {/* Device Actions */}
                    <div className="flex justify-center pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        style={{
                          borderColor: `${deviceColor}40`,
                          color: deviceColor,
                        }}
                        className="hover:bg-opacity-10"
                      >
                        View Details
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div
                    className={`${getCardHeight()} flex items-center justify-center text-muted-foreground`}
                  >
                    <div className="text-center space-y-3">
                      <IconComponent className="w-16 h-16 mx-auto opacity-30" />
                      <div>
                        <p className="font-medium">No Data Available</p>
                        <p className="text-sm">
                          Device not sending data via socket
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Summary Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Visualization Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {devices.length}
              </div>
              <div className="text-sm text-blue-700">Total Devices</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {
                  devices.filter((d) => {
                    const data = deviceData[d.id];
                    return data && Array.isArray(data) && data.length > 0;
                  }).length
                }
              </div>
              <div className="text-sm text-green-700">With Data</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {Object.values(deviceData).reduce((sum, data) => {
                  return sum + (Array.isArray(data) ? data.length : 0);
                }, 0)}
              </div>
              <div className="text-sm text-purple-700">Total Data Points</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">
                {new Set(devices.map((d) => d.type)).size}
              </div>
              <div className="text-sm text-orange-700">Device Types</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
