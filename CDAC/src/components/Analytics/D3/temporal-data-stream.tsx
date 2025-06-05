"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useDeviceData } from "@/context/SocketContext";
import { Activity, Play, Pause, RotateCcw } from "lucide-react";
import * as d3 from "d3";

interface DataPoint {
  timestamp: number;
  deviceId: string;
  value: number;
  deviceName: string;
}

interface TemporalDataStreamProps {
  devices: any[];
}

export default function TemporalDataStream({
  devices,
}: TemporalDataStreamProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [dataHistory, setDataHistory] = useState<DataPoint[]>([]);
  const [timeWindow, setTimeWindow] = useState(60); // seconds
  const maxDataPoints = 1000;

  // ✅ FIXED: Call hooks at the top level for each device
  const deviceDataHooks = devices.map((device) => useDeviceData(device.id));

  // ✅ FIXED: Build device data map using the hook results
  const deviceDataMap = devices.reduce((acc, device, index) => {
    const deviceHookData = deviceDataHooks[index];
    acc[device.id] = deviceHookData;
    return acc;
  }, {} as { [deviceId: string]: any });

  // Collect data from all devices using Socket Context
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const newDataPoints: DataPoint[] = [];

      devices.forEach((device) => {
        const { data, isLiveDataActive } = deviceDataMap[device.id] || {
          data: null,
          isLiveDataActive: false,
        };

        if (
          isLiveDataActive &&
          data?.data?.metrics?.primary?.value !== undefined
        ) {
          newDataPoints.push({
            timestamp: now,
            deviceId: device.id,
            value: data.data.metrics.primary.value,
            deviceName: device.name,
          });
        }
      });

      if (newDataPoints.length > 0) {
        setDataHistory((prev) => {
          const updated = [...prev, ...newDataPoints];
          // Keep only data within time window
          const cutoff = now - timeWindow * 1000;
          return updated
            .filter((d) => d.timestamp > cutoff)
            .slice(-maxDataPoints);
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [devices, isPlaying, timeWindow, deviceDataMap]);

  useEffect(() => {
    if (!svgRef.current || dataHistory.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const margin = { top: 20, right: 80, bottom: 40, left: 60 };
    const width = 900 - margin.left - margin.right;
    const height = 400 - margin.bottom - margin.top;

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Group data by device
    const deviceGroups = d3.group(dataHistory, (d) => d.deviceId);
    const deviceColors = d3.scaleOrdinal(d3.schemeCategory10);

    // Time scale
    const now = Date.now();
    const timeExtent = [now - timeWindow * 1000, now];
    const xScale = d3.scaleTime().domain(timeExtent).range([0, width]);

    // Value scale
    const allValues = dataHistory.map((d) => d.value);
    const yScale = d3
      .scaleLinear()
      .domain(d3.extent(allValues) as [number, number])
      .nice()
      .range([height, 0]);

    // Create line generator
    const line = d3
      .line<DataPoint>()
      .x((d) => xScale(d.timestamp))
      .y((d) => yScale(d.value))
      .curve(d3.curveMonotoneX);

    // Draw grid lines
    const timeFormatter = d3.timeFormat("%H:%M:%S");
    const xAxis = d3
      .axisBottom(xScale)
      .tickFormat((domainValue: d3.NumberValue | Date) => {
        const date =
          domainValue instanceof Date
            ? domainValue
            : new Date(domainValue as number);
        return timeFormatter(date);
      });
    const yAxis = d3.axisLeft(yScale);

    g.append("g")
      .attr("class", "grid")
      .attr("transform", `translate(0,${height})`)
      .call(xAxis)
      .selectAll("text")
      .style("font-size", "11px");

    g.append("g")
      .attr("class", "grid")
      .call(yAxis)
      .selectAll("text")
      .style("font-size", "11px");

    // Add grid lines
    g.selectAll(".grid line")
      .style("stroke", "#e5e7eb")
      .style("stroke-width", 1);

    g.selectAll(".grid path").style("stroke", "none");

    // Draw lines for each device
    deviceGroups.forEach((deviceData, deviceId) => {
      const device = devices.find((d) => d.id === deviceId);
      if (!device) return;

      const color = deviceColors(deviceId);

      // Sort data by timestamp
      const sortedData = deviceData.sort((a, b) => a.timestamp - b.timestamp);

      // Draw line
      g.append("path")
        .datum(sortedData)
        .attr("fill", "none")
        .attr("stroke", color)
        .attr("stroke-width", 2)
        .attr("stroke-opacity", 0.8)
        .attr("d", line)
        .style("filter", "drop-shadow(0px 1px 2px rgba(0,0,0,0.1))");

      // Draw dots for recent data points
      g.selectAll(`.dot-${deviceId}`)
        .data(sortedData.slice(-10)) // Only show last 10 points
        .enter()
        .append("circle")
        .attr("class", `dot-${deviceId}`)
        .attr("cx", (d) => xScale(d.timestamp))
        .attr("cy", (d) => yScale(d.value))
        .attr("r", 3)
        .attr("fill", color)
        .attr("stroke", "#ffffff")
        .attr("stroke-width", 1)
        .style("opacity", (d, i, nodes) => (i + 1) / nodes.length); // Fade older points

      // Add device label at the end of line
      const lastPoint = sortedData[sortedData.length - 1];
      if (lastPoint) {
        g.append("text")
          .attr("x", xScale(lastPoint.timestamp) + 5)
          .attr("y", yScale(lastPoint.value))
          .attr("dy", "0.35em")
          .style("font-size", "11px")
          .style("font-weight", "500")
          .style("fill", color)
          .text(
            device.name.length > 8
              ? device.name.substring(0, 8) + "..."
              : device.name
          );
      }
    });

    // Add axes labels
    g.append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 0 - margin.left)
      .attr("x", 0 - height / 2)
      .attr("dy", "1em")
      .style("text-anchor", "middle")
      .style("font-size", "12px")
      .style("fill", "#6b7280")
      .text("Sensor Value");

    g.append("text")
      .attr("transform", `translate(${width / 2}, ${height + margin.bottom})`)
      .style("text-anchor", "middle")
      .style("font-size", "12px")
      .style("fill", "#6b7280")
      .text("Time");

    // Add real-time indicator
    const currentTimeLine = g
      .append("line")
      .attr("x1", xScale(now))
      .attr("x2", xScale(now))
      .attr("y1", 0)
      .attr("y2", height)
      .attr("stroke", "#ef4444")
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", "5,5")
      .style("opacity", 0.7);

    // Animate the current time line
    currentTimeLine
      .transition()
      .duration(1000)
      .style("opacity", 1)
      .transition()
      .duration(1000)
      .style("opacity", 0.7);
  }, [dataHistory, devices, timeWindow]);

  const clearData = () => {
    setDataHistory([]);
  };

  const activeDevicesCount = devices.filter((device) => {
    const { isLiveDataActive } = deviceDataMap[device.id] || {
      isLiveDataActive: false,
    };
    return isLiveDataActive;
  }).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Activity className="w-5 h-5" />
            <div>
              <CardTitle>Temporal Data Stream</CardTitle>
              <p className="text-sm text-muted-foreground">
                Real-time multi-device data visualization with temporal analysis
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{activeDevicesCount} Active Streams</Badge>
            <select
              value={timeWindow}
              onChange={(e) => setTimeWindow(Number(e.target.value))}
              className="px-3 py-1 text-sm border rounded-md"
            >
              <option value={30}>30 seconds</option>
              <option value={60}>1 minute</option>
              <option value={300}>5 minutes</option>
              <option value={900}>15 minutes</option>
            </select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsPlaying(!isPlaying)}
            >
              {isPlaying ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4" />
              )}
            </Button>
            <Button variant="outline" size="sm" onClick={clearData}>
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <svg
            ref={svgRef}
            width={900}
            height={400}
            className="border rounded-lg bg-white"
          />
          {dataHistory.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Waiting for real-time data streams...</p>
                <p className="text-sm">
                  Data will appear as devices send information
                </p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
