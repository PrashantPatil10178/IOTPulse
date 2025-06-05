"use client";

import type React from "react";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  PartyPopper,
  Settings2,
  ListChecks,
  HardDrive,
  AlertCircle,
  MoreHorizontal,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { DeviceConnectivityWizard } from "./DeviceConnectivityWizard";
import { deviceApi } from "@/lib/api";
import { DeviceType, DeviceStatus, type Device } from "@/types";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Activity,
  Droplets,
  Shield,
  Lightbulb,
  Zap,
  Camera,
  Gauge,
  Wind,
} from "lucide-react";

interface DeviceFormData {
  name: string;
  type: DeviceType;
  status: DeviceStatus;
  description: string;
}

const steps = [
  {
    id: 1,
    name: "Device Details",
    icon: HardDrive,
    description: "Basic information",
    subtitle: "Tell us about your device",
  },
  {
    id: 2,
    name: "Type & Status",
    icon: Settings2,
    description: "Configure device",
    subtitle: "Select device type and initial status",
  },
  {
    id: 3,
    name: "Review",
    icon: ListChecks,
    description: "Confirm creation",
    subtitle: "Review and create your device",
  },
];

const deviceTypeOptions = [
  {
    value: DeviceType.TEMPERATURE_SENSOR,
    label: "Temperature Sensor",
    description: "Monitors ambient temperature",
    icon: <Activity className="w-4 h-4" />,
    color: "text-orange-500",
    bgColor: "bg-orange-50 dark:bg-orange-950/20",
    borderColor: "border-orange-200 dark:border-orange-800",
  },
  {
    value: DeviceType.HUMIDITY_SENSOR,
    label: "Humidity Sensor",
    description: "Tracks moisture levels",
    icon: <Droplets className="w-4 h-4" />,
    color: "text-blue-500",
    bgColor: "bg-blue-50 dark:bg-blue-950/20",
    borderColor: "border-blue-200 dark:border-blue-800",
  },
  {
    value: DeviceType.MOTION_DETECTOR,
    label: "Motion Detector",
    description: "Detects movement and presence",
    icon: <Shield className="w-4 h-4" />,
    color: "text-purple-500",
    bgColor: "bg-purple-50 dark:bg-purple-950/20",
    borderColor: "border-purple-200 dark:border-purple-800",
  },
  {
    value: DeviceType.SMART_LIGHT,
    label: "Smart Light",
    description: "Intelligent lighting control",
    icon: <Lightbulb className="w-4 h-4" />,
    color: "text-yellow-500",
    bgColor: "bg-yellow-50 dark:bg-yellow-950/20",
    borderColor: "border-yellow-200 dark:border-yellow-800",
  },
  {
    value: DeviceType.SMART_PLUG,
    label: "Smart Plug",
    description: "Remote power control",
    icon: <Zap className="w-4 h-4" />,
    color: "text-green-500",
    bgColor: "bg-green-50 dark:bg-green-950/20",
    borderColor: "border-green-200 dark:border-green-800",
  },
  {
    value: DeviceType.CAMERA,
    label: "Camera",
    description: "Video surveillance and monitoring",
    icon: <Camera className="w-4 h-4" />,
    color: "text-indigo-500",
    bgColor: "bg-indigo-50 dark:bg-indigo-950/20",
    borderColor: "border-indigo-200 dark:border-indigo-800",
  },
  {
    value: DeviceType.ENERGY_METER,
    label: "Energy Meter",
    description: "Power consumption monitoring",
    icon: <Gauge className="w-4 h-4" />,
    color: "text-emerald-500",
    bgColor: "bg-emerald-50 dark:bg-emerald-950/20",
    borderColor: "border-emerald-200 dark:border-emerald-800",
  },
  {
    value: DeviceType.WATER_METER,
    label: "Water Meter",
    description: "Water usage tracking",
    icon: <Droplets className="w-4 h-4" />,
    color: "text-cyan-500",
    bgColor: "bg-cyan-50 dark:bg-cyan-950/20",
    borderColor: "border-cyan-200 dark:border-cyan-800",
  },
  {
    value: DeviceType.AIR_QUALITY_SENSOR,
    label: "Air Quality Sensor",
    description: "Air pollution monitoring",
    icon: <Wind className="w-4 h-4" />,
    color: "text-teal-500",
    bgColor: "bg-teal-50 dark:bg-teal-950/20",
    borderColor: "border-teal-200 dark:border-teal-800",
  },
  {
    value: DeviceType.OTHER,
    label: "Other",
    description: "Custom or specialized device",
    icon: <MoreHorizontal className="w-4 h-4" />,
    color: "text-gray-500",
    bgColor: "bg-gray-50 dark:bg-gray-950/20",
    borderColor: "border-gray-200 dark:border-gray-800",
  },
];

const deviceStatusOptions = [
  {
    value: DeviceStatus.ONLINE,
    label: "Online",
    description: "Device is active and connected",
    color: "text-green-600",
    bgColor: "bg-green-50 dark:bg-green-950/20",
    dotColor: "bg-green-500",
    borderColor: "border-green-200 dark:border-green-800",
  },
  {
    value: DeviceStatus.OFFLINE,
    label: "Offline",
    description: "Device is not connected",
    color: "text-gray-600",
    bgColor: "bg-gray-50 dark:bg-gray-950/20",
    dotColor: "bg-gray-500",
    borderColor: "border-gray-200 dark:border-gray-800",
  },
  {
    value: DeviceStatus.MAINTENANCE,
    label: "Maintenance",
    description: "Device is under maintenance",
    color: "text-yellow-600",
    bgColor: "bg-yellow-50 dark:bg-yellow-950/20",
    dotColor: "bg-yellow-500",
    borderColor: "border-yellow-200 dark:border-yellow-800",
  },
  {
    value: DeviceStatus.ERROR,
    label: "Error",
    description: "Device has encountered an error",
    color: "text-red-600",
    bgColor: "bg-red-50 dark:bg-red-950/20",
    dotColor: "bg-red-500",
    borderColor: "border-red-200 dark:border-red-800",
  },
];

const initialFormData: DeviceFormData = {
  name: "",
  type: DeviceType.OTHER,
  status: DeviceStatus.OFFLINE,
  description: "",
};

export function DeviceOnboardingWizard() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<DeviceFormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [showConnectivityWizard, setShowConnectivityWizard] = useState(false);
  const [createdDevice, setCreatedDevice] = useState<Device | null>(null);
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear validation error when user starts typing
    if (validationErrors[name]) {
      setValidationErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleSelectChange = (name: keyof DeviceFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value as any }));
    if (validationErrors[name]) {
      setValidationErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validateStep = (step: number): boolean => {
    const errors: Record<string, string> = {};

    switch (step) {
      case 1:
        if (!formData.name.trim()) {
          errors.name = "Device name is required";
        } else if (formData.name.trim().length < 3) {
          errors.name = "Device name must be at least 3 characters";
        } else if (formData.name.trim().length > 100) {
          errors.name = "Device name must be less than 100 characters";
        }

        if (!formData.description.trim()) {
          errors.description = "Device description is required";
        } else if (formData.description.trim().length < 10) {
          errors.description = "Description must be at least 10 characters";
        }
        break;

      case 2:
        if (!formData.type) {
          errors.type = "Device type is required";
        }
        if (!formData.status) {
          errors.status = "Device status is required";
        }
        break;

      case 3:
        // Final validation - check all required fields
        if (!formData.name.trim()) {
          errors.name = "Device name is required";
        }
        if (!formData.type) {
          errors.type = "Device type is required";
        }
        if (!formData.status) {
          errors.status = "Device status is required";
        }
        if (!formData.description.trim()) {
          errors.description = "Device description is required";
        }
        break;
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      if (currentStep < steps.length) {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    if (!validateStep(3)) return;

    setIsSubmitting(true);
    try {
      // Prepare device data for API with removed fields set to null
      const deviceData = {
        name: formData.name.trim(),
        type: formData.type,
        status: formData.status,
        description: formData.description.trim(),
        // Location fields - set to null since removed from UI
        location: null,
        latitude: null,
        longitude: null,
        // Technical fields - set to null since removed from UI
        batteryLevel: null,
        firmware: null,
      };

      console.log("Sending device data to backend:", deviceData);

      // Create device using the backend API
      const newDevice = await deviceApi.create(deviceData);

      setCreatedDevice(newDevice);
      toast.success("Device successfully created!");
      setOnboardingComplete(true);

      // Show connectivity wizard
      setShowConnectivityWizard(true);
    } catch (error: any) {
      console.error("Failed to create device:", error);

      // Handle different types of errors
      let errorMessage = "Failed to create device. Please try again.";

      if (error.response) {
        // Server responded with error status
        const status = error.response.status;
        const data = error.response.data;

        if (status === 400) {
          // Validation errors
          if (data.error) {
            errorMessage = `Validation Error: ${data.error}`;
          } else if (data.errors && Array.isArray(data.errors)) {
            errorMessage = `Validation Errors: ${data.errors.join(", ")}`;
          } else {
            errorMessage = "Invalid data provided. Please check your inputs.";
          }
        } else if (status === 401) {
          errorMessage = "Authentication failed. Please log in again.";
        } else if (status === 403) {
          errorMessage = "You don't have permission to create devices.";
        } else if (status === 409) {
          errorMessage = "A device with this name already exists.";
        } else if (status === 422) {
          errorMessage = "Invalid device data. Please check all fields.";
        } else if (status >= 500) {
          errorMessage = "Server error. Please try again later.";
        } else {
          errorMessage =
            data.error || data.message || `Server error (${status})`;
        }
      } else if (error.request) {
        // Network error
        errorMessage =
          "Network error. Please check your connection and try again.";
      } else if (error.message) {
        // Other errors
        errorMessage = error.message;
      }

      // Show error toast with detailed message
      toast.error(errorMessage, {
        duration: 6000,
        description: "Please review your inputs and try again.",
      });

      // Don't navigate away or reset form - stay on current step
      // User can review and fix the issue
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData(initialFormData);
    setCurrentStep(1);
    setOnboardingComplete(false);
    setShowConnectivityWizard(false);
    setCreatedDevice(null);
    setValidationErrors({});
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="space-y-8"
          >
            {/* Welcome Header */}
            <div className="text-center space-y-3 mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mb-4">
                <HardDrive className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Let's add your device
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md mx-auto">
                Start by providing basic information about your device. This
                helps us identify and manage it properly.
              </p>
            </div>

            <div className="space-y-6">
              <div className="space-y-3">
                <Label
                  htmlFor="name"
                  className="text-sm font-semibold text-gray-700 dark:text-gray-300"
                >
                  Device Name *
                </Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="e.g., Living Room Temperature Sensor"
                  className={`h-12 px-4 text-base rounded-xl border-2 transition-all duration-200 ${
                    validationErrors.name
                      ? "border-red-300 focus:border-red-500 bg-red-50 dark:bg-red-950/20"
                      : "border-gray-200 dark:border-gray-700 focus:border-blue-500 hover:border-gray-300 dark:hover:border-gray-600"
                  } focus:ring-4 focus:ring-blue-500/10`}
                />
                {validationErrors.name && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-sm text-red-500 flex items-center gap-2 bg-red-50 dark:bg-red-950/20 p-3 rounded-lg"
                  >
                    <AlertCircle className="w-4 h-4" />
                    {validationErrors.name}
                  </motion.p>
                )}
              </div>

              <div className="space-y-3">
                <Label
                  htmlFor="description"
                  className="text-sm font-semibold text-gray-700 dark:text-gray-300"
                >
                  Description *
                </Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Describe the device purpose, location, and any specific functionality..."
                  rows={4}
                  className={`px-4 py-3 text-base rounded-xl border-2 resize-none transition-all duration-200 ${
                    validationErrors.description
                      ? "border-red-300 focus:border-red-500 bg-red-50 dark:bg-red-950/20"
                      : "border-gray-200 dark:border-gray-700 focus:border-blue-500 hover:border-gray-300 dark:hover:border-gray-600"
                  } focus:ring-4 focus:ring-blue-500/10`}
                />
                {validationErrors.description && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-sm text-red-500 flex items-center gap-2 bg-red-50 dark:bg-red-950/20 p-3 rounded-lg"
                  >
                    <AlertCircle className="w-4 h-4" />
                    {validationErrors.description}
                  </motion.p>
                )}
              </div>
            </div>
          </motion.div>
        );

      case 2:
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="space-y-8"
          >
            {/* Header */}
            <div className="text-center space-y-3 mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-green-500 to-teal-600 rounded-2xl mb-4">
                <Settings2 className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Configure your device
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md mx-auto">
                Select the device type and set its initial status to complete
                the basic configuration.
              </p>
            </div>

            <div className="space-y-8">
              <div className="space-y-4">
                <Label
                  htmlFor="type"
                  className="text-sm font-semibold text-gray-700 dark:text-gray-300"
                >
                  Device Type *
                </Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => handleSelectChange("type", value)}
                >
                  <SelectTrigger
                    className={`h-12 px-4 rounded-xl border-2 transition-all duration-200 ${
                      validationErrors.type
                        ? "border-red-300 bg-red-50 dark:bg-red-950/20"
                        : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                    }`}
                  >
                    <SelectValue placeholder="Choose your device type" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    <div className="grid gap-1 p-2">
                      {deviceTypeOptions.map((option) => (
                        <SelectItem
                          key={option.value}
                          value={option.value}
                          className="py-3 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`p-2 rounded-lg ${option.bgColor} ${option.borderColor} border`}
                            >
                              <div className={option.color}>{option.icon}</div>
                            </div>
                            <div className="flex flex-col items-start">
                              <span className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                                {option.label}
                              </span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {option.description}
                              </span>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </div>
                  </SelectContent>
                </Select>
                {validationErrors.type && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-sm text-red-500 flex items-center gap-2 bg-red-50 dark:bg-red-950/20 p-3 rounded-lg"
                  >
                    <AlertCircle className="w-4 h-4" />
                    {validationErrors.type}
                  </motion.p>
                )}
              </div>

              <div className="space-y-4">
                <Label
                  htmlFor="status"
                  className="text-sm font-semibold text-gray-700 dark:text-gray-300"
                >
                  Initial Status *
                </Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => handleSelectChange("status", value)}
                >
                  <SelectTrigger
                    className={`h-12 px-4 rounded-xl border-2 transition-all duration-200 ${
                      validationErrors.status
                        ? "border-red-300 bg-red-50 dark:bg-red-950/20"
                        : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                    }`}
                  >
                    <SelectValue placeholder="Set the initial device status" />
                  </SelectTrigger>
                  <SelectContent>
                    <div className="grid gap-1 p-2">
                      {deviceStatusOptions.map((option) => (
                        <SelectItem
                          key={option.value}
                          value={option.value}
                          className="py-3 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`p-2 rounded-lg ${option.bgColor} ${option.borderColor} border flex items-center justify-center`}
                            >
                              <div
                                className={`w-3 h-3 rounded-full ${option.dotColor}`}
                              />
                            </div>
                            <div className="flex flex-col items-start">
                              <span className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                                {option.label}
                              </span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {option.description}
                              </span>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </div>
                  </SelectContent>
                </Select>
                {validationErrors.status && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-sm text-red-500 flex items-center gap-2 bg-red-50 dark:bg-red-950/20 p-3 rounded-lg"
                  >
                    <AlertCircle className="w-4 h-4" />
                    {validationErrors.status}
                  </motion.p>
                )}
              </div>
            </div>
          </motion.div>
        );

      case 3:
        const selectedType = deviceTypeOptions.find(
          (t) => t.value === formData.type
        );
        const selectedStatus = deviceStatusOptions.find(
          (s) => s.value === formData.status
        );

        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="space-y-8"
          >
            {/* Header */}
            <div className="text-center space-y-3 mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl mb-4">
                <CheckCircle2 className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Review & Create
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md mx-auto">
                Please review your device configuration before creating it. You
                can go back to make changes if needed.
              </p>
            </div>

            {/* Error Display Section */}
            {Object.keys(validationErrors).length > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                <Alert
                  variant="destructive"
                  className="rounded-xl border-2 bg-red-50 dark:bg-red-950/20"
                >
                  <AlertCircle className="h-5 w-5" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <p className="font-semibold text-sm">
                        Please fix the following errors:
                      </p>
                      <ul className="list-disc list-inside text-sm space-y-1">
                        {Object.entries(validationErrors).map(
                          ([field, error]) => (
                            <li key={field}>
                              <span className="font-medium capitalize">
                                {field}:
                              </span>{" "}
                              {error}
                            </li>
                          )
                        )}
                      </ul>
                    </div>
                  </AlertDescription>
                </Alert>
              </motion.div>
            )}

            <Card className="border-2 border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800">
              <CardHeader className="bg-gray-50 dark:bg-gray-800/50 pb-4">
                <div className="flex items-center gap-3">
                  <Sparkles className="w-5 h-5 text-blue-500" />
                  <CardTitle className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    Device Summary
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {/* Device Name */}
                <div className="flex justify-between items-start group">
                  <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                    Device Name
                  </span>
                  <span
                    className={`text-sm font-medium text-right max-w-xs ${
                      !formData.name.trim()
                        ? "text-red-500"
                        : "text-gray-900 dark:text-gray-100"
                    }`}
                  >
                    {formData.name || "Not specified"}
                  </span>
                </div>

                {/* Device Type */}
                <div className="flex justify-between items-center group">
                  <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                    Device Type
                  </span>
                  <div className="flex items-center gap-2">
                    {selectedType && (
                      <div
                        className={`p-1.5 rounded-lg ${selectedType.bgColor} ${selectedType.borderColor} border`}
                      >
                        <div className={selectedType.color}>
                          {selectedType.icon}
                        </div>
                      </div>
                    )}
                    <Badge
                      variant="outline"
                      className="text-xs font-medium border-gray-300 dark:border-gray-600"
                    >
                      {selectedType?.label}
                    </Badge>
                  </div>
                </div>

                {/* Device Status */}
                <div className="flex justify-between items-center group">
                  <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                    Initial Status
                  </span>
                  <div className="flex items-center gap-2">
                    {selectedStatus && (
                      <div
                        className={`p-1.5 rounded-lg ${selectedStatus.bgColor} ${selectedStatus.borderColor} border flex items-center justify-center`}
                      >
                        <div
                          className={`w-2.5 h-2.5 rounded-full ${selectedStatus.dotColor}`}
                        />
                      </div>
                    )}
                    <Badge
                      variant={
                        formData.status === DeviceStatus.ONLINE
                          ? "default"
                          : "secondary"
                      }
                      className="text-xs font-medium"
                    >
                      {selectedStatus?.label}
                    </Badge>
                  </div>
                </div>

                {/* Description */}
                <div className="flex justify-between items-start group">
                  <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                    Description
                  </span>
                  <span
                    className={`text-sm text-right max-w-xs leading-relaxed ${
                      !formData.description.trim()
                        ? "text-red-500"
                        : "text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    {formData.description || "Not specified"}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Info Note */}
            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
              <div className="flex gap-3">
                <div className="flex-shrink-0">
                  <Sparkles className="w-5 h-5 text-blue-500" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                    What happens next?
                  </p>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    After creating your device, you'll be guided through the
                    connectivity setup to help your device communicate with our
                    platform. Location and technical details can be configured
                    later if needed.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        );

      default:
        return null;
    }
  };

  if (onboardingComplete && !showConnectivityWizard) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="text-center py-16 space-y-6"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
        >
          <PartyPopper className="w-20 h-20 text-emerald-500 mx-auto" />
        </motion.div>
        <div className="space-y-3">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-3xl font-bold text-gray-900 dark:text-gray-100"
          >
            Device Created Successfully!
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-lg text-gray-600 dark:text-gray-400"
          >
            Your new device "{formData.name}" has been registered and is ready
            to use.
          </motion.p>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="flex justify-center gap-4 pt-4"
        >
          <Button
            variant="outline"
            onClick={resetForm}
            className="px-6 py-3 rounded-xl border-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200"
          >
            Add Another Device
          </Button>
          <Button
            onClick={() => router.navigate({ to: "/devices" })}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 transition-all duration-200"
          >
            View Device List
          </Button>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <>
      <Card className="shadow-2xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 max-h-[calc(100vh-6rem)] flex flex-col rounded-3xl overflow-hidden">
        <CardHeader className="border-b-2 border-gray-100 dark:border-gray-800 p-6 flex-shrink-0 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-900">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4 }}
              >
                <CardTitle className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  {steps[currentStep - 1].name}
                </CardTitle>
                <CardDescription className="text-sm text-gray-600 dark:text-gray-400">
                  {steps[currentStep - 1].subtitle}
                </CardDescription>
              </motion.div>
            </div>

            <div className="flex items-center space-x-3 p-3 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
              {steps.map((step, index) => {
                const StepIcon = step.icon;
                return (
                  <motion.div
                    key={step.id}
                    className={`relative p-3 rounded-xl transition-all duration-300 ${
                      currentStep === step.id
                        ? "bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-lg scale-110"
                        : currentStep > step.id
                        ? "bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-md"
                        : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                    }`}
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{
                      opacity: 1,
                      scale: currentStep === step.id ? 1.1 : 1,
                    }}
                    transition={{ delay: index * 0.1, duration: 0.3 }}
                    whileHover={{
                      scale: currentStep === step.id ? 1.15 : 1.05,
                    }}
                  >
                    <StepIcon className="w-5 h-5" />
                    {currentStep > step.id && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center"
                      >
                        <Check className="w-3 h-3 text-emerald-500" />
                      </motion.div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>

          <div className="pt-4 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                Step {currentStep} of {steps.length}
              </span>
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                {Math.round((currentStep / steps.length) * 100)}% Complete
              </span>
            </div>
            <Progress
              value={(currentStep / steps.length) * 100}
              className="h-3 rounded-full bg-gray-200 dark:bg-gray-700"
            />
          </div>
        </CardHeader>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            className="flex-1 overflow-y-auto"
          >
            <CardContent className="p-8 min-h-0">
              {renderStepContent()}
            </CardContent>
          </motion.div>
        </AnimatePresence>

        <CardFooter className="flex justify-between p-6 border-t-2 border-gray-100 dark:border-gray-800 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 flex-shrink-0">
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 1 || isSubmitting}
            className="px-6 py-3 rounded-xl border-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200 disabled:opacity-50"
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Previous
          </Button>

          {currentStep < steps.length ? (
            <Button
              onClick={nextStep}
              disabled={isSubmitting}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              Next
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating Device...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Create Device
                </>
              )}
            </Button>
          )}
        </CardFooter>
      </Card>

      {/* Connectivity Wizard */}
      <AnimatePresence>
        {showConnectivityWizard && createdDevice && (
          <DeviceConnectivityWizard
            device={{
              id: createdDevice.id,
              name: createdDevice.name,
              type: createdDevice.type as
                | "TEMPERATURE_SENSOR"
                | "HUMIDITY_SENSOR"
                | "MOTION_DETECTOR"
                | "OTHER",
              location: createdDevice.location || "",
              accessToken: `${createdDevice.id}-token`,
              deviceKey: `${createdDevice.id}-key`,
            }}
            onClose={() => setShowConnectivityWizard(false)}
            onComplete={() => {
              setShowConnectivityWizard(false);
              router.navigate({ to: "/devices" });
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}
