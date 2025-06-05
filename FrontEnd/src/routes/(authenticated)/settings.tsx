import { createFileRoute } from "@tanstack/react-router"
import Settings from "@/components/pages/Settings"

export const Route = createFileRoute("/(authenticated)/settings")({
  component: Settings,
})
