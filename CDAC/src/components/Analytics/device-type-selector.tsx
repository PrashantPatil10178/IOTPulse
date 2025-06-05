"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Filter, CheckCircle } from "lucide-react";
import { getDeviceIcon } from "@/utils/device-utils";

interface DeviceTypeSelectorProps {
  selectedTypes: string[];
  onTypesChange: (types: string[]) => void;
  deviceStats: Record<string, number>;
  visualizationConfigs: Record<string, any>;
}

export default function DeviceTypeSelector({
  selectedTypes,
  onTypesChange,
  deviceStats,
  visualizationConfigs,
}: DeviceTypeSelectorProps) {
  const deviceTypes = [
    {
      key: "all",
      label: "All Devices",
      count: Object.values(deviceStats).reduce((sum, count) => sum + count, 0),
    },
    {
      key: "TEMPERATURE_SENSOR",
      label: "Temperature",
      count: deviceStats.TEMPERATURE_SENSOR || 0,
    },
    {
      key: "HUMIDITY_SENSOR",
      label: "Humidity",
      count: deviceStats.HUMIDITY_SENSOR || 0,
    },
    {
      key: "MOTION_DETECTOR",
      label: "Motion",
      count: deviceStats.MOTION_DETECTOR || 0,
    },
    {
      key: "SMART_LIGHT",
      label: "Smart Light",
      count: deviceStats.SMART_LIGHT || 0,
    },
    {
      key: "SMART_PLUG",
      label: "Smart Plug",
      count: deviceStats.SMART_PLUG || 0,
    },
    { key: "CAMERA", label: "Camera", count: deviceStats.CAMERA || 0 },
    {
      key: "ENERGY_METER",
      label: "Energy",
      count: deviceStats.ENERGY_METER || 0,
    },
    { key: "WATER_METER", label: "Water", count: deviceStats.WATER_METER || 0 },
    {
      key: "AIR_QUALITY_SENSOR",
      label: "Air Quality",
      count: deviceStats.AIR_QUALITY_SENSOR || 0,
    },
    { key: "OTHER", label: "Other", count: deviceStats.OTHER || 0 },
  ];

  const handleTypeToggle = (type: string) => {
    if (type === "all") {
      onTypesChange(["all"]);
    } else {
      const newTypes = selectedTypes.includes("all")
        ? [type]
        : selectedTypes.includes(type)
        ? selectedTypes.filter((t) => t !== type)
        : [...selectedTypes.filter((t) => t !== "all"), type];

      onTypesChange(newTypes.length === 0 ? ["all"] : newTypes);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <Filter className="w-5 h-5" />
          Device Type Filter
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {deviceTypes.map((type) => {
            const isSelected = selectedTypes.includes(type.key);
            const config = visualizationConfigs[type.key];
            const IconComponent = getDeviceIcon(type.key);

            return (
              <Button
                key={type.key}
                variant={isSelected ? "default" : "outline"}
                size="sm"
                onClick={() => handleTypeToggle(type.key)}
                className="flex items-center gap-2 h-auto py-2 px-3"
                disabled={type.count === 0 && type.key !== "all"}
              >
                {isSelected && <CheckCircle className="w-3 h-3" />}
                <IconComponent className="w-4 h-4" />
                <span>{type.label}</span>
                <Badge variant="secondary" className="ml-1 text-xs">
                  {type.count}
                </Badge>
              </Button>
            );
          })}
        </div>

        <div className="mt-4 text-sm text-muted-foreground">
          {selectedTypes.includes("all")
            ? "Showing all device types"
            : `Showing ${selectedTypes.length} selected type${
                selectedTypes.length > 1 ? "s" : ""
              }`}
        </div>
      </CardContent>
    </Card>
  );
}
