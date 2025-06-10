"use client";

import type React from "react";
import { useState, useEffect, useCallback } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { useAppearance } from "@/context/AppearanceContext";
import { useAuth } from "@/context/AuthContext";
import {
  Activity,
  AlertCircle,
  Bell,
  ChevronDown,
  Command,
  HelpCircle,
  Laptop,
  LineChart,
  Menu,
  Settings,
  Sun,
  Moon,
  X,
  LogOut,
  Plus,
  CheckCircle,
  Clock,
  AlertTriangle,
  Info,
  Wifi,
  WifiOff,
  Dot,
  Check,
  ExternalLink,
  Shield,
  User as UserCircle,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import alertsService from "@/services/alertService";
import type { Alert } from "@/types";
import { AlertStatus, AlertSeverity } from "@/types";

interface AppLayoutProps {
  children: React.ReactNode;
  currentPageName: string;
}

interface NavItem {
  name: string;
  icon: React.ReactNode;
  path: string;
  badge?: number;
}

interface NotificationAlert extends Alert {
  isNew?: boolean;
}

export default function Layout({ children, currentPageName }: AppLayoutProps) {
  const location = useLocation();
  const [mobileNav, setMobileNav] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [alerts, setAlerts] = useState<NotificationAlert[]>([]);
  const [loadingAlerts, setLoadingAlerts] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [currentTime, setCurrentTime] = useState(new Date());

  const { themeMode, changeThemeMode } = useAppearance();
  const { user, logout } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const istOffset = 5.5 * 60 * 60 * 1000;
      const istTime = new Date(now.getTime() + istOffset);
      setCurrentTime(istTime);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Check online status
  useEffect(() => {
    const handleOnlineStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener("online", handleOnlineStatus);
    window.addEventListener("offline", handleOnlineStatus);
    return () => {
      window.removeEventListener("online", handleOnlineStatus);
      window.removeEventListener("offline", handleOnlineStatus);
    };
  }, []);

  // Fetch alerts for notifications
  const fetchAlerts = useCallback(async () => {
    try {
      setLoadingAlerts(true);
      const response = await alertsService.getAllAlerts({
        status: AlertStatus.ACTIVE,
        limit: 10,
      });

      const alertsData = Array.isArray(response.alerts) ? response.alerts : [];
      setAlerts(alertsData);

      // Count unread (active) alerts
      const activeAlerts = alertsData.filter(
        (alert) => alert.status === AlertStatus.ACTIVE
      );
      setUnreadCount(activeAlerts.length);
    } catch (error) {
      console.error("Failed to fetch alerts:", error);
      setAlerts([]);
      setUnreadCount(0);
    } finally {
      setLoadingAlerts(false);
    }
  }, []);

  // Load alerts on mount and set up polling
  useEffect(() => {
    fetchAlerts();

    // Poll for new alerts every 30 seconds
    const interval = setInterval(fetchAlerts, 30000);
    return () => clearInterval(interval);
  }, [fetchAlerts]);

  // WebSocket connection for real-time alerts (if available)
  useEffect(() => {
    // This would connect to your WebSocket for real-time updates
    // const ws = new WebSocket('ws://localhost:3001/ws');
    // ws.onmessage = (event) => {
    //   const newAlert = JSON.parse(event.data);
    //   if (newAlert.type === 'new_alert') {
    //     setAlerts(prev => [{ ...newAlert.data, isNew: true }, ...prev.slice(0, 9)]);
    //     setUnreadCount(prev => prev + 1);
    //     toast({
    //       title: "New Alert",
    //       description: newAlert.data.title,
    //       variant: newAlert.data.severity === AlertSeverity.CRITICAL ? "destructive" : "default"
    //     });
    //   }
    // };
    // return () => ws.close();
  }, [toast]);

  const toggleDarkMode = () => {
    changeThemeMode(themeMode === "dark" ? "light" : "dark");
  };

  const markAllAsRead = async () => {
    try {
      setUnreadCount(0);
      setAlerts((prev) => prev.map((alert) => ({ ...alert, isNew: false })));
      toast({
        title: "Success",
        description: "All notifications marked as read",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to mark notifications as read",
        variant: "destructive",
      });
    }
  };

  const clearNotification = async (alertId: string) => {
    try {
      setAlerts((prev) => prev.filter((alert) => alert.id !== alertId));
      if (unreadCount > 0) {
        setUnreadCount((prev) => prev - 1);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to clear notification",
        variant: "destructive",
      });
    }
  };

  const navItems: NavItem[] = [
    {
      name: "Dashboard",
      icon: <Activity className="h-5 w-5" />,
      path: "/",
    },
    {
      name: "Devices",
      icon: <Laptop className="h-5 w-5" />,
      path: "/devices",
    },
    {
      name: "Analytics",
      icon: <LineChart className="h-5 w-5" />,
      path: "/analytics",
    },
    {
      name: "Alerts",
      icon: <AlertCircle className="h-5 w-5" />,
      path: "/alerts",
      badge: unreadCount > 0 ? unreadCount : undefined,
    },
    {
      name: "Settings",
      icon: <Settings className="h-5 w-5" />,
      path: "/settings",
    },
  ];

  const currentPath = location.pathname;

  const formatTime = (date: Date) => {
    return date.toISOString().slice(0, 19).replace("T", " ");
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const alertTime = new Date(timestamp);
    const diffMs = now.getTime() - alertTime.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffMinutes < 1) return "Just now";
    if (diffMinutes < 60) return `${diffMinutes}m ago`;

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const getSeverityConfig = (severity: AlertSeverity) => {
    const configs = {
      [AlertSeverity.LOW]: {
        icon: <Info className="w-4 h-4" />,
        color: "text-blue-600 dark:text-blue-400",
        bg: "bg-blue-100 dark:bg-blue-900/30",
        border: "border-blue-200 dark:border-blue-800",
      },
      [AlertSeverity.MEDIUM]: {
        icon: <AlertTriangle className="w-4 h-4" />,
        color: "text-amber-600 dark:text-amber-400",
        bg: "bg-amber-100 dark:bg-amber-900/30",
        border: "border-amber-200 dark:border-amber-800",
      },
      [AlertSeverity.HIGH]: {
        icon: <AlertTriangle className="w-4 h-4" />,
        color: "text-orange-600 dark:text-orange-400",
        bg: "bg-orange-100 dark:bg-orange-900/30",
        border: "border-orange-200 dark:border-orange-800",
      },
      [AlertSeverity.CRITICAL]: {
        icon: <AlertTriangle className="w-4 h-4" />,
        color: "text-red-600 dark:text-red-400",
        bg: "bg-red-100 dark:bg-red-900/30",
        border: "border-red-200 dark:border-red-800",
      },
    };
    return configs[severity] || configs[AlertSeverity.LOW];
  };

  // Get user display info
  const getUserDisplayName = () => {
    return user?.fullName || user?.username || "User";
  };

  const getUserInitials = () => {
    if (user?.fullName) {
      return user.fullName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    if (user?.username) {
      return user.username.substring(0, 2).toUpperCase();
    }
    return "U";
  };

  const getUserRole = () => {
    return user?.role === "ADMIN" ? "Administrator" : "IoT Dashboard User";
  };

  return (
    <TooltipProvider>
      <div className={cn("flex h-screen overflow-hidden bg-background")}>
        <motion.aside
          className="hidden lg:flex lg:w-64 flex-col bg-card/50 backdrop-blur-sm border-r border-border/50 overflow-y-auto shadow-lg"
          initial={{ x: -64, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
        >
          {/* Logo */}
          <div className="px-6 py-5 border-b border-border/50">
            <motion.div
              className="flex items-center gap-3"
              whileHover={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg">
                <Command className="w-6 h-6" />
              </div>
              <div>
                <div className="font-bold text-xl tracking-tight text-foreground">
                  <span className="text-primary">C-DAC</span>
                  <span className="text-muted-foreground"> IoT</span>
                </div>
                <div className="text-xs text-muted-foreground font-medium">
                  Smart Device Hub
                </div>
              </div>
            </motion.div>
          </div>

          {/* User Info */}
          <div className="px-6 py-4 border-b border-border/50">
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9 ring-2 ring-primary/20">
                <AvatarImage src={user?.avatar || "/placeholder.svg"} />
                <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                  {getUserInitials()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm text-foreground truncate">
                  {user?.username || "Nikhil178-tech"}
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <div
                    className={cn(
                      "w-2 h-2 rounded-full",
                      isOnline ? "bg-green-500" : "bg-red-500"
                    )}
                  />
                  <span>{isOnline ? "Online" : "Offline"}</span>
                  {user?.role === "ADMIN" && (
                    <>
                      <Dot className="w-3 h-3" />
                      <Shield className="w-3 h-3 text-amber-500" />
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Nav Items */}
          <nav className="px-3 py-4 flex-1">
            <div className="space-y-2">
              {navItems.map((item) => (
                <motion.div
                  key={item.name}
                  whileHover={{ scale: 1.02, x: 4 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                  <Link
                    to={item.path}
                    className={cn(
                      "flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
                      currentPath === item.path
                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      {item.icon}
                      {item.name}
                    </div>
                    {item.badge && (
                      <Badge
                        variant={
                          currentPath === item.path
                            ? "secondary"
                            : "destructive"
                        }
                        className="h-5 min-w-[20px] text-xs px-1.5 text-white"
                      >
                        {item.badge > 99 ? "99+" : item.badge}
                      </Badge>
                    )}
                  </Link>
                </motion.div>
              ))}
            </div>

            {/* Add Device Button */}
            <div className="mt-8 px-1 bg-blue-700 hover:bg-blue-800 rounded-2xl text-white">
              <Link to="/add-device">
                <Button className="w-full justify-start gap-3 h-11 rounded-xl bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl transition-all duration-200">
                  <Plus className="h-4 w-4" />
                  Add New Device
                </Button>
              </Link>
            </div>
          </nav>

          {/* System Status */}
          <div className="p-4 border-t border-border/50">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">System Status</span>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-green-600 dark:text-green-400 font-medium">
                    All Good
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={toggleDarkMode}
                      className="text-muted-foreground hover:text-foreground h-8 w-8 p-0"
                    >
                      {themeMode === "dark" ? (
                        <Sun className="h-4 w-4" />
                      ) : (
                        <Moon className="h-4 w-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    Switch to {themeMode === "dark" ? "light" : "dark"} mode
                  </TooltipContent>
                </Tooltip>

                <div className="flex items-center gap-1">
                  {isOnline ? (
                    <Wifi className="h-4 w-4 text-green-500" />
                  ) : (
                    <WifiOff className="h-4 w-4 text-red-500" />
                  )}
                </div>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-foreground h-8 w-8 p-0"
                    >
                      <HelpCircle className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Help & Documentation</TooltipContent>
                </Tooltip>
              </div>
            </div>
          </div>
        </motion.aside>

        {/* Mobile sidebar */}
        <AnimatePresence>
          {mobileNav && (
            <>
              <motion.div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setMobileNav(false)}
              />
              <motion.div
                className="fixed inset-y-0 left-0 w-72 bg-card z-50 lg:hidden overflow-y-auto border-r border-border shadow-2xl"
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              >
                {/* Mobile header */}
                <div className="flex justify-between items-center p-4 border-b border-border">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
                      <Command className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="font-bold text-lg tracking-tight text-foreground">
                        <span className="text-primary">C-DAC</span>
                        <span className="text-muted-foreground"> IoT</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Smart Device Hub
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setMobileNav(false)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>

                {/* Mobile user info */}
                <div className="p-4 border-b border-border">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 ring-2 ring-primary/20">
                      <AvatarImage src={user?.avatar || "/placeholder.svg"} />
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {getUserInitials()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-semibold text-foreground">
                        {user?.username || "Nikhil178-tech"}
                      </div>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <div
                          className={cn(
                            "w-2 h-2 rounded-full",
                            isOnline ? "bg-green-500" : "bg-red-500"
                          )}
                        />
                        <span>{isOnline ? "Online" : "Offline"}</span>
                        {user?.role === "ADMIN" && (
                          <>
                            <Dot className="w-3 h-3" />
                            <Shield className="w-3 h-3 text-amber-500" />
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Mobile nav */}
                <nav className="p-3">
                  <div className="space-y-2">
                    {navItems.map((item) => (
                      <Link
                        key={item.name}
                        to={item.path}
                        className={cn(
                          "flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all",
                          currentPath === item.path
                            ? "bg-primary text-primary-foreground shadow-lg"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                        onClick={() => setMobileNav(false)}
                      >
                        <div className="flex items-center gap-3">
                          {item.icon}
                          {item.name}
                        </div>
                        {item.badge && (
                          <Badge
                            variant={
                              currentPath === item.path
                                ? "secondary"
                                : "destructive"
                            }
                            className="h-5 min-w-[20px] text-xs"
                          >
                            {item.badge > 99 ? "99+" : item.badge}
                          </Badge>
                        )}
                      </Link>
                    ))}
                  </div>

                  {/* Mobile Add Device Button */}
                  <div className="mt-6">
                    <Link to="/add-device" onClick={() => setMobileNav(false)}>
                      <Button className="w-full justify-start gap-3 h-11 rounded-xl">
                        <Plus className="h-4 w-4" />
                        Add New Device
                      </Button>
                    </Link>
                  </div>
                </nav>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Main content */}
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Enhanced Topbar */}
          <motion.header
            className="h-16 border-b border-border/50 bg-card/30 backdrop-blur-md flex items-center justify-between px-4 shadow-sm"
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.1, ease: "easeOut" }}
          >
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileNav(true)}
                className="lg:hidden text-muted-foreground hover:text-foreground"
              >
                <Menu className="h-5 w-5" />
              </Button>

              <div>
                <h1 className="text-xl font-bold text-foreground">
                  {currentPageName}
                </h1>
                <div className="hidden sm:block text-xs text-muted-foreground">
                  {formatTime(currentTime)}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 md:gap-3">
              {/* Theme toggle for desktop */}
              <div className="hidden lg:block">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={toggleDarkMode}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      {themeMode === "dark" ? (
                        <Sun className="h-5 w-5" />
                      ) : (
                        <Moon className="h-5 w-5" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    Switch to {themeMode === "dark" ? "light" : "dark"} mode
                  </TooltipContent>
                </Tooltip>
              </div>

              {/* Notifications */}
              <Popover
                open={notificationsOpen}
                onOpenChange={setNotificationsOpen}
              >
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="relative text-muted-foreground hover:text-foreground"
                  >
                    <Bell className="h-5 w-5" />
                    <AnimatePresence>
                      {unreadCount > 0 && (
                        <motion.span
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0 }}
                          className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs font-medium flex items-center justify-center"
                        >
                          {unreadCount > 99 ? "99+" : unreadCount}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0" align="end">
                  <div className="p-4 border-b border-border">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-lg">Notifications</h3>
                      {unreadCount > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={markAllAsRead}
                          className="text-xs h-7"
                        >
                          <Check className="w-3 h-3 mr-1" />
                          Mark all read
                        </Button>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <p className="text-sm text-muted-foreground mt-1">
                        You have {unreadCount} unread alert
                        {unreadCount !== 1 ? "s" : ""}
                      </p>
                    )}
                  </div>

                  <ScrollArea className="h-80">
                    {loadingAlerts ? (
                      <div className="p-4 space-y-3">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="flex gap-3">
                            <Skeleton className="h-4 w-4 rounded-full" />
                            <div className="flex-1 space-y-2">
                              <Skeleton className="h-3 w-3/4" />
                              <Skeleton className="h-3 w-1/2" />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : alerts.length === 0 ? (
                      <div className="p-8 text-center">
                        <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-3" />
                        <p className="text-sm font-medium">All caught up!</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          No active alerts at the moment
                        </p>
                      </div>
                    ) : (
                      <div className="p-2">
                        {alerts.map((alert) => {
                          const severityConfig = getSeverityConfig(
                            alert.severity
                          );
                          return (
                            <motion.div
                              key={alert.id}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              className={cn(
                                "p-3 rounded-lg mb-2 transition-all duration-200 hover:bg-muted/50 group cursor-pointer",
                                alert.isNew &&
                                  "ring-2 ring-primary/20 bg-primary/5"
                              )}
                            >
                              <div className="flex gap-3">
                                <div
                                  className={cn(
                                    "p-1 h-1/12 rounded-full flex-shrink-0 mt-0.5",
                                    severityConfig.bg
                                  )}
                                >
                                  <div className={severityConfig.color}>
                                    {severityConfig.icon}
                                  </div>
                                </div>

                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium text-foreground truncate">
                                        {alert.title}
                                      </p>
                                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                        {alert.message}
                                      </p>
                                      <div className="flex items-center gap-2 mt-2">
                                        <Badge
                                          variant="outline"
                                          className={cn(
                                            "text-xs h-5",
                                            severityConfig.color,
                                            severityConfig.border
                                          )}
                                        >
                                          {alert.severity}
                                        </Badge>
                                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                          <Clock className="w-3 h-3" />
                                          {formatTimeAgo(alert.createdAt)}
                                        </div>
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-1">
                                      {alert.isNew && (
                                        <div className="w-2 h-2 rounded-full bg-primary" />
                                      )}
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          clearNotification(alert.id);
                                        }}
                                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                      >
                                        <X className="w-3 h-3" />
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    )}
                  </ScrollArea>

                  {alerts.length > 0 && (
                    <div className="p-3 border-t border-border">
                      <Link
                        to="/alerts"
                        onClick={() => setNotificationsOpen(false)}
                      >
                        <Button
                          variant="outline"
                          className="w-full justify-center gap-2 h-9"
                        >
                          <ExternalLink className="w-4 h-4" />
                          View All Alerts
                        </Button>
                      </Link>
                    </div>
                  )}
                </PopoverContent>
              </Popover>

              {/* User menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="flex items-center gap-2 px-2 py-1 h-auto text-muted-foreground hover:text-foreground"
                  >
                    <Avatar className="h-8 w-8 ring-2 ring-border">
                      <AvatarImage src={user?.avatar || "/placeholder.svg"} />
                      <AvatarFallback className="bg-muted text-muted-foreground font-semibold">
                        {getUserInitials()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden lg:block text-sm font-medium text-foreground">
                      {getUserDisplayName()}
                    </span>
                    <ChevronDown className="h-4 w-4 opacity-70" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <DropdownMenuLabel>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user?.avatar || "/placeholder.svg"} />
                        <AvatarFallback className="bg-muted text-muted-foreground">
                          {getUserInitials()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium text-foreground">
                          {getUserDisplayName()}
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          {getUserRole()}
                          {user?.role === "ADMIN" && (
                            <Shield className="w-3 h-3 text-amber-500" />
                          )}
                        </div>
                        {user?.email && (
                          <div className="text-xs text-muted-foreground truncate mt-0.5">
                            {user.email}
                          </div>
                        )}
                      </div>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="gap-2">
                    <UserCircle className="h-4 w-4" />
                    <span>Profile Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="gap-2">
                    <Settings className="h-4 w-4" />
                    <span>Preferences</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="gap-2">
                    <HelpCircle className="h-4 w-4" />
                    <span>Help & Support</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={logout}
                    className="gap-2 text-red-600 dark:text-red-400"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Sign Out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </motion.header>

          {/* Page content */}
          <main className="flex-1 overflow-auto bg-background/50">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
              className="container mx-auto max-w-7xl p-4 sm:p-6"
            >
              {children}
            </motion.div>
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}
