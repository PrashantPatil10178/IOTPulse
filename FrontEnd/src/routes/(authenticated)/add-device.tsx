import { createFileRoute } from "@tanstack/react-router";
import AddDeviceOnboarding from "@/components/pages/AddDeviceOnboarding";

export const Route = createFileRoute("/(authenticated)/add-device")({
  component: AddDeviceOnboarding,
});
