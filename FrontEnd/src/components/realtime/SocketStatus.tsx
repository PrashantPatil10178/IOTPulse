"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wifi, WifiOff, Users, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSocket } from "@/context/SocketContext";

export function SocketStatus() {
  const { isConnected, subscribedDevices, socket } = useSocket();
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            {isConnected ? (
              <>
                <Wifi className="w-4 h-4 text-emerald-500" />
                <span className="text-emerald-700 dark:text-emerald-400">
                  Real-time Connected
                </span>
              </>
            ) : (
              <>
                <WifiOff className="w-4 h-4 text-red-500" />
                <span className="text-red-700 dark:text-red-400">
                  Disconnected
                </span>
              </>
            )}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-6 w-6 p-0"
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </Button>
        </div>
      </CardHeader>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <CardContent className="pt-0">
              <div className="space-y-3">
                {/* Connection Status */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <Badge
                    variant={isConnected ? "default" : "destructive"}
                    className="text-xs"
                  >
                    {isConnected ? "Connected" : "Disconnected"}
                  </Badge>
                </div>

                {/* Socket ID */}
                {socket && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Socket ID
                    </span>
                    <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                      {socket.id?.slice(0, 8)}...
                    </code>
                  </div>
                )}

                {/* Subscribed Devices */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Subscriptions
                  </span>
                  <div className="flex items-center gap-1">
                    <Users className="w-3 h-3 text-muted-foreground" />
                    <span className="text-sm font-medium">
                      {subscribedDevices.size}
                    </span>
                  </div>
                </div>

                {/* Subscribed Device List */}
                {subscribedDevices.size > 0 && (
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground">
                      Active Subscriptions:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {Array.from(subscribedDevices).map((deviceId) => (
                        <Badge
                          key={deviceId}
                          variant="outline"
                          className="text-xs"
                        >
                          {deviceId}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Connection Indicator */}
                <div className="flex items-center gap-2 pt-2 border-t">
                  <div className="flex items-center gap-1">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        isConnected
                          ? "bg-emerald-500 animate-pulse"
                          : "bg-red-500"
                      }`}
                    />
                    <span className="text-xs text-muted-foreground">
                      {isConnected
                        ? "Live updates active"
                        : "No real-time updates"}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
