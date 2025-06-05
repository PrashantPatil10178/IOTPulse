"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import NeuralNetworkTopology from "./neural-network-topology";
import RealTimeMetricsGrid from "./real-time-metrics-grid";
import TemporalDataStream from "./temporal-data-stream";

interface AdvancedVisualizationsProps {
  devices: any[];
}

export default function AdvancedVisualizations({
  devices,
}: AdvancedVisualizationsProps) {
  return (
    <div className="space-y-6">
      <Tabs defaultValue="network" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="network">Network Topology</TabsTrigger>
          <TabsTrigger value="metrics">Metrics Dashboard</TabsTrigger>
          <TabsTrigger value="temporal">Temporal Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="network">
          <NeuralNetworkTopology devices={devices} />
        </TabsContent>

        <TabsContent value="metrics">
          <RealTimeMetricsGrid devices={devices} />
        </TabsContent>

        <TabsContent value="temporal">
          <TemporalDataStream devices={devices} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
