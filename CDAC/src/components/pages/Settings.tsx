"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { useAppearance, COLOR_SCHEMES } from "@/context/AppearanceContext";
import { useLanguage, AVAILABLE_LANGUAGES } from "@/context/LangContext";
import {
  Bell,
  Check,
  Database,
  Globe,
  HardDrive,
  Lock,
  MailCheck,
  Moon,
  Palette,
  Plus,
  Save,
  SettingsIcon,
  Shield,
  Sun,
  User,
  WifiIcon,
  Laptop,
  Zap,
  Rows,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export default function Settings() {
  const {
    themeMode,
    changeThemeMode,
    colorScheme,
    changeColorScheme,
    animationsEnabled,
    toggleAnimations,
  } = useAppearance();

  const { language, changeLanguage, t } = useLanguage();
  const { user } = useAuth();

  const [currentTab, setCurrentTab] = useState("appearance");
  const [saving, setSaving] = useState(false);

  const [formState, setFormState] = useState({
    notifications: { email: true, push: true, sms: false, alertsOnly: false },
    appearance: {
      theme: themeMode,
      density: "comfortable",
      animations: animationsEnabled,
      colorScheme: colorScheme,
      roundedCorners: true,
      fontSize: "medium",
    },
    system: {
      dataRetention: "90",
      backupFrequency: "daily",
      analyticsEnabled: true,
    },
    security: { twoFactor: false, sessionTimeout: "30", ipRestriction: false },
  });

  React.useEffect(() => {
    setFormState((prev) => ({
      ...prev,
      appearance: {
        ...prev.appearance,
        theme: themeMode,
        colorScheme: colorScheme,
        animations: animationsEnabled,
      },
    }));
  }, [themeMode, colorScheme, animationsEnabled]);

  const handleFormChange = (section: string, field: string, value: any) => {
    setFormState((prev) => ({
      ...prev,
      [section]: {
        ...prev[section as keyof typeof prev],
        [field]: value,
      },
    }));
  };

  const handleAppearanceChange = (field: string, value: any) => {
    setFormState((prev) => ({
      ...prev,
      appearance: {
        ...prev.appearance,
        [field]: value,
      },
    }));
    if (field === "theme") {
      changeThemeMode(value);
    } else if (field === "colorScheme") {
      changeColorScheme(value);
    } else if (field === "animations") {
      toggleAnimations(value);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setSaving(false);
  };

  const handleLanguageChange = (value: string) => {
    changeLanguage(value);
  };

  const pageVariants = {
    initial: { opacity: 0 },
    animate: {
      opacity: 1,
      transition: {
        when: "beforeChildren",
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.4 } },
  };

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      className="space-y-6"
    >
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account and application preferences
        </p>
      </div>

      {/* Settings Tabs */}
      <Tabs
        value={currentTab}
        onValueChange={setCurrentTab}
        className="space-y-6"
      >
        <div className="flex overflow-x-auto pb-2">
          <TabsList className="inline-flex h-10 items-center justify-center rounded-md bg-slate-100 p-1 dark:bg-slate-800">
            <TabsTrigger value="general" className="flex items-center">
              <SettingsIcon className="mr-2 h-4 w-4" />
              General
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center">
              <Bell className="mr-2 h-4 w-4" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="account" className="flex items-center">
              <User className="mr-2 h-4 w-4" />
              Account
            </TabsTrigger>
            <TabsTrigger value="appearance" className="flex items-center">
              <Palette className="mr-2 h-4 w-4" />
              Appearance
            </TabsTrigger>
            <TabsTrigger value="system" className="flex items-center">
              <HardDrive className="mr-2 h-4 w-4" />
              System
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center">
              <Shield className="mr-2 h-4 w-4" />
              Security
            </TabsTrigger>
          </TabsList>
        </div>

        {/* General Settings */}
        <TabsContent value="general">
          <motion.div variants={itemVariants} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>General Settings</CardTitle>
                <CardDescription>
                  Configure global application settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="app_name">Application Name</Label>
                  <Input id="app_name" defaultValue="C-DAC IoT Dashboard" />
                </div>

                <div className="grid gap-6 pt-4">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col gap-1">
                      <Label htmlFor="dark_mode_toggle_general">
                        Dark Mode
                      </Label>
                      <span className="text-sm text-muted-foreground">
                        Toggle between light and dark mode (global setting)
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Sun className="h-4 w-4 text-muted-foreground" />
                      <Switch
                        id="dark_mode_toggle_general"
                        checked={themeMode === "dark"}
                        onCheckedChange={(value) =>
                          changeThemeMode(value ? "dark" : "light")
                        }
                      />
                      <Moon className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex flex-col gap-1">
                      <Label htmlFor="sound_effects">Sound Effects</Label>
                      <span className="text-sm text-muted-foreground">
                        Enable sound effects for alerts and notifications
                      </span>
                    </div>
                    <Switch id="sound_effects" defaultChecked />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex flex-col gap-1">
                      <Label htmlFor="auto_refresh">Auto Refresh</Label>
                      <span className="text-sm text-muted-foreground">
                        Automatically refresh dashboard data
                      </span>
                    </div>
                    <Select defaultValue="30">
                      <SelectTrigger id="auto_refresh" className="w-32">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">Never</SelectItem>
                        <SelectItem value="10">10 seconds</SelectItem>
                        <SelectItem value="30">30 seconds</SelectItem>
                        <SelectItem value="60">1 minute</SelectItem>
                        <SelectItem value="300">5 minutes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline">Reset Defaults</Button>
                <Button
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Language & Region</CardTitle>
                <CardDescription>
                  Set your preferred language and regional settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <Label htmlFor="language">Language</Label>
                    <Select
                      value={language}
                      onValueChange={handleLanguageChange}
                    >
                      <SelectTrigger id="language">
                        <SelectValue placeholder="Select language" />
                      </SelectTrigger>
                      <SelectContent>
                        {AVAILABLE_LANGUAGES.map((lang) => (
                          <SelectItem key={lang.id} value={lang.id}>
                            {lang.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="timezone">Time Zone</Label>
                    <Select defaultValue="Asia/Kolkata">
                      <SelectTrigger id="timezone">
                        <SelectValue placeholder="Select timezone" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Asia/Kolkata">
                          India (GMT+5:30)
                        </SelectItem>
                        <SelectItem value="America/New_York">
                          Eastern Time (GMT-4)
                        </SelectItem>
                        <SelectItem value="Europe/London">
                          London (GMT+1)
                        </SelectItem>
                        <SelectItem value="Asia/Tokyo">
                          Tokyo (GMT+9)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="date_format">Date Format</Label>
                    <Select defaultValue="dd/mm/yyyy">
                      <SelectTrigger id="date_format">
                        <SelectValue placeholder="Select date format" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dd/mm/yyyy">DD/MM/YYYY</SelectItem>
                        <SelectItem value="mm/dd/yyyy">MM/DD/YYYY</SelectItem>
                        <SelectItem value="yyyy-mm-dd">YYYY-MM-DD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="time_format">Time Format</Label>
                    <Select defaultValue="24h">
                      <SelectTrigger id="time_format">
                        <SelectValue placeholder="Select time format" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="12h">12-hour (AM/PM)</SelectItem>
                        <SelectItem value="24h">24-hour</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  className="ml-auto bg-blue-600 hover:bg-blue-700"
                  onClick={handleSave}
                  disabled={saving}
                >
                  <Globe className="mr-2 h-4 w-4" />
                  Update Region Settings
                </Button>
              </CardFooter>
            </Card>
          </motion.div>
        </TabsContent>

        {/* Notifications Settings */}
        <TabsContent value="notifications">
          <motion.div variants={itemVariants} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>
                  Configure how and when you receive notifications
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="grid gap-6">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col gap-1">
                        <Label className="font-medium">
                          Email Notifications
                        </Label>
                        <span className="text-sm text-muted-foreground">
                          Receive notifications via email
                        </span>
                      </div>
                      <Switch
                        checked={formState.notifications.email}
                        onCheckedChange={(value) =>
                          handleFormChange("notifications", "email", value)
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex flex-col gap-1">
                        <Label className="font-medium">
                          Push Notifications
                        </Label>
                        <span className="text-sm text-muted-foreground">
                          Receive push notifications in browser
                        </span>
                      </div>
                      <Switch
                        checked={formState.notifications.push}
                        onCheckedChange={(value) =>
                          handleFormChange("notifications", "push", value)
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex flex-col gap-1">
                        <Label className="font-medium">SMS Notifications</Label>
                        <span className="text-sm text-muted-foreground">
                          Receive text messages for critical alerts
                        </span>
                      </div>
                      <Switch
                        checked={formState.notifications.sms}
                        onCheckedChange={(value) =>
                          handleFormChange("notifications", "sms", value)
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex flex-col gap-1">
                        <Label className="font-medium">
                          Critical Alerts Only
                        </Label>
                        <span className="text-sm text-muted-foreground">
                          Only notify for high-priority alerts
                        </span>
                      </div>
                      <Switch
                        checked={formState.notifications.alertsOnly}
                        onCheckedChange={(value) =>
                          handleFormChange("notifications", "alertsOnly", value)
                        }
                      />
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h3 className="text-sm font-medium">Notification Types</h3>

                    <div className="grid gap-4">
                      {[
                        {
                          id: "device_status",
                          label: "Device Status Changes",
                          default: true,
                        },
                        { id: "alerts", label: "System Alerts", default: true },
                        {
                          id: "thresholds",
                          label: "Threshold Breaches",
                          default: true,
                        },
                        {
                          id: "maintenance",
                          label: "Maintenance Events",
                          default: false,
                        },
                        {
                          id: "reports",
                          label: "Weekly Reports",
                          default: false,
                        },
                      ].map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center space-x-2"
                        >
                          <Switch id={item.id} defaultChecked={item.default} />
                          <Label htmlFor={item.id}>{item.label}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  className="ml-auto bg-blue-600 hover:bg-blue-700"
                  onClick={handleSave}
                  disabled={saving}
                >
                  <Bell className="mr-2 h-4 w-4" />
                  Save Notification Settings
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Communication Channels</CardTitle>
                <CardDescription>
                  Manage your contact information for notifications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="flex">
                    <Input
                      id="email"
                      defaultValue={user?.email || "admin@example.com"}
                      className="rounded-r-none"
                    />
                    <Button className="rounded-l-none" variant="secondary">
                      <MailCheck className="h-4 w-4 mr-2" />
                      Verify
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <div className="flex">
                    <Input
                      id="phone"
                      defaultValue="+91 98765 43210"
                      className="rounded-r-none"
                    />
                    <Button className="rounded-l-none" variant="secondary">
                      <Check className="h-4 w-4 mr-2" />
                      Verify
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label htmlFor="schedule">Quiet Hours</Label>
                    <Badge variant="outline">Optional</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Select defaultValue="22">
                        <SelectTrigger id="quiet_start">
                          <SelectValue placeholder="Start time" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 24 }).map((_, i) => (
                            <SelectItem key={i} value={i.toString()}>
                              {i.toString().padStart(2, "0")}:00
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Select defaultValue="7">
                        <SelectTrigger id="quiet_end">
                          <SelectValue placeholder="End time" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 24 }).map((_, i) => (
                            <SelectItem key={i} value={i.toString()}>
                              {i.toString().padStart(2, "0")}:00
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Only critical alerts will be sent during quiet hours.
                  </p>
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  className="ml-auto"
                  onClick={handleSave}
                  disabled={saving}
                >
                  <Save className="mr-2 h-4 w-4" />
                  Save Contact Info
                </Button>
              </CardFooter>
            </Card>
          </motion.div>
        </TabsContent>

        {/* Account Settings */}
        <TabsContent value="account">
          <motion.div variants={itemVariants} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Account Information</CardTitle>
                <CardDescription>
                  Manage your personal information and account settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col md:flex-row gap-8">
                  <div className="flex-shrink-0 flex flex-col items-center">
                    <div className="h-24 w-24 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                      <User className="h-12 w-12 text-slate-500" />
                    </div>
                    <Button size="sm" variant="outline">
                      Change Avatar
                    </Button>
                  </div>

                  <div className="space-y-4 flex-1">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label htmlFor="full_name">Full Name</Label>
                        <Input
                          id="full_name"
                          defaultValue={user?.fullName || "Admin User"}
                        />
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor="job_title">Job Title</Label>
                        <Input
                          id="job_title"
                          defaultValue="System Administrator"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          defaultValue={user?.email || "admin@example.com"}
                          disabled
                        />
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor="phone">Phone</Label>
                        <Input id="phone" defaultValue="+91 98765 43210" />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="timezone_account">Time Zone</Label>
                      <Select defaultValue="Asia/Kolkata">
                        <SelectTrigger id="timezone_account">
                          <SelectValue placeholder="Select timezone" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Asia/Kolkata">
                            India (GMT+5:30)
                          </SelectItem>
                          <SelectItem value="America/New_York">
                            Eastern Time (GMT-4)
                          </SelectItem>
                          <SelectItem value="Europe/London">
                            London (GMT+1)
                          </SelectItem>
                          <SelectItem value="Asia/Tokyo">
                            Tokyo (GMT+9)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  className="ml-auto bg-blue-600 hover:bg-blue-700"
                  onClick={handleSave}
                  disabled={saving}
                >
                  <User className="mr-2 h-4 w-4" />
                  Update Profile
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Account Access</CardTitle>
                <CardDescription>
                  Manage password and authentication methods
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="current_password">Current Password</Label>
                    <Input id="current_password" type="password" />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="new_password">New Password</Label>
                    <Input id="new_password" type="password" />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="confirm_password">
                      Confirm New Password
                    </Label>
                    <Input id="confirm_password" type="password" />
                  </div>
                </div>

                <p className="text-sm text-muted-foreground">
                  Password must be at least 8 characters long and include
                  uppercase and lowercase letters, a number, and a special
                  character.
                </p>
              </CardContent>
              <CardFooter>
                <Button
                  variant="outline"
                  className="mr-auto text-red-500 hover:text-red-600 hover:bg-red-50"
                >
                  Delete Account
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  <Lock className="mr-2 h-4 w-4" />
                  Change Password
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Linked Accounts</CardTitle>
                <CardDescription>
                  Connect and manage your linked accounts
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { name: "Google", connected: true },
                    { name: "Microsoft", connected: false },
                    { name: "GitHub", connected: false },
                  ].map((account) => (
                    <div
                      key={account.name}
                      className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                          {account.name === "Google" ? (
                            <svg className="h-5 w-5" viewBox="0 0 24 24">
                              <path
                                d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5.46 8.12h-2.19v1.88h-1.88v1.88h-1.88v-1.88H9.42v-1.88h2.08V8.24h1.88v1.88h2.08v-1.88h2z"
                                fill="currentColor"
                              />
                            </svg>
                          ) : account.name === "Microsoft" ? (
                            <WifiIcon className="h-5 w-5" />
                          ) : (
                            <Globe className="h-5 w-5" />
                          )}
                        </div>
                        <div>
                          <h4 className="text-sm font-medium">
                            {account.name}
                          </h4>
                          <p className="text-xs text-muted-foreground">
                            {account.connected ? "Connected" : "Not connected"}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant={account.connected ? "outline" : "default"}
                        size="sm"
                      >
                        {account.connected ? "Disconnect" : "Connect"}
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* Appearance Tab */}
        <TabsContent value="appearance">
          <motion.div variants={itemVariants} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="w-5 h-5 text-primary" />
                  Appearance
                </CardTitle>
                <CardDescription>
                  Customize the look and feel of the application. Changes are
                  applied live.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Theme</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      {
                        id: "light",
                        label: "Light",
                        icon: <Sun className="h-5 w-5" />,
                      },
                      {
                        id: "dark",
                        label: "Dark",
                        icon: <Moon className="h-5 w-5" />,
                      },
                      {
                        id: "system",
                        label: "System",
                        icon: <Laptop className="h-5 w-5" />,
                      },
                    ].map((themeOption) => (
                      <motion.div
                        key={themeOption.id}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        className={cn(
                          "flex flex-col items-center justify-center rounded-lg border-2 p-4 cursor-pointer transition-all duration-200",
                          formState.appearance.theme === themeOption.id
                            ? "border-primary bg-primary/10 shadow-md"
                            : "border-border hover:border-primary/50 dark:hover:border-primary/70"
                        )}
                        onClick={() =>
                          handleAppearanceChange("theme", themeOption.id)
                        }
                      >
                        <div className="mb-2 text-muted-foreground group-hover:text-primary">
                          {themeOption.icon}
                        </div>
                        <span className="text-sm font-medium">
                          {themeOption.label}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Color Scheme</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                    {COLOR_SCHEMES.map((scheme) => (
                      <motion.div
                        key={scheme.id}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        className={cn(
                          "p-3 rounded-lg border-2 cursor-pointer transition-all duration-200 flex flex-col items-center justify-center",
                          formState.appearance.colorScheme === scheme.id
                            ? "border-primary bg-primary/10 shadow-md"
                            : "border-border hover:border-primary/50 dark:hover:border-primary/70"
                        )}
                        onClick={() =>
                          handleAppearanceChange("colorScheme", scheme.id)
                        }
                      >
                        <div className="flex space-x-1 mb-1.5">
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: scheme.primary.light }}
                          ></div>
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: scheme.secondary.light }}
                          ></div>
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: scheme.accent.light }}
                          ></div>
                        </div>
                        <span className="text-xs font-medium text-center">
                          {scheme.name}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Interface Density
                  </Label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      {
                        id: "compact",
                        label: "Compact",
                        icon: <Rows className="w-4 h-4 transform scale-y-75" />,
                      },
                      {
                        id: "comfortable",
                        label: "Comfortable",
                        icon: <Rows className="w-4 h-4" />,
                      },
                      {
                        id: "spacious",
                        label: "Spacious",
                        icon: (
                          <Rows className="w-4 h-4 transform scale-y-125" />
                        ),
                      },
                    ].map((density) => (
                      <motion.div
                        key={density.id}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        className={cn(
                          "flex flex-col items-center justify-center rounded-lg border-2 p-3 cursor-pointer transition-all duration-200",
                          formState.appearance.density === density.id
                            ? "border-primary bg-primary/10 shadow-md"
                            : "border-border hover:border-primary/50 dark:hover:border-primary/70"
                        )}
                        onClick={() =>
                          handleAppearanceChange("density", density.id)
                        }
                      >
                        <div className="mb-1 text-muted-foreground">
                          {density.icon}
                        </div>
                        <span className="text-xs font-medium">
                          {density.label}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4 pt-2">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex flex-col gap-0.5">
                      <Label className="font-medium flex items-center gap-1.5">
                        <Zap className="w-4 h-4 text-amber-500" /> Animations
                      </Label>
                      <span className="text-xs text-muted-foreground">
                        Enable motion animations and effects throughout the app.
                      </span>
                    </div>
                    <Switch
                      checked={formState.appearance.animations}
                      onCheckedChange={(value) =>
                        handleAppearanceChange("animations", value)
                      }
                      className="data-[state=checked]:bg-primary"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex flex-col gap-0.5">
                      <Label className="font-medium">Rounded Corners</Label>
                      <span className="text-xs text-muted-foreground">
                        Enable rounded UI elements.
                      </span>
                    </div>
                    <Switch
                      checked={formState.appearance.roundedCorners}
                      onCheckedChange={(value) =>
                        handleAppearanceChange("roundedCorners", value)
                      }
                      className="data-[state=checked]:bg-primary"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex flex-col gap-0.5">
                      <Label className="font-medium">Font Size</Label>
                      <span className="text-xs text-muted-foreground">
                        Adjust the application font size.
                      </span>
                    </div>
                    <Select
                      value={formState.appearance.fontSize}
                      onValueChange={(value) =>
                        handleAppearanceChange("fontSize", value)
                      }
                    >
                      <SelectTrigger className="w-[120px]">
                        <SelectValue placeholder="Select size" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="small">Small</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="large">Large</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-primary" />
                  Language & Region
                </CardTitle>
                <CardDescription>
                  Set your preferred language and regional settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="language" className="font-medium">
                      Language
                    </Label>
                    <Select
                      value={language}
                      onValueChange={handleLanguageChange}
                    >
                      <SelectTrigger id="language" className="w-full">
                        <SelectValue placeholder="Select language" />
                      </SelectTrigger>
                      <SelectContent>
                        {AVAILABLE_LANGUAGES.map((lang) => (
                          <SelectItem key={lang.id} value={lang.id}>
                            {lang.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      Changes will apply immediately across the application
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="timezone" className="font-medium">
                      Time Zone
                    </Label>
                    <Select defaultValue="Asia/Kolkata">
                      <SelectTrigger id="timezone">
                        <SelectValue placeholder="Select timezone" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Asia/Kolkata">
                          India (GMT+5:30)
                        </SelectItem>
                        <SelectItem value="America/New_York">
                          Eastern Time (GMT-4)
                        </SelectItem>
                        <SelectItem value="Europe/London">
                          London (GMT+1)
                        </SelectItem>
                        <SelectItem value="Asia/Tokyo">
                          Tokyo (GMT+9)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="date_format" className="font-medium">
                      Date Format
                    </Label>
                    <Select defaultValue="dd/mm/yyyy">
                      <SelectTrigger id="date_format">
                        <SelectValue placeholder="Select date format" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dd/mm/yyyy">DD/MM/YYYY</SelectItem>
                        <SelectItem value="mm/dd/yyyy">MM/DD/YYYY</SelectItem>
                        <SelectItem value="yyyy-mm-dd">YYYY-MM-DD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="time_format" className="font-medium">
                      Time Format
                    </Label>
                    <Select defaultValue="24h">
                      <SelectTrigger id="time_format">
                        <SelectValue placeholder="Select time format" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="12h">12-hour (AM/PM)</SelectItem>
                        <SelectItem value="24h">24-hour</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  className="ml-auto"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-t-transparent" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Globe className="mr-2 h-4 w-4" />
                      Update Regional Settings
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          </motion.div>
        </TabsContent>

        {/* System Tab */}
        <TabsContent value="system">
          <motion.div variants={itemVariants} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>System Settings</CardTitle>
                <CardDescription>
                  Configure system-wide settings and data management
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-6">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="data_retention">
                      Data Retention Period
                    </Label>
                    <Select
                      value={formState.system.dataRetention}
                      onValueChange={(value) =>
                        handleFormChange("system", "dataRetention", value)
                      }
                    >
                      <SelectTrigger id="data_retention">
                        <SelectValue placeholder="Select period" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="30">30 days</SelectItem>
                        <SelectItem value="60">60 days</SelectItem>
                        <SelectItem value="90">90 days</SelectItem>
                        <SelectItem value="180">6 months</SelectItem>
                        <SelectItem value="365">1 year</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Raw sensor data older than this will be automatically
                      archived.
                    </p>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label htmlFor="backup_frequency">Backup Frequency</Label>
                    <Select
                      value={formState.system.backupFrequency}
                      onValueChange={(value) =>
                        handleFormChange("system", "backupFrequency", value)
                      }
                    >
                      <SelectTrigger id="backup_frequency">
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hourly">Hourly</SelectItem>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex flex-col gap-1">
                      <Label className="font-medium">Usage Analytics</Label>
                      <span className="text-sm text-muted-foreground">
                        Share anonymous usage data to improve the system
                      </span>
                    </div>
                    <Switch
                      checked={formState.system.analyticsEnabled}
                      onCheckedChange={(value) =>
                        handleFormChange("system", "analyticsEnabled", value)
                      }
                    />
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="text-sm font-medium">System Maintenance</h3>

                  <div className="grid gap-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Clean Cache</p>
                        <p className="text-sm text-muted-foreground">
                          Clear temporary files and cached data
                        </p>
                      </div>
                      <Button variant="outline" size="sm">
                        Clear Cache
                      </Button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Database Optimization</p>
                        <p className="text-sm text-muted-foreground">
                          Optimize database for better performance
                        </p>
                      </div>
                      <Button variant="outline" size="sm">
                        Optimize
                      </Button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Export All Data</p>
                        <p className="text-sm text-muted-foreground">
                          Download all system data as JSON
                        </p>
                      </div>
                      <Button variant="outline" size="sm">
                        Export
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  className="ml-auto bg-blue-600 hover:bg-blue-700"
                  onClick={handleSave}
                  disabled={saving}
                >
                  <Database className="mr-2 h-4 w-4" />
                  Save System Settings
                </Button>
              </CardFooter>
            </Card>
          </motion.div>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security">
          <motion.div variants={itemVariants} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Security Settings</CardTitle>
                <CardDescription>
                  Configure security and authentication preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col gap-1">
                    <Label className="font-medium">
                      Two-Factor Authentication
                    </Label>
                    <span className="text-sm text-muted-foreground">
                      Require a verification code when logging in
                    </span>
                  </div>
                  <Switch
                    checked={formState.security.twoFactor}
                    onCheckedChange={(value) =>
                      handleFormChange("security", "twoFactor", value)
                    }
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="session_timeout">
                    Session Timeout (minutes)
                  </Label>
                  <Select
                    value={formState.security.sessionTimeout}
                    onValueChange={(value) =>
                      handleFormChange("security", "sessionTimeout", value)
                    }
                  >
                    <SelectTrigger id="session_timeout">
                      <SelectValue placeholder="Select timeout" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5 minutes</SelectItem>
                      <SelectItem value="15">15 minutes</SelectItem>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="60">1 hour</SelectItem>
                      <SelectItem value="120">2 hours</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Automatically log out after the specified period of
                    inactivity.
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex flex-col gap-1">
                    <Label className="font-medium">IP Restriction</Label>
                    <span className="text-sm text-muted-foreground">
                      Limit access to specific IP addresses
                    </span>
                  </div>
                  <Switch
                    checked={formState.security.ipRestriction}
                    onCheckedChange={(value) =>
                      handleFormChange("security", "ipRestriction", value)
                    }
                  />
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="text-sm font-medium">Access Logs</h3>

                  <div className="border rounded-md">
                    <div className="p-4 border-b bg-slate-50 dark:bg-slate-800/50">
                      <h4 className="font-medium">Recent Login Activity</h4>
                    </div>
                    <div className="divide-y">
                      {[
                        {
                          timestamp: "Today, 10:45 AM",
                          ip: "192.168.1.1",
                          location: "New Delhi, India",
                          device: "Chrome / Windows",
                        },
                        {
                          timestamp: "Yesterday, 3:30 PM",
                          ip: "192.168.1.1",
                          location: "New Delhi, India",
                          device: "Safari / iOS",
                        },
                        {
                          timestamp: "3 days ago",
                          ip: "192.168.1.1",
                          location: "New Delhi, India",
                          device: "Firefox / Linux",
                        },
                      ].map((log, i) => (
                        <div key={i} className="p-4">
                          <div className="flex justify-between mb-1">
                            <span className="font-medium">{log.timestamp}</span>
                            <Badge variant="outline">
                              {i === 0 ? "Current" : "Previous"}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            <p>{log.device}</p>
                            <p>
                              IP: {log.ip} • {log.location}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Button variant="outline" className="w-full text-sm">
                    View Full Login History
                  </Button>
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  className="ml-auto bg-blue-600 hover:bg-blue-700"
                  onClick={handleSave}
                  disabled={saving}
                >
                  <Shield className="mr-2 h-4 w-4" />
                  Save Security Settings
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>API Access</CardTitle>
                <CardDescription>
                  Manage API keys and permissions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <Label>API Keys</Label>
                  <div className="border rounded-md">
                    <div className="divide-y">
                      {[
                        {
                          name: "Production API Key",
                          status: "Active",
                          created: "3 months ago",
                        },
                        {
                          name: "Development API Key",
                          status: "Active",
                          created: "1 month ago",
                        },
                        {
                          name: "Testing API Key",
                          status: "Expired",
                          created: "6 months ago",
                        },
                      ].map((key, i) => (
                        <div
                          key={i}
                          className="p-4 flex items-center justify-between"
                        >
                          <div>
                            <h4 className="font-medium">{key.name}</h4>
                            <p className="text-xs text-muted-foreground">
                              Created {key.created}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge
                              variant={
                                key.status === "Active"
                                  ? "default"
                                  : "secondary"
                              }
                            >
                              {key.status}
                            </Badge>
                            <Button variant="ghost" size="sm">
                              Manage
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <Button size="sm" className="mt-2">
                  <Plus className="w-4 h-4 mr-2" />
                  Create New API Key
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
