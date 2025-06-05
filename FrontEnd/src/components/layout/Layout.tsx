"use client";

import type React from "react";
import { useState } from "react";
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
  UserIcon,
  X,
  LogOut,
  Plus,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface AppLayoutProps {
  children: React.ReactNode;
  currentPageName: string;
}

interface NavItem {
  name: string;
  icon: React.ReactNode;
  path: string;
}

export default function Layout({ children, currentPageName }: AppLayoutProps) {
  const location = useLocation();
  const [mobileNav, setMobileNav] = useState(false);
  const { themeMode, changeThemeMode } = useAppearance();
  const { user, logout } = useAuth();

  const toggleDarkMode = () => {
    changeThemeMode(themeMode === "dark" ? "light" : "dark");
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
    },
    {
      name: "Settings",
      icon: <Settings className="h-5 w-5" />,
      path: "/settings",
    },
  ];

  const currentPath = location.pathname;

  return (
    <div className={cn("flex h-screen overflow-hidden")}>
      {/* Sidebar (desktop) */}
      <motion.aside
        className="hidden lg:flex lg:w-64 flex-col bg-card border-r border-border overflow-y-auto shadow-lg"
        initial={{ x: -64, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
      >
        {/* Logo */}
        <div className="px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary text-primary-foreground">
              <Command className="w-5 h-5" />
            </div>
            <div className="font-semibold text-lg tracking-tight text-foreground">
              <span className="text-primary">C-DAC IoT</span>
              <span>Hub</span>
            </div>
          </div>
        </div>

        {/* Nav Items */}
        <nav className="px-3 py-4 flex-1">
          <div className="space-y-1">
            {navItems.map((item) => (
              <motion.div
                key={item.name}
                whileHover={{
                  scale: 1.02,
                  x: 3,
                }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="rounded-lg"
              >
                <Link
                  to={item.path}
                  className={cn(
                    "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ease-in-out",
                    currentPath === item.path
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  {item.icon}
                  {item.name}
                </Link>
              </motion.div>
            ))}
          </div>

          {/* Add Device Button */}
          <div className="mt-6 px-3">
            <Link to="/add-device">
              <Button className="w-full justify-start gap-2" size="sm">
                <Plus className="h-4 w-4" />
                Add Device
              </Button>
            </Link>
          </div>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-border">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleDarkMode}
              className="text-muted-foreground hover:text-foreground"
            >
              {themeMode === "dark" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground"
            >
              <HelpCircle className="h-4 w-4" />
            </Button>
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
              className="fixed inset-y-0 left-0 w-64 bg-card z-50 lg:hidden overflow-y-auto border-r border-border"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              <div className="flex justify-between items-center p-4 border-b border-border">
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary text-primary-foreground">
                    <Command className="w-5 h-5" />
                  </div>
                  <div className="font-semibold text-lg tracking-tight text-foreground">
                    <span className="text-primary">C-DAC IoT</span>
                    <span>Hub</span>
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
              <nav className="p-3">
                <div className="space-y-1">
                  {navItems.map((item) => (
                    <Link
                      key={item.name}
                      to={item.path}
                      className={cn(
                        "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all",
                        currentPath === item.path
                          ? "bg-primary text-primary-foreground shadow-md"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                      onClick={() => setMobileNav(false)}
                    >
                      {item.icon}
                      {item.name}
                    </Link>
                  ))}
                </div>

                {/* Mobile Add Device Button */}
                <div className="mt-6">
                  <Link to="/add-device" onClick={() => setMobileNav(false)}>
                    <Button className="w-full justify-start gap-2" size="sm">
                      <Plus className="h-4 w-4" />
                      Add Device
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
        {/* Topbar */}
        <motion.header
          className="h-16 border-b border-border bg-card flex items-center justify-between px-4 shadow-sm"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.1, ease: "easeOut" }}
        >
          <div className="flex items-center lg:hidden">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileNav(true)}
              className="text-muted-foreground hover:text-foreground"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>

          <div className="flex-1 lg:flex-none lg:ml-2">
            <h1 className="text-lg font-semibold text-foreground">
              {currentPageName}
            </h1>
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            <div className="hidden lg:block">
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
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="relative text-muted-foreground hover:text-foreground"
            >
              <Bell className="h-5 w-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex items-center gap-2 px-2 py-1 h-auto text-muted-foreground hover:text-foreground"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user?.avatar || "/placeholder.svg"} />
                    <AvatarFallback className="bg-muted text-muted-foreground">
                      {user?.username?.substring(0, 2).toUpperCase() || (
                        <UserIcon className="h-4 w-4" />
                      )}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden lg:block text-sm font-medium text-foreground">
                    {user?.fullName || "User"}
                  </span>
                  <ChevronDown className="h-4 w-4 opacity-70" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="p-2 text-sm">
                  <div className="font-medium text-foreground">
                    {user?.fullName || "User"}
                  </div>
                  <div className="text-muted-foreground truncate text-xs">
                    {user?.email || "user@example.com"}
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <UserIcon className="h-4 w-4 mr-2" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Settings className="h-4 w-4 mr-2" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout}>
                  <LogOut className="h-4 w-4 mr-2" />
                  <span>Logout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </motion.header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-4 sm:p-6 bg-background">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.35, ease: "easeInOut" }}
            className="container mx-auto max-w-7xl"
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
