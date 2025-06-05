import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Database, Activity, Signal, Zap } from "lucide-react"
import { useSocket } from "@/context/SocketContext"
import type { Device } from "@/lib/api"

interface StatisticsCardsProps {
  devices: Device[]
}

export default function StatisticsCards({ devices }: StatisticsCardsProps) {
  const { getReceivingDataDevices } = useSocket()

  const activeDevices = devices.filter((device) => getReceivingDataDevices().includes(device.id)).length

  const onlineDevices = devices.filter((device) => device.status === "ONLINE").length

  const devicesWithBattery = devices.filter(
    (device) => device.batteryLevel !== null && device.batteryLevel !== undefined,
  )

  const averageBattery =
    devicesWithBattery.length > 0
      ? Math.round(
          devicesWithBattery.reduce((sum, device) => sum + (device.batteryLevel || 0), 0) / devicesWithBattery.length,
        )
      : 0

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Devices</CardTitle>
          <Database className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{devices.length}</div>
          <p className="text-xs text-muted-foreground">Registered in system</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Live Data Active</CardTitle>
          <Activity className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">{activeDevices}</div>
          <p className="text-xs text-muted-foreground">Sending real-time data</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Online Status</CardTitle>
          <Signal className="h-4 w-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600">{onlineDevices}</div>
          <p className="text-xs text-muted-foreground">Devices marked online</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Avg Battery</CardTitle>
          <Zap className="h-4 w-4 text-amber-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-amber-600">{averageBattery}%</div>
          <p className="text-xs text-muted-foreground">Battery powered devices</p>
        </CardContent>
      </Card>
    </div>
  )
}
