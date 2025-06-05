"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Filter, WifiOff, History, RefreshCw, Info, Wifi } from "lucide-react";
import DataChart from "@/components/dashboard/DataChart";
import { useAnalyticsChart } from "@/hooks/use-analytics-chart";
import type { Device } from "@/lib/api";

interface OverviewTabProps {
  devices: Device[];
}

export default function OverviewTab({ devices }: OverviewTabProps) {
  const [selectedDeviceGroup, setSelectedDeviceGroup] = useState<string>("all");
  const [selectedMetric, setSelectedMetric] = useState<string>("temperature");
  const [selectedChartType, setSelectedChartType] = useState<string>("line");

  const { chartData, isLoading, refreshData } = useAnalyticsChart({
    devices,
    selectedDeviceGroup,
    selectedMetric,
  });

  return (
    <div className="space-y-6">
      {/* Chart Controls */}
      <Card>
        <CardHeader className="p-4 pb-0">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            Quick Analytics Controls
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">
                Device Group
              </label>
              <Select
                value={selectedDeviceGroup}
                onValueChange={setSelectedDeviceGroup}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Device Group" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Active Devices</SelectItem>
                  <SelectItem value="sensors">Sensors Only</SelectItem>
                  <SelectItem value="lights">Smart Lights</SelectItem>
                  <SelectItem value="meters">Meters Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Metric</label>
              <Select value={selectedMetric} onValueChange={setSelectedMetric}>
                <SelectTrigger>
                  <SelectValue placeholder="Metric" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="temperature">Temperature</SelectItem>
                  <SelectItem value="humidity">Humidity</SelectItem>
                  <SelectItem value="pressure">Pressure</SelectItem>
                  <SelectItem value="voltage">Voltage</SelectItem>
                  <SelectItem value="current">Current</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">
                Chart Type
              </label>
              <Select
                value={selectedChartType}
                onValueChange={setSelectedChartType}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chart Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="line">Line Chart</SelectItem>
                  <SelectItem value="area">Area Chart</SelectItem>
                  <SelectItem value="bar">Bar Chart</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">
                Data Points ({chartData.data.length})
              </label>
              <div className="flex items-center gap-2 pt-2">
                <div
                  className={`w-2 h-2 rounded-full ${
                    chartData.isLiveData
                      ? "bg-green-500 animate-pulse"
                      : chartData.hasHistoricalFallback
                      ? "bg-blue-500"
                      : "bg-gray-400"
                  }`}
                />
                <span className="text-xs text-muted-foreground">
                  {chartData.isLiveData
                    ? "Live updating"
                    : chartData.hasHistoricalFallback
                    ? "Historical data"
                    : "No data"}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Chart */}
      {chartData.data.length > 0 ? (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">
                  {selectedMetric.charAt(0).toUpperCase() +
                    selectedMetric.slice(1)}{" "}
                  Analytics
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {chartData.isLiveData ? (
                    <>
                      <Wifi className="w-4 h-4 inline mr-1 text-green-500" />
                      Live data from active devices
                    </>
                  ) : chartData.hasHistoricalFallback ? (
                    <>
                      <History className="w-4 h-4 inline mr-1 text-blue-500" />
                      Historical data from{" "}
                      {chartData.devicesWithHistoricalData.length} device(s)
                    </>
                  ) : (
                    "No data available"
                  )}
                </p>
              </div>
              {!chartData.isLiveData && chartData.hasHistoricalFallback && (
                <Alert className="w-auto border-blue-200 bg-blue-50 dark:bg-blue-950/10 p-3">
                  <Info className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-xs text-blue-700 dark:text-blue-400">
                    Live feed unavailable • Showing historical data
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <DataChart
              title=""
              description=""
              data={chartData.data}
              type={selectedChartType as "line" | "area" | "bar"}
              colors={chartData.isLiveData ? ["#10B981"] : ["#3B82F6"]}
              timeFormat={chartData.isLiveData ? "time" : "datetime"}
              className="w-full h-[400px]"
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-8">
            <div className="text-center space-y-4">
              <WifiOff className="w-12 h-12 text-muted-foreground mx-auto" />
              <div>
                <h3 className="text-lg font-medium">No Data Available</h3>
                <p className="text-muted-foreground">
                  No live data or historical data available for the selected
                  devices.
                </p>
              </div>
              <Button onClick={refreshData} disabled={isLoading}>
                <RefreshCw
                  className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
                />
                {isLoading ? "Loading..." : "Retry Data Load"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
