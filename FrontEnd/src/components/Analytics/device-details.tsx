import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Signal } from "lucide-react"
import { useDeviceData } from "@/context/SocketContext"
import type { Device } from "@/lib/api"

interface DeviceDetailsProps {
  device: Device
}

export default function DeviceDetails({ device }: DeviceDetailsProps) {
  const { data: realtimeData, connectionStatus, lastDataReceived, isLiveDataActive } = useDeviceData(device.id)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Signal className="w-5 h-5" />
          Selected Device: {device.name}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="font-semibold mb-2">Device Information</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Type:</span>
                <span>{device.type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status:</span>
                <Badge variant={device.status === "ONLINE" ? "default" : "secondary"}>{device.status}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Location:</span>
                <span>{device.location || "Not set"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Firmware:</span>
                <span>{device.firmware || "Unknown"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created:</span>
                <span>{new Date(device.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Real-time Data</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                {isLiveDataActive ? (
                  <div className="flex items-center gap-1 text-green-600">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-xs font-medium">Live Data Active</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-orange-600">
                    <span className="text-xs font-medium">No Live Data</span>
                  </div>
                )}
              </div>

              <div className="space-y-2 text-sm">
                {realtimeData?.batteryLevel !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Battery:</span>
                    <span className="font-medium">{realtimeData.batteryLevel}%</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Last Update:</span>
                  <span className="text-xs font-mono">
                    {lastDataReceived ? new Date(lastDataReceived).toLocaleTimeString() : "Never"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Connection:</span>
                  <Badge variant={connectionStatus === "RECEIVING_DATA" ? "default" : "secondary"} className="text-xs">
                    {connectionStatus.replace("_", " ")}
                  </Badge>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <h4 className="font-medium text-sm">Device Actions</h4>
                <div className="flex gap-2 flex-wrap">
                  <Button size="sm" variant="outline">
                    Restart
                  </Button>
                  <Button size="sm" variant="outline">
                    Update
                  </Button>
                  <Button size="sm" variant="outline">
                    Refresh Data
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
