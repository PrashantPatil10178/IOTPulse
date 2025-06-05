import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Database, Activity, Zap, AlertTriangle } from "lucide-react"
import { useDeviceStats } from "@/context/SocketContext"

interface MetricsOverviewProps {
  devices: any[]
  deviceStats: {
    totalDevices: number
    activeDevices: number
    receivingDataDevices: string[]
    errorDevices: number
    devicesByType: Record<string, number>
  }
}

export default function MetricsOverview({ devices, deviceStats }: MetricsOverviewProps) {
  const { stats } = useDeviceStats()

  const dataQuality =
    deviceStats.totalDevices > 0 ? Math.round((deviceStats.activeDevices / deviceStats.totalDevices) * 100) : 0

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Devices</CardTitle>
          <Database className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600">{deviceStats.totalDevices}</div>
          <p className="text-xs text-muted-foreground">
            {Object.keys(deviceStats.devicesByType).length} different types
          </p>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-green-500">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Live Data Active</CardTitle>
          <Activity className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">{deviceStats.receivingDataDevices.length}</div>
          <p className="text-xs text-muted-foreground">Real-time data streams</p>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-purple-500">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Online Devices</CardTitle>
          <Zap className="h-4 w-4 text-purple-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-purple-600">{deviceStats.activeDevices}</div>
          <p className="text-xs text-muted-foreground">{dataQuality}% connectivity</p>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-orange-500">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Device Errors</CardTitle>
          <AlertTriangle className="h-4 w-4 text-orange-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-orange-600">{deviceStats.errorDevices}</div>
          <p className="text-xs text-muted-foreground">
            {deviceStats.errorDevices === 0 ? "All systems normal" : "Needs attention"}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
