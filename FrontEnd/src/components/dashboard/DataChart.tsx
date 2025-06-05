"use client";

import { useState, useMemo } from "react";
import { format } from "date-fns";
import { motion } from "framer-motion";
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
  colors = ["#3B82F6", "#8B5CF6"],
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

  // Animation variants
  const cardVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  // Determine which chart type to render
  const renderChart = () => {
    if (!filteredData || filteredData.length === 0) {
      return (
        <div className="flex items-center justify-center h-[250px] text-muted-foreground">
          No data available
        </div>
      );
    }

    const dataKeys = Object.keys(filteredData[0] || {}).filter(
      (key) => key !== "timestamp"
    );

    switch (type) {
      case "bar":
        return (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart
              data={filteredData}
              margin={{ top: 5, right: 5, left: 0, bottom: 5 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                className="stroke-slate-200 dark:stroke-slate-700"
              />
              <XAxis
                dataKey="timestamp"
                tickFormatter={formatXAxis}
                stroke="#94A3B8"
                fontSize={12}
                tickMargin={10}
              />
              <YAxis stroke="#94A3B8" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(15, 23, 42, 0.9)",
                  borderRadius: "8px",
                  border: "none",
                  color: "#F1F5F9",
                  boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)",
                  fontSize: "12px",
                }}
                labelClassName="text-slate-300 mb-1"
                labelFormatter={(label) => format(new Date(label), "PPpp")}
              />
              <Legend />
              {dataKeys.map((key, index) => (
                <Bar
                  key={key}
                  dataKey={key}
                  name={key.charAt(0).toUpperCase() + key.slice(1)}
                  fill={colors[index % colors.length]}
                  radius={[4, 4, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );

      case "area":
        return (
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart
              data={filteredData}
              margin={{ top: 5, right: 5, left: 0, bottom: 5 }}
            >
              <defs>
                {dataKeys.map((key, index) => (
                  <linearGradient
                    key={key}
                    id={`color-${key}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor={colors[index % colors.length]}
                      stopOpacity={0.8}
                    />
                    <stop
                      offset="95%"
                      stopColor={colors[index % colors.length]}
                      stopOpacity={0.1}
                    />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                className="stroke-slate-200 dark:stroke-slate-700"
              />
              <XAxis
                dataKey="timestamp"
                tickFormatter={formatXAxis}
                stroke="#94A3B8"
                fontSize={12}
                tickMargin={10}
              />
              <YAxis stroke="#94A3B8" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(15, 23, 42, 0.9)",
                  borderRadius: "8px",
                  border: "none",
                  color: "#F1F5F9",
                  boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)",
                  fontSize: "12px",
                }}
                labelClassName="text-slate-300 mb-1"
                labelFormatter={(label) => format(new Date(label), "PPpp")}
              />
              <Legend />
              {dataKeys.map((key, index) => (
                <Area
                  key={key}
                  type="monotone"
                  dataKey={key}
                  name={key.charAt(0).toUpperCase() + key.slice(1)}
                  stroke={colors[index % colors.length]}
                  fillOpacity={1}
                  fill={`url(#color-${key})`}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        );

      case "line":
      default:
        return (
          <ResponsiveContainer width="100%" height={250}>
            <LineChart
              data={filteredData}
              margin={{ top: 5, right: 5, left: 0, bottom: 5 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                className="stroke-slate-200 dark:stroke-slate-700"
              />
              <XAxis
                dataKey="timestamp"
                tickFormatter={formatXAxis}
                stroke="#94A3B8"
                fontSize={12}
                tickMargin={10}
              />
              <YAxis stroke="#94A3B8" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(15, 23, 42, 0.9)",
                  borderRadius: "8px",
                  border: "none",
                  color: "#F1F5F9",
                  boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)",
                  fontSize: "12px",
                }}
                labelClassName="text-slate-300 mb-1"
                labelFormatter={(label) => format(new Date(label), "PPpp")}
              />
              <Legend />
              {dataKeys.map((key, index) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  name={key.charAt(0).toUpperCase() + key.slice(1)}
                  stroke={colors[index % colors.length]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
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
      className={className}
    >
      <Card className="border dark:border-slate-800">
        <CardHeader className="p-4 pb-0">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-2 md:space-y-0">
            <div>
              <CardTitle className="text-base font-semibold">{title}</CardTitle>
              {description && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {description}
                </p>
              )}
            </div>
            <Tabs
              value={timeRange}
              onValueChange={setTimeRange}
              className="w-full md:w-auto"
            >
              <TabsList className="grid grid-cols-3 w-full md:w-auto bg-slate-100 dark:bg-slate-800">
                <TabsTrigger value="24h" className="text-xs">
                  24h
                </TabsTrigger>
                <TabsTrigger value="7d" className="text-xs">
                  7d
                </TabsTrigger>
                <TabsTrigger value="30d" className="text-xs">
                  30d
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-6">{renderChart()}</CardContent>
      </Card>
    </motion.div>
  );
}
