"use client"

import { Button } from "@/components/ui/button"
import { CheckCircle, XCircle, AlertTriangle, RefreshCw, Download } from "lucide-react"
import { useSocket, useDeviceStats } from "@/context/SocketContext"
import type { Device } from "@/lib/api"

interface ConnectionStatusProps {
  devices: Device[]
  onSyncAll: () => void
  onExport: () => void
  isSyncing: boolean
}

export default function ConnectionStatus({ devices, onSyncAll, onExport, isSyncing }: ConnectionStatusProps) {
  const { isConnected, getReceivingDataDevices } = useSocket()
  const { deviceErrors } = useDeviceStats()

  const activeDevices = getReceivingDataDevices().length
  const totalDevices = devices.length

  return (
    <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
      <div className="flex items-center gap-2">
        {isConnected ? (
          <CheckCircle className="w-5 h-5 text-green-500" />
        ) : (
          <XCircle className="w-5 h-5 text-red-500" />
        )}
        <span className="text-sm font-medium">{isConnected ? "Connected" : "Disconnected"}</span>
      </div>

      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${activeDevices > 0 ? "bg-green-500 animate-pulse" : "bg-gray-400"}`} />
        <span className="text-sm text-muted-foreground">
          {activeDevices} / {totalDevices} devices active
        </span>
      </div>

      {deviceErrors.length > 0 && (
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          <span className="text-sm text-amber-600">{deviceErrors.length} device errors</span>
        </div>
      )}

      <div className="flex gap-2 ml-auto">
        <Button variant="outline" size="sm" onClick={onExport}>
          <Download className="w-4 h-4 mr-2" />
          Export
        </Button>
        <Button variant="outline" size="sm" onClick={onSyncAll} disabled={isSyncing}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing ? "animate-spin" : ""}`} />
          {isSyncing ? "Syncing..." : "Sync All"}
        </Button>
      </div>
    </div>
  )
}
