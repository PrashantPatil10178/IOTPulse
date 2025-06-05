"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Database, RefreshCw, Upload } from "lucide-react"
import DeviceStatusCard from "@/components/dashboard/DeviceStatusCard"
import DeviceFilters from "./device-filters"
import DeviceDetails from "./device-details"
import type { Device } from "@/lib/api"

interface DeviceManagementTabProps {
  devices: Device[]
  selectedDevice: Device | null
  onDeviceSelect: (device: Device) => void
  deviceFilters: any
  onFiltersChange: (filters: any) => void
  onRefresh: () => void
  onSyncAll: () => void
  isSyncing: boolean
}

export default function DeviceManagementTab({
  devices,
  selectedDevice,
  onDeviceSelect,
  deviceFilters,
  onFiltersChange,
  onRefresh,
  onSyncAll,
  isSyncing,
}: DeviceManagementTabProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-semibold">Device Management</h2>
          <p className="text-sm text-muted-foreground">
            Real-time status and monitoring of all IoT devices • {devices.length} devices loaded from API
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onRefresh}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={onSyncAll} disabled={isSyncing}>
            <Upload className={`w-4 h-4 mr-2 ${isSyncing ? "animate-spin" : ""}`} />
            Sync All
          </Button>
        </div>
      </div>

      {/* Device Filters */}
      <DeviceFilters filters={deviceFilters} onFiltersChange={onFiltersChange} />

      {/* Device Status Cards Grid */}
      {devices.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {devices.map((device) => (
            <DeviceStatusCard key={device.id} device={device} onSelect={onDeviceSelect} />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-8">
            <div className="text-center space-y-4">
              <Database className="w-12 h-12 text-muted-foreground mx-auto" />
              <div>
                <h3 className="text-lg font-medium">No Devices Found</h3>
                <p className="text-muted-foreground">
                  {deviceFilters.search || deviceFilters.type !== "all" || deviceFilters.status !== "all"
                    ? "No devices match the current filters. Try adjusting your search criteria."
                    : "No devices are registered in your account. Add your first IoT device to get started."}
                </p>
              </div>
              <Button onClick={onRefresh}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh Devices
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Selected Device Details */}
      {selectedDevice && <DeviceDetails device={selectedDevice} />}
    </div>
  )
}
