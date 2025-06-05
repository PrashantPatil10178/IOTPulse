"use client"

import { motion } from "framer-motion"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DeviceOnboardingWizard } from "@/components/devices/DeviceOnboardingWizard"
import { useRouter } from "@tanstack/react-router"

export default function AddDeviceOnboardingPage() {
  const router = useRouter()

  const pageVariants = {
    initial: { opacity: 0, x: -20 },
    animate: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.5, ease: "easeInOut" },
    },
    exit: {
      opacity: 0,
      x: 20,
      transition: { duration: 0.3, ease: "easeInOut" },
    },
  }

  const handleBackClick = () => {
    router.navigate({ to: "/" })
  }

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            Add New IoT Device
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Follow the steps to register and configure your new device.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleBackClick}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>
      </div>

      <DeviceOnboardingWizard />
    </motion.div>
  )
}
