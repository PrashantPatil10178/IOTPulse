import { createFileRoute } from "@tanstack/react-router";
import Alerts from "@/pages/Alerts";

export const Route = createFileRoute("/(authenticated)/alerts")({
  component: Alerts,
});
