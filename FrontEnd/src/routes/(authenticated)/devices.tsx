import { createFileRoute } from "@tanstack/react-router";
import Devices from "@/pages/Devices";

export const Route = createFileRoute("/(authenticated)/devices")({
  component: Devices,
});
