"use client";

import { useState } from "react";

export function useDeviceFilters() {
  const [deviceFilters, setDeviceFilters] = useState({
    search: "",
    type: "all",
    status: "all",
    sortBy: "name",
    order: "asc",
  });

  return {
    deviceFilters,
    setDeviceFilters,
  };
}
