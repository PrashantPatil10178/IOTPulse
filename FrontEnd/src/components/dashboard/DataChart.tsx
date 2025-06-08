"use client";

import { useState, useMemo } from "react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import clsx from "clsx";

interface DataChartProps {
  title: string;
  description?: string;
  data: any[];
  type?: "line" | "bar" | "area";
  colors?: string[];
  timeFormat?: string;
  className?: string;
}

export default function DataChart({
  title,
  description,
  data,
  type = "line",
  colors = ["#60a5fa", "#a78bfa", "#38bdf8"],
  className,
}: DataChartProps) {
  const [timeRange, setTimeRange] = useState("24h");

  // Filter data based on selected time range
  const filteredData = useMemo(() => {
    if (timeRange === "24h") return data;
    if (timeRange === "7d") return data.filter((_, i) => i % 6 === 0);
    if (timeRange === "30d") return data.filter((_, i) => i % 24 === 0);
    return data;
  }, [data, timeRange]);

  // Format timestamp based on time range
  const formatXAxis = (timestamp: string) => {
    if (timeRange === "24h") {
      return format(new Date(timestamp), "HH:mm");
    } else if (timeRange === "7d") {
      return format(new Date(timestamp), "EEE");
    } else {
      return format(new Date(timestamp), "dd/MM");
    }
  };

  // Animation variants for card and chart
  const cardVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.5 } },
    exit: { opacity: 0, y: -10, transition: { duration: 0.25 } },
  };

  // Chart skeleton loader
  const ChartSkeleton = () => (
    <div className="flex flex-col items-center justify-center h-[250px] animate-pulse">
      <div className="w-2/3 h-8 bg-slate-200 dark:bg-slate-700 rounded mb-4" />
      <div className="w-full h-40 bg-slate-200 dark:bg-slate-800 rounded" />
    </div>
  );

  // Determine which chart type to render
  const renderChart = () => {
    if (!filteredData || filteredData.length === 0) {
      return (
        <div className="flex items-center justify-center h-[250px] text-muted-foreground">
          <span className="text-sm">No data available</span>
        </div>
      );
    }

    const dataKeys = Object.keys(filteredData[0] || {}).filter(
      (key) => key !== "timestamp"
    );

    const chartKey = `${type}-${timeRange}-${filteredData.length}`;

    // Custom Legend
    const customLegend = (
      <Legend
        wrapperStyle={{
          paddingTop: 8,
        }}
        iconType="circle"
        align="center"
        verticalAlign="bottom"
        iconSize={16}
      />
    );

    switch (type) {
      case "bar":
        return (
          <ResponsiveContainer width="100%" height={250} key={chartKey}>
            <BarChart
              data={filteredData}
              margin={{ top: 24, right: 8, left: 0, bottom: 24 }}
              barGap={8}
            >
              <CartesianGrid
                strokeDasharray="4 4"
                stroke="#293145"
                vertical={false}
              />
              <XAxis
                dataKey="timestamp"
                tickFormatter={formatXAxis}
                stroke="#7f8fae"
                fontSize={13}
                tickMargin={14}
                angle={-10}
                axisLine={false}
                tickLine={false}
                height={38}
              />
              <YAxis
                stroke="#7f8fae"
                fontSize={13}
                axisLine={false}
                tickLine={false}
                width={32}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(24, 32, 51, 0.98)",
                  borderRadius: "12px",
                  border: "none",
                  color: "#e0e7ef",
                  boxShadow: "0 8px 32px 0 rgba(0,0,0,0.20)",
                  fontSize: "13px",
                  padding: "14px",
                }}
                labelClassName="text-blue-200 mb-2 font-semibold"
                labelFormatter={(label) => format(new Date(label), "PPpp")}
                cursor={{ fill: "rgba(96,165,250,0.08)" }}
              />
              {customLegend}
              {dataKeys.map((key, index) => (
                <Bar
                  key={key}
                  dataKey={key}
                  name={key
                    .replace(/([A-Z])/g, " $1")
                    .replace(/^./, (str) => str.toUpperCase())}
                  fill={`url(#bar-gradient-${index})`}
                  radius={[8, 8, 0, 0]}
                  barSize={26}
                  className="transition-all duration-200"
                  isAnimationActive={true}
                  animationDuration={650}
                />
              ))}
              <defs>
                {dataKeys.map((_, index) => (
                  <linearGradient
                    key={index}
                    id={`bar-gradient-${index}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor={colors[index % colors.length]}
                      stopOpacity={0.95}
                    />
                    <stop
                      offset="100%"
                      stopColor={colors[index % colors.length]}
                      stopOpacity={0.4}
                    />
                  </linearGradient>
                ))}
              </defs>
            </BarChart>
          </ResponsiveContainer>
        );

      case "area":
        return (
          <ResponsiveContainer width="100%" height={250} key={chartKey}>
            <AreaChart
              data={filteredData}
              margin={{ top: 24, right: 8, left: 0, bottom: 24 }}
            >
              <defs>
                {dataKeys.map((key, index) => (
                  <linearGradient
                    key={key}
                    id={`area-gradient-${index}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor={colors[index % colors.length]}
                      stopOpacity={0.7}
                    />
                    <stop
                      offset="100%"
                      stopColor={colors[index % colors.length]}
                      stopOpacity={0.15}
                    />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid
                strokeDasharray="4 4"
                stroke="#293145"
                vertical={false}
              />
              <XAxis
                dataKey="timestamp"
                tickFormatter={formatXAxis}
                stroke="#7f8fae"
                fontSize={13}
                tickMargin={14}
                axisLine={false}
                tickLine={false}
                height={38}
              />
              <YAxis
                stroke="#7f8fae"
                fontSize={13}
                axisLine={false}
                tickLine={false}
                width={32}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(24, 32, 51, 0.98)",
                  borderRadius: "12px",
                  border: "none",
                  color: "#e0e7ef",
                  boxShadow: "0 8px 32px 0 rgba(0,0,0,0.20)",
                  fontSize: "13px",
                  padding: "14px",
                }}
                labelClassName="text-blue-200 mb-2 font-semibold"
                labelFormatter={(label) => format(new Date(label), "PPpp")}
                cursor={{ fill: "rgba(96,165,250,0.04)" }}
              />
              {customLegend}
              {dataKeys.map((key, index) => (
                <Area
                  key={key}
                  type="monotone"
                  dataKey={key}
                  name={key
                    .replace(/([A-Z])/g, " $1")
                    .replace(/^./, (str) => str.toUpperCase())}
                  stroke={colors[index % colors.length]}
                  fillOpacity={1}
                  fill={`url(#area-gradient-${index})`}
                  strokeWidth={2.5}
                  activeDot={{ r: 5, fill: colors[index % colors.length] }}
                  isAnimationActive={true}
                  animationDuration={650}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        );

      case "line":
      default:
        return (
          <ResponsiveContainer width="100%" height={250} key={chartKey}>
            <LineChart
              data={filteredData}
              margin={{ top: 24, right: 8, left: 0, bottom: 24 }}
            >
              <CartesianGrid
                strokeDasharray="4 4"
                stroke="#293145"
                vertical={false}
              />
              <XAxis
                dataKey="timestamp"
                tickFormatter={formatXAxis}
                stroke="#7f8fae"
                fontSize={13}
                tickMargin={14}
                axisLine={false}
                tickLine={false}
                height={38}
              />
              <YAxis
                stroke="#7f8fae"
                fontSize={13}
                axisLine={false}
                tickLine={false}
                width={32}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(24, 32, 51, 0.98)",
                  borderRadius: "12px",
                  border: "none",
                  color: "#e0e7ef",
                  boxShadow: "0 8px 32px 0 rgba(0,0,0,0.20)",
                  fontSize: "13px",
                  padding: "14px",
                }}
                labelClassName="text-blue-200 mb-2 font-semibold"
                labelFormatter={(label) => format(new Date(label), "PPpp")}
                cursor={{ fill: "rgba(96,165,250,0.03)" }}
              />
              {customLegend}
              {dataKeys.map((key, index) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  name={key
                    .replace(/([A-Z])/g, " $1")
                    .replace(/^./, (str) => str.toUpperCase())}
                  stroke={colors[index % colors.length]}
                  strokeWidth={3}
                  dot={{
                    r: 5,
                    fill: "#1e293b",
                    stroke: colors[index % colors.length],
                    strokeWidth: 2,
                  }}
                  activeDot={{
                    r: 8,
                    fill: colors[index % colors.length],
                    stroke: "#fff",
                    strokeWidth: 2,
                  }}
                  isAnimationActive={true}
                  animationDuration={650}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        );
    }
  };

  return (
    <motion.div
      variants={cardVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className={clsx(
        "w-full max-w-full",
        "transition-colors duration-300 ease-in-out",
        className
      )}
    >
      <Card className="bg-[#101624] border border-[#23283a] rounded-2xl shadow-xl px-2 pt-3 pb-2 md:px-5 md:pt-5 md:pb-4 transition-shadow duration-300 hover:shadow-2xl">
        <CardHeader className="px-2 pt-0 pb-0 md:px-0 md:pt-0 md:pb-0">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-2 md:space-y-0">
            <div>
              <CardTitle className="text-lg font-bold text-slate-100 tracking-tight">
                {title}
              </CardTitle>
              {description && (
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  {description}
                </p>
              )}
            </div>
            <Tabs
              value={timeRange}
              onValueChange={setTimeRange}
              className="w-full md:w-auto mt-2 md:mt-0"
            >
              <TabsList className="flex gap-1 bg-[#222741] border border-[#23283a] rounded-full p-1 shadow-sm">
                {["24h", "7d", "30d"].map((tab) => (
                  <TabsTrigger
                    key={tab}
                    value={tab}
                    className={clsx(
                      "text-xs px-4 py-1 rounded-full transition-all font-semibold",
                      timeRange === tab
                        ? "bg-blue-500 text-white shadow"
                        : "text-blue-200 hover:bg-blue-900/30"
                    )}
                  >
                    {tab}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent className="p-0 pt-3 md:p-0 md:pt-6 min-h-[280px]">
          {/* AnimatePresence for smooth fade on data/chart change */}
          <AnimatePresence mode="wait">
            <motion.div
              key={timeRange + "-" + type + "-" + (filteredData?.length || 0)}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0, transition: { duration: 0.45 } }}
              exit={{ opacity: 0, y: -10, transition: { duration: 0.2 } }}
              className="h-full"
            >
              {data ? renderChart() : <ChartSkeleton />}
            </motion.div>
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
}
