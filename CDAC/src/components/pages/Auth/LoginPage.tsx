"use client";

import { motion } from "framer-motion";
import { Command } from "lucide-react";
import LoginForm from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary text-primary-foreground shadow-lg">
              <Command className="w-6 h-6" />
            </div>
            <div className="text-2xl font-bold tracking-tight">
              <span className="text-primary">IOT </span>
              <span className="text-foreground">Pulse</span>
            </div>
          </div>
          <p className="text-muted-foreground">
            Secure access to your IoT infrastructure
          </p>
        </motion.div>
        <LoginForm />
      </div>
    </div>
  );
}
