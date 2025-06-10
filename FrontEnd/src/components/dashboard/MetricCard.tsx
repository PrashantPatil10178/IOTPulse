"use client";

import type React from "react";
import { motion } from "framer-motion";
import { Activity, type LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useAppearance } from "@/context/AppearanceContext";

interface MetricCardProps {
  title: string;
  value: React.ReactNode;
  unit?: string;
  change?: number;
  icon?: LucideIcon;
  colorClass?: string;
  formatter?: (value: any) => string;
}

export default function MetricCard({
  title,
  value,
  unit,
  change,
  icon: Icon,
  colorClass,
  formatter,
}: MetricCardProps) {
  const { animationsEnabled } = useAppearance();

  // Handle the trend display

  // Format the value if a formatter is provided
  const displayValue = formatter ? formatter(value) : value;

  // Animation variants
  const cardVariants = animationsEnabled
    ? {
        initial: { opacity: 0, scale: 0.95, y: 10 },
        animate: {
          opacity: 1,
          scale: 1,
          y: 0,
          transition: { duration: 0.3, ease: "easeOut" },
        },
        hover: {
          scale: 1.03,
          y: -2,
          transition: { type: "spring", stiffness: 400, damping: 15 },
        },
      }
    : undefined;

  return (
    <motion.div
      variants={cardVariants}
      initial="initial"
      animate="animate"
      whileHover={animationsEnabled ? "hover" : undefined}
    >
      <Card
        className={cn(
          "overflow-hidden border transition-all duration-300",
          "hover:shadow-lg"
        )}
      >
        <CardHeader className="p-4 pb-0">
          <div className="flex justify-between items-center">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {title}
            </CardTitle>
            <div
              className={cn(
                "rounded-full p-1.5",
                colorClass
                  ? `${colorClass.replace(
                      "text-",
                      "bg-"
                    )}/10 dark:${colorClass.replace("text-", "bg-")}/20`
                  : "bg-primary/10 dark:bg-primary/20"
              )}
            >
              {Icon ? (
                <Icon
                  className={cn(
                    "w-4 h-4",
                    colorClass ? colorClass : "text-primary"
                  )}
                />
              ) : (
                <Activity className="w-4 h-4 text-primary" />
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <div className="flex items-baseline gap-1">
            <div className="text-2xl font-bold tracking-tight text-foreground">
              {displayValue}
            </div>
            {unit && (
              <div className="text-sm text-muted-foreground">{unit}</div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
