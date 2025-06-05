"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Download, RefreshCw, PieChart, Activity, CheckCircle } from "lucide-react"
import { useSocket } from "@/context/SocketContext"
import type { Device } from "@/lib/api"

interface AdvancedChartsTabProps {
  devices: Device[]
  onExport: () => void
  onRefresh: () => void
}

export default function AdvancedChartsTab({ devices, onExport, onRefresh }: AdvancedChartsTabProps) {
  const { getReceivingDataDevices, isConnected } = useSocket()

  const deviceStats = {
    totalDevices: devices.length,
    activeDevices: getReceivingDataDevices().length,
    onlineDevices: devices.filter((d) => d.status === "ONLINE").length,
    deviceTypeDistribution: devices.reduce(
      (acc, device) => {
        acc[device.type] = (acc[device.type] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    ),
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-semibold">Advanced Analytics Charts</h2>
          <p className="text-sm text-muted-foreground">
            Comprehensive visualization and insights across all device metrics
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onExport}>
            <Download className="w-4 h-4 mr-2" />
            Export Charts Data
          </Button>
          <Button variant="outline" onClick={onRefresh}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh Data
          </Button>
        </div>
      </div>

      {/* Device Type Distribution Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="w-5 h-5" />
              Device Type Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(deviceStats.deviceTypeDistribution).map(([type, count], index) => (
                <div key={type} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-4 h-4 rounded ${
                        index === 0
                          ? "bg-blue-500"
                          : index === 1
                            ? "bg-green-500"
                            : index === 2
                              ? "bg-yellow-500"
                              : "bg-purple-500"
                      }`}
                    />
                    <span className="text-sm font-medium">{type.replace("_", " ")}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold">{count}</div>
                    <div className="text-xs text-muted-foreground">
                      {Math.round((count / deviceStats.totalDevices) * 100)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Connection Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center space-y-2">
                <div className="flex items-center justify-center gap-2">
                  <Activity className="w-4 h-4" />
                  <span className="text-sm font-medium">Active</span>
                </div>
                <div className="text-2xl font-bold">{deviceStats.activeDevices}</div>
                <div className="w-full h-2 rounded-full bg-green-500" />
              </div>
              <div className="text-center space-y-2">
                <div className="flex items-center justify-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm font-medium">Online</span>
                </div>
                <div className="text-2xl font-bold">{deviceStats.onlineDevices}</div>
                <div className="w-full h-2 rounded-full bg-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Health Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            System Health Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium">Device Overview</h4>
              <div className="text-sm text-muted-foreground space-y-1">
                <div>Total Devices: {deviceStats.totalDevices}</div>
                <div>Active Data Sources: {deviceStats.activeDevices}</div>
                <div>Online Devices: {deviceStats.onlineDevices}</div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">System Status</h4>
              <div className="text-sm text-muted-foreground space-y-1">
                <div>Socket: {isConnected ? "Connected" : "Disconnected"}</div>
                <div>API: Connected</div>
                <div>
                  Uptime: {Math.round((deviceStats.onlineDevices / Math.max(deviceStats.totalDevices, 1)) * 100)}%
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">Data Quality</h4>
              <div className="text-sm text-muted-foreground space-y-1">
                <div>Live Sources: {deviceStats.activeDevices}</div>
                <div>
                  Data Coverage:{" "}
                  {deviceStats.totalDevices > 0
                    ? Math.round((deviceStats.activeDevices / deviceStats.totalDevices) * 100)
                    : 0}
                  %
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">Export Options</h4>
              <div className="space-y-2">
                <Button size="sm" variant="outline" onClick={onExport} className="w-full">
                  <Download className="w-4 h-4 mr-2" />
                  Export All Data
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
