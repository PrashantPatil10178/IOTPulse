"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useDeviceData, useDeviceStats } from "@/context/SocketContext";
import {
  Network,
  Maximize2,
  Minimize2,
  Play,
  Pause,
  RotateCcw,
} from "lucide-react";
import * as d3 from "d3";

interface NetworkNode {
  id: string;
  name: string;
  type: string;
  x: number;
  y: number;
  fx?: number | null;
  fy?: number | null;
  value: number;
  status: string;
  connections: string[];
  vx?: number;
  vy?: number;
}

interface NetworkLink {
  source: NetworkNode | string;
  target: NetworkNode | string;
  strength: number;
  dataFlow: number;
}

interface NeuralNetworkTopologyProps {
  devices: any[];
}

export default function NeuralNetworkTopology({
  devices,
}: NeuralNetworkTopologyProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const simulationRef = useRef<d3.Simulation<NetworkNode, NetworkLink> | null>(
    null
  );
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const { stats } = useDeviceStats();
  const [deviceDataMap, setDeviceDataMap] = useState<Record<string, any>>({});

  // Hook calls for each device
  const deviceDataHooks = devices.map((device) => useDeviceData(device.id));

  // Detect dark mode
  useEffect(() => {
    const checkDarkMode = () => {
      setIsDarkMode(document.documentElement.classList.contains("dark"));
    };

    checkDarkMode();
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  // Build device data map
  useEffect(() => {
    const newDataMap: Record<string, any> = {};

    devices.forEach((device, index) => {
      const deviceHookData = deviceDataHooks[index];
      newDataMap[device.id] = {
        data: deviceHookData.data,
        connectionStatus: deviceHookData.connectionStatus,
        isLiveDataActive: deviceHookData.isLiveDataActive,
        value: deviceHookData.data?.data?.metrics?.primary?.value || 0,
      };
    });

    setDeviceDataMap(newDataMap);
  }, [devices, deviceDataHooks]);

  const getStatusColor = useCallback(
    (status: string) => {
      switch (status) {
        case "RECEIVING_DATA":
          return isDarkMode ? "#22c55e" : "#16a34a";
        case "ERROR":
          return isDarkMode ? "#ef4444" : "#dc2626";
        case "NOT_CONNECTED":
          return isDarkMode ? "#f59e0b" : "#d97706";
        default:
          return isDarkMode ? "#64748b" : "#475569";
      }
    },
    [isDarkMode]
  );

  const resetSimulation = useCallback(() => {
    if (simulationRef.current) {
      simulationRef.current.alpha(1).restart();
    }
  }, []);

  const togglePause = useCallback(() => {
    if (simulationRef.current) {
      if (isPaused) {
        simulationRef.current.alpha(0.3).restart();
      } else {
        simulationRef.current.stop();
      }
      setIsPaused(!isPaused);
    }
  }, [isPaused]);

  useEffect(() => {
    if (!svgRef.current || devices.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = isFullscreen ? window.innerWidth - 100 : 800;
    const height = isFullscreen ? window.innerHeight - 200 : 500;
    const centerX = width / 2;
    const centerY = height / 2;

    // Create nodes with stable positioning
    const nodes: NetworkNode[] = devices.map((device, index) => {
      const deviceData = deviceDataMap[device.id];
      const angle = (index / devices.length) * 2 * Math.PI;
      const radius = Math.min(width, height) * 0.25;

      return {
        id: device.id,
        name: device.name,
        type: device.type,
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
        fx: null,
        fy: null,
        value: deviceData?.value || 0,
        status: deviceData?.connectionStatus || "NOT_CONNECTED",
        connections: [],
      };
    });

    // Create intelligent links
    const links: NetworkLink[] = [];
    const maxConnections = Math.min(3, devices.length - 1);

    nodes.forEach((node, i) => {
      let connectionCount = 0;
      nodes.forEach((otherNode, j) => {
        if (i !== j && connectionCount < maxConnections) {
          const sameType = node.type === otherNode.type;
          const distance = Math.sqrt(
            Math.pow(node.x - otherNode.x, 2) +
              Math.pow(node.y - otherNode.y, 2)
          );

          if (sameType || distance < 200 || connectionCount < 1) {
            const deviceData1 = deviceDataMap[node.id];
            const deviceData2 = deviceDataMap[otherNode.id];

            links.push({
              source: node.id,
              target: otherNode.id,
              strength: sameType ? 0.4 : 0.2,
              dataFlow: Math.abs(
                (deviceData1?.value || 0) - (deviceData2?.value || 0)
              ),
            });
            connectionCount++;
          }
        }
      });
    });

    // Create force simulation with reduced movement
    simulationRef.current = d3
      .forceSimulation(nodes)
      .force(
        "link",
        d3
          .forceLink(links)
          .id((d: any) => d.id)
          .strength(0.1)
          .distance(100)
      )
      .force("charge", d3.forceManyBody().strength(-100))
      .force("center", d3.forceCenter(centerX, centerY))
      .force("collision", d3.forceCollide().radius(40))
      .velocityDecay(0.8)
      .alphaDecay(0.05);

    // Create gradient definitions
    const defs = svg.append("defs");

    links.forEach((link, index) => {
      const gradient = defs
        .append("linearGradient")
        .attr("id", `gradient-${index}`)
        .attr("gradientUnits", "userSpaceOnUse");

      gradient
        .append("stop")
        .attr("offset", "0%")
        .attr("stop-color", isDarkMode ? "#3b82f6" : "#2563eb")
        .attr("stop-opacity", 0.8);
      gradient
        .append("stop")
        .attr("offset", "100%")
        .attr("stop-color", isDarkMode ? "#8b5cf6" : "#7c3aed")
        .attr("stop-opacity", 0.2);
    });

    // Create container group
    const container = svg.append("g");

    // Add zoom behavior
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 3])
      .on("zoom", (event) => {
        container.attr("transform", event.transform);
      });

    svg.call(zoom);

    // Create links
    const linkElements = container
      .selectAll(".link")
      .data(links)
      .enter()
      .append("line")
      .attr("class", "link")
      .attr("stroke", (d, i) => `url(#gradient-${i})`)
      .attr("stroke-width", (d) => Math.max(1, Math.min(4, d.dataFlow / 20)))
      .attr("opacity", 0.6)
      .style("transition", "opacity 0.3s ease");

    // Create nodes
    const nodeElements = container
      .selectAll(".node")
      .data(nodes)
      .enter()
      .append("g")
      .attr("class", "node")
      .style("cursor", "pointer")
      .call(
        d3
          .drag<SVGGElement, NetworkNode>()
          .on("start", (event, d) => {
            if (!event.active && simulationRef.current) {
              simulationRef.current.alphaTarget(0.3).restart();
            }
            d.fx = d.x;
            d.fy = d.y;
          })
          .on("drag", (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on("end", (event, d) => {
            if (!event.active && simulationRef.current) {
              simulationRef.current.alphaTarget(0);
            }
            d.fx = null;
            d.fy = null;
          })
      );

    // Add node backgrounds for better visibility
    nodeElements
      .append("circle")
      .attr("r", 22)
      .attr("fill", isDarkMode ? "rgba(0,0,0,0.3)" : "rgba(255,255,255,0.9)")
      .attr("stroke", isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)")
      .attr("stroke-width", 1);

    // Add node circles
    const nodeCircles = nodeElements
      .append("circle")
      .attr("r", (d) => 15 + Math.min(10, (d.value / 100) * 5))
      .attr("fill", (d) => getStatusColor(d.status))
      .attr("stroke", isDarkMode ? "#ffffff" : "#000000")
      .attr("stroke-width", 2)
      .style("filter", "drop-shadow(0px 2px 6px rgba(0,0,0,0.2))")
      .style("transition", "all 0.3s ease");

    // Add pulsing effect for active nodes (less aggressive)
    nodeElements
      .filter((d) => d.status === "RECEIVING_DATA")
      .append("circle")
      .attr("r", (d) => 15 + Math.min(10, (d.value / 100) * 5))
      .attr("fill", "none")
      .attr("stroke", getStatusColor("RECEIVING_DATA"))
      .attr("stroke-width", 1)
      .attr("opacity", 0)
      .style("animation", "pulse 3s infinite");

    // Add node labels with better positioning
    nodeElements
      .append("text")
      .attr("dy", 40)
      .attr("text-anchor", "middle")
      .style("font-size", "11px")
      .style("font-weight", "500")
      .style("fill", isDarkMode ? "#e2e8f0" : "#374151")
      .style(
        "text-shadow",
        isDarkMode ? "0 0 3px rgba(0,0,0,0.8)" : "0 0 3px rgba(255,255,255,0.8)"
      )
      .text((d) =>
        d.name.length > 12 ? d.name.substring(0, 12) + "..." : d.name
      );

    // Add value labels
    nodeElements
      .append("text")
      .attr("dy", 4)
      .attr("text-anchor", "middle")
      .style("font-size", "9px")
      .style("font-weight", "bold")
      .style("fill", "#ffffff")
      .style("text-shadow", "0 0 2px rgba(0,0,0,0.8)")
      .text((d) => d.value.toFixed(1));

    // Add click handlers with smooth transitions
    nodeElements.on("click", (event, d) => {
      const isCurrentlySelected = selectedNode === d.id;
      setSelectedNode(isCurrentlySelected ? null : d.id);

      nodeElements
        .transition()
        .duration(300)
        .style("opacity", (node) => {
          if (isCurrentlySelected) return 1;
          const isConnected = links.some(
            (link) =>
              (typeof link.source === "object" &&
                link.source.id === d.id &&
                typeof link.target === "object" &&
                link.target.id === node.id) ||
              (typeof link.target === "object" &&
                link.target.id === d.id &&
                typeof link.source === "object" &&
                link.source.id === node.id) ||
              (typeof link.source === "string" &&
                link.source === d.id &&
                typeof link.target === "string" &&
                link.target === node.id) ||
              (typeof link.target === "string" &&
                link.target === d.id &&
                typeof link.source === "string" &&
                link.source === node.id)
          );
          return isConnected || node.id === d.id ? 1 : 0.3;
        });

      linkElements
        .transition()
        .duration(300)
        .style("opacity", (link) => {
          if (isCurrentlySelected) return 0.6;
          const sourceId =
            typeof link.source === "object" ? link.source.id : link.source;
          const targetId =
            typeof link.target === "object" ? link.target.id : link.target;
          return sourceId === d.id || targetId === d.id ? 1 : 0.1;
        });
    });

    // Update positions with smoother transitions
    simulationRef.current.on("tick", () => {
      // Constrain nodes to viewport
      nodes.forEach((d) => {
        d.x = Math.max(30, Math.min(width - 30, d.x!));
        d.y = Math.max(30, Math.min(height - 30, d.y!));
      });

      linkElements
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      nodeElements.attr("transform", (d) => `translate(${d.x},${d.y})`);
    });

    // Add improved legend
    const legend = svg.append("g").attr("transform", "translate(20, 20)");

    const legendData = [
      {
        color: getStatusColor("RECEIVING_DATA"),
        label: "Active",
        status: "RECEIVING_DATA",
      },
      {
        color: getStatusColor("NOT_CONNECTED"),
        label: "Idle",
        status: "NOT_CONNECTED",
      },
      { color: getStatusColor("ERROR"), label: "Error", status: "ERROR" },
      {
        color: getStatusColor("DISCONNECTED"),
        label: "Offline",
        status: "DISCONNECTED",
      },
    ];

    // Legend background
    legend
      .append("rect")
      .attr("x", -10)
      .attr("y", -10)
      .attr("width", 120)
      .attr("height", legendData.length * 25 + 15)
      .attr("fill", isDarkMode ? "rgba(0,0,0,0.7)" : "rgba(255,255,255,0.9)")
      .attr("stroke", isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)")
      .attr("rx", 6);

    legend
      .selectAll(".legend-item")
      .data(legendData)
      .enter()
      .append("g")
      .attr("class", "legend-item")
      .attr("transform", (d, i) => `translate(0, ${i * 25})`)
      .each(function (d) {
        const item = d3.select(this);
        item.append("circle").attr("r", 6).attr("fill", d.color);
        item
          .append("text")
          .attr("x", 15)
          .attr("dy", "0.35em")
          .style("font-size", "12px")
          .style("fill", isDarkMode ? "#e2e8f0" : "#374151")
          .text(d.label);
      });

    // Stop simulation after initial positioning
    setTimeout(() => {
      if (simulationRef.current) {
        simulationRef.current.alpha(0);
      }
    }, 3000);
  }, [
    devices,
    deviceDataMap,
    selectedNode,
    isFullscreen,
    isDarkMode,
    getStatusColor,
  ]);

  return (
    <>
      <style>{`
        @keyframes pulse {
          0%,
          100% {
            opacity: 0;
            transform: scale(1);
          }
          50% {
            opacity: 0.6;
            transform: scale(1.2);
          }
        }
      `}</style>
      <Card
        className={`transition-all duration-300 ${
          isFullscreen ? "fixed inset-4 z-50 shadow-2xl" : ""
        } ${isDarkMode ? "bg-gray-900 border-gray-700" : "bg-white"}`}
      >
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Network
                className={`w-5 h-5 ${
                  isDarkMode ? "text-blue-400" : "text-blue-600"
                }`}
              />
              <div>
                <CardTitle
                  className={isDarkMode ? "text-gray-100" : "text-gray-900"}
                >
                  Device Network Topology
                </CardTitle>
                <p
                  className={`text-sm ${
                    isDarkMode ? "text-gray-400" : "text-gray-600"
                  }`}
                >
                  Interactive network visualization with real-time data flow
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={isDarkMode ? "border-gray-600 text-gray-300" : ""}
              >
                {stats.receivingDataDevices.length} Active Nodes
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={togglePause}
                className={
                  isDarkMode
                    ? "border-gray-600 text-gray-300 hover:bg-gray-800"
                    : ""
                }
              >
                {isPaused ? (
                  <Play className="w-4 h-4" />
                ) : (
                  <Pause className="w-4 h-4" />
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={resetSimulation}
                className={
                  isDarkMode
                    ? "border-gray-600 text-gray-300 hover:bg-gray-800"
                    : ""
                }
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsFullscreen(!isFullscreen)}
                className={
                  isDarkMode
                    ? "border-gray-600 text-gray-300 hover:bg-gray-800"
                    : ""
                }
              >
                {isFullscreen ? (
                  <Minimize2 className="w-4 h-4" />
                ) : (
                  <Maximize2 className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <svg
              ref={svgRef}
              width={isFullscreen ? window.innerWidth - 100 : 800}
              height={isFullscreen ? window.innerHeight - 200 : 500}
              className={`border rounded-lg transition-all duration-300 ${
                isDarkMode
                  ? "bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700"
                  : "bg-gradient-to-br from-slate-50 to-slate-100 border-gray-200"
              }`}
            />
            {selectedNode && (
              <div
                className={`absolute top-4 right-4 p-4 rounded-lg shadow-lg border max-w-xs transition-all duration-300 ${
                  isDarkMode
                    ? "bg-gray-800 border-gray-600 text-gray-100"
                    : "bg-white border-gray-200 text-gray-900"
                }`}
              >
                <h4 className="font-semibold mb-2">Node Details</h4>
                {(() => {
                  const device = devices.find((d) => d.id === selectedNode);
                  const deviceData = deviceDataMap[selectedNode];
                  return device ? (
                    <div className="space-y-2 text-sm">
                      <div>
                        <strong>Name:</strong> {device.name}
                      </div>
                      <div>
                        <strong>Type:</strong> {device.type.replace(/_/g, " ")}
                      </div>
                      <div className="flex items-center gap-2">
                        <strong>Status:</strong>
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            deviceData?.connectionStatus === "RECEIVING_DATA"
                              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                              : deviceData?.connectionStatus === "ERROR"
                              ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                              : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                          }`}
                        >
                          {deviceData?.connectionStatus}
                        </span>
                      </div>
                      <div>
                        <strong>Value:</strong>{" "}
                        <span className="font-mono">
                          {deviceData?.value?.toFixed(2) || "N/A"}
                        </span>
                      </div>
                      <div>
                        <strong>Live Data:</strong>{" "}
                        <span
                          className={
                            deviceData?.isLiveDataActive
                              ? "text-green-600 dark:text-green-400"
                              : "text-gray-500"
                          }
                        >
                          {deviceData?.isLiveDataActive ? "Yes" : "No"}
                        </span>
                      </div>
                    </div>
                  ) : null;
                })()}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
