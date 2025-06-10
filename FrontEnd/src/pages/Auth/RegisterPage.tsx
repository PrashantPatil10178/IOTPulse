"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Eye,
  EyeOff,
  Loader2,
  Mail,
  Lock,
  User,
  User2,
  Wifi,
  Shield,
  Activity,
  Check,
  X,
  AlertCircle,
} from "lucide-react";
import { Link, useRouter } from "@tanstack/react-router";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

interface ValidationState {
  name: boolean;
  username: boolean;
  email: boolean;
  password: boolean;
  confirmPassword: boolean;
}

interface ValidationMessages {
  name: string;
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export default function RegisterForm() {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const { register } = useAuth();
  const router = useRouter();

  // Real-time validation
  const [validation, setValidation] = useState<ValidationState>({
    name: false,
    username: false,
    email: false,
    password: false,
    confirmPassword: false,
  });

  const [validationMessages, setValidationMessages] =
    useState<ValidationMessages>({
      name: "",
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
    });

  // Validation functions
  const validateName = (
    value: string
  ): { isValid: boolean; message: string } => {
    if (!value.trim())
      return { isValid: false, message: "Full name is required" };
    if (value.trim().length < 2)
      return { isValid: false, message: "Name must be at least 2 characters" };
    if (!/^[a-zA-Z\s]+$/.test(value))
      return {
        isValid: false,
        message: "Name can only contain letters and spaces",
      };
    return { isValid: true, message: "Valid name" };
  };

  const validateUsername = (
    value: string
  ): { isValid: boolean; message: string } => {
    if (!value.trim())
      return { isValid: false, message: "Username is required" };
    if (value.length < 3)
      return {
        isValid: false,
        message: "Username must be at least 3 characters",
      };
    if (value.length > 20)
      return {
        isValid: false,
        message: "Username must be less than 20 characters",
      };
    if (!/^[a-zA-Z0-9_-]+$/.test(value))
      return {
        isValid: false,
        message: "Username can only contain letters, numbers, _ and -",
      };
    if (/^[0-9]/.test(value))
      return { isValid: false, message: "Username cannot start with a number" };
    return { isValid: true, message: "Username available" };
  };

  const validateEmail = (
    value: string
  ): { isValid: boolean; message: string } => {
    if (!value.trim())
      return { isValid: false, message: "Email address is required" };
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value))
      return { isValid: false, message: "Please enter a valid email address" };
    return { isValid: true, message: "Valid email address" };
  };

  const validatePassword = (
    value: string
  ): { isValid: boolean; message: string } => {
    if (!value) return { isValid: false, message: "Password is required" };
    if (value.length < 8)
      return {
        isValid: false,
        message: "Password must be at least 8 characters",
      };
    if (!/(?=.*[a-z])/.test(value))
      return {
        isValid: false,
        message: "Password must contain at least one lowercase letter",
      };
    if (!/(?=.*[A-Z])/.test(value))
      return {
        isValid: false,
        message: "Password must contain at least one uppercase letter",
      };
    if (!/(?=.*\d)/.test(value))
      return {
        isValid: false,
        message: "Password must contain at least one number",
      };
    if (!/(?=.*[@$!%*?&])/.test(value))
      return {
        isValid: false,
        message:
          "Password must contain at least one special character (@$!%*?&)",
      };
    return { isValid: true, message: "Strong password" };
  };

  const validateConfirmPassword = (
    value: string,
    originalPassword: string
  ): { isValid: boolean; message: string } => {
    if (!value)
      return { isValid: false, message: "Please confirm your password" };
    if (value !== originalPassword)
      return { isValid: false, message: "Passwords do not match" };
    return { isValid: true, message: "Passwords match" };
  };

  // Real-time validation effect
  useEffect(() => {
    const nameValidation = validateName(name);
    const usernameValidation = validateUsername(username);
    const emailValidation = validateEmail(email);
    const passwordValidation = validatePassword(password);
    const confirmPasswordValidation = validateConfirmPassword(
      confirmPassword,
      password
    );

    setValidation({
      name: nameValidation.isValid,
      username: usernameValidation.isValid,
      email: emailValidation.isValid,
      password: passwordValidation.isValid,
      confirmPassword: confirmPasswordValidation.isValid,
    });

    setValidationMessages({
      name: nameValidation.message,
      username: usernameValidation.message,
      email: emailValidation.message,
      password: passwordValidation.message,
      confirmPassword: confirmPasswordValidation.message,
    });
  }, [name, username, email, password, confirmPassword]);

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Mark all fields as touched
    setTouched({
      name: true,
      username: true,
      email: true,
      password: true,
      confirmPassword: true,
    });

    // Check if all validations pass
    const allValid = Object.values(validation).every(Boolean);
    if (!allValid) {
      toast.error("Please fix all validation errors before submitting");
      return;
    }

    setIsLoading(true);
    try {
      const success = await register(email, password, name, username);
      if (success) {
        toast.success(
          "Account created successfully! Welcome to IoT Monitoring Hub"
        );
        router.navigate({ to: "/" });
      }
    } catch (error) {
      toast.error("Failed to create account. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const getValidationIcon = (field: keyof ValidationState) => {
    if (!touched[field]) return null;
    return validation[field] ? (
      <Check className="h-4 w-4 text-green-500" />
    ) : (
      <X className="h-4 w-4 text-red-500" />
    );
  };

  const getInputClassName = (field: keyof ValidationState) => {
    const baseClass =
      "pl-10 pr-10 border-slate-200 dark:border-slate-600 focus:ring-blue-500/20 transition-all duration-200";
    if (!touched[field]) return `${baseClass} focus:border-blue-500`;
    return validation[field]
      ? `${baseClass} border-green-300 focus:border-green-500 bg-green-50/30 dark:bg-green-900/10`
      : `${baseClass} border-red-300 focus:border-red-500 bg-red-50/30 dark:bg-red-900/10`;
  };

  const isFormValid = Object.values(validation).every(Boolean);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-indigo-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-md"
      >
        {/* IoT Header with animated icons */}
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <div className="flex justify-center items-center gap-3 mb-4">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full"
            >
              <Wifi className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </motion.div>
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full"
            >
              <Activity className="h-8 w-8 text-green-600 dark:text-green-400" />
            </motion.div>
            <motion.div
              animate={{ y: [0, -5, 0] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-full"
            >
              <Shield className="h-8 w-8 text-purple-600 dark:text-purple-400" />
            </motion.div>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            IoT Pulse
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm">
            Join the future of device monitoring
          </p>
        </motion.div>

        <Card className="shadow-2xl border-0 bg-white/80 dark:bg-slate-800/90 backdrop-blur-lg">
          <CardHeader className="space-y-1 text-center pb-6">
            <CardTitle className="text-2xl font-bold   text-foreground">
              Create Your Account
            </CardTitle>
            <CardDescription className="text-slate-600 dark:text-slate-400">
              Start monitoring your IoT devices with advanced analytics
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-5">
              {/* Full Name */}
              <motion.div
                className="space-y-2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
              >
                <Label
                  htmlFor="name"
                  className="text-slate-700 dark:text-slate-300 font-medium"
                >
                  Full Name
                </Label>
                <div className="relative group">
                  <User className="absolute left-3 top-3 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                  <Input
                    id="name"
                    type="text"
                    placeholder="Dr. John Smith"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onBlur={() => handleBlur("name")}
                    className={getInputClassName("name")}
                    disabled={isLoading}
                  />
                  <div className="absolute right-3 top-3">
                    {getValidationIcon("name")}
                  </div>
                </div>
                {touched.name && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`text-xs flex items-center gap-1 ${
                      validation.name
                        ? "text-green-600 dark:text-green-400"
                        : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    {validation.name ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      <AlertCircle className="h-3 w-3" />
                    )}
                    {validationMessages.name}
                  </motion.p>
                )}
              </motion.div>

              {/* Username */}
              <motion.div
                className="space-y-2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4, duration: 0.5 }}
              >
                <Label
                  htmlFor="username"
                  className="text-slate-700 dark:text-slate-300 font-medium"
                >
                  Username
                </Label>
                <div className="relative group">
                  <User2 className="absolute left-3 top-3 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                  <Input
                    id="username"
                    type="text"
                    placeholder="engineer_john"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase())}
                    onBlur={() => handleBlur("username")}
                    className={getInputClassName("username")}
                    disabled={isLoading}
                  />
                  <div className="absolute right-3 top-3">
                    {getValidationIcon("username")}
                  </div>
                </div>
                {touched.username && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`text-xs flex items-center gap-1 ${
                      validation.username
                        ? "text-green-600 dark:text-green-400"
                        : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    {validation.username ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      <AlertCircle className="h-3 w-3" />
                    )}
                    {validationMessages.username}
                  </motion.p>
                )}
              </motion.div>

              {/* Email */}
              <motion.div
                className="space-y-2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5, duration: 0.5 }}
              >
                <Label
                  htmlFor="email"
                  className="text-slate-700 dark:text-slate-300 font-medium"
                >
                  Email Address
                </Label>
                <div className="relative group">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="john.smith@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value.toLowerCase())}
                    onBlur={() => handleBlur("email")}
                    className={getInputClassName("email")}
                    disabled={isLoading}
                  />
                  <div className="absolute right-3 top-3">
                    {getValidationIcon("email")}
                  </div>
                </div>
                {touched.email && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`text-xs flex items-center gap-1 ${
                      validation.email
                        ? "text-green-600 dark:text-green-400"
                        : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    {validation.email ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      <AlertCircle className="h-3 w-3" />
                    )}
                    {validationMessages.email}
                  </motion.p>
                )}
              </motion.div>

              {/* Password */}
              <motion.div
                className="space-y-2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6, duration: 0.5 }}
              >
                <Label
                  htmlFor="password"
                  className="text-slate-700 dark:text-slate-300 font-medium"
                >
                  Password
                </Label>
                <div className="relative group">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Create a strong password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onBlur={() => handleBlur("password")}
                    className={getInputClassName("password")}
                    disabled={isLoading}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-8 top-0 h-full px-2 py-2 hover:bg-transparent text-slate-400 hover:text-slate-600"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                  <div className="absolute right-3 top-3">
                    {getValidationIcon("password")}
                  </div>
                </div>
                {touched.password && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-1"
                  >
                    <p
                      className={`text-xs flex items-center gap-1 ${
                        validation.password
                          ? "text-green-600 dark:text-green-400"
                          : "text-red-600 dark:text-red-400"
                      }`}
                    >
                      {validation.password ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        <AlertCircle className="h-3 w-3" />
                      )}
                      {validationMessages.password}
                    </p>
                    {/* Password strength indicators */}
                    <div className="grid grid-cols-2 gap-1 text-xs">
                      <div
                        className={`flex items-center gap-1 ${
                          password.length >= 8
                            ? "text-green-600"
                            : "text-slate-400"
                        }`}
                      >
                        <div
                          className={`w-1 h-1 rounded-full ${
                            password.length >= 8
                              ? "bg-green-500"
                              : "bg-slate-300"
                          }`}
                        ></div>
                        8+ characters
                      </div>
                      <div
                        className={`flex items-center gap-1 ${
                          /(?=.*[a-z])(?=.*[A-Z])/.test(password)
                            ? "text-green-600"
                            : "text-slate-400"
                        }`}
                      >
                        <div
                          className={`w-1 h-1 rounded-full ${
                            /(?=.*[a-z])(?=.*[A-Z])/.test(password)
                              ? "bg-green-500"
                              : "bg-slate-300"
                          }`}
                        ></div>
                        Upper & lower
                      </div>
                      <div
                        className={`flex items-center gap-1 ${
                          /(?=.*\d)/.test(password)
                            ? "text-green-600"
                            : "text-slate-400"
                        }`}
                      >
                        <div
                          className={`w-1 h-1 rounded-full ${
                            /(?=.*\d)/.test(password)
                              ? "bg-green-500"
                              : "bg-slate-300"
                          }`}
                        ></div>
                        Number
                      </div>
                      <div
                        className={`flex items-center gap-1 ${
                          /(?=.*[@$!%*?&])/.test(password)
                            ? "text-green-600"
                            : "text-slate-400"
                        }`}
                      >
                        <div
                          className={`w-1 h-1 rounded-full ${
                            /(?=.*[@$!%*?&])/.test(password)
                              ? "bg-green-500"
                              : "bg-slate-300"
                          }`}
                        ></div>
                        Special char
                      </div>
                    </div>
                  </motion.div>
                )}
              </motion.div>

              {/* Confirm Password */}
              <motion.div
                className="space-y-2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7, duration: 0.5 }}
              >
                <Label
                  htmlFor="confirmPassword"
                  className="text-slate-700 dark:text-slate-300 font-medium"
                >
                  Confirm Password
                </Label>
                <div className="relative group">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    onBlur={() => handleBlur("confirmPassword")}
                    className={getInputClassName("confirmPassword")}
                    disabled={isLoading}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-8 top-0 h-full px-2 py-2 hover:bg-transparent text-slate-400 hover:text-slate-600"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    disabled={isLoading}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                  <div className="absolute right-3 top-3">
                    {getValidationIcon("confirmPassword")}
                  </div>
                </div>
                {touched.confirmPassword && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`text-xs flex items-center gap-1 ${
                      validation.confirmPassword
                        ? "text-green-600 dark:text-green-400"
                        : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    {validation.confirmPassword ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      <AlertCircle className="h-3 w-3" />
                    )}
                    {validationMessages.confirmPassword}
                  </motion.p>
                )}
              </motion.div>
            </CardContent>

            <CardFooter className="flex flex-col space-y-4 pt-2">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8, duration: 0.5 }}
                className="w-full"
              >
                <Button
                  type="submit"
                  className={`w-full py-6 rounded-lg font-medium shadow-lg hover:shadow-xl transition-all duration-200 ${
                    isFormValid
                      ? "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                      : "bg-slate-300 dark:bg-slate-600 text-slate-500 dark:text-slate-400 cursor-not-allowed"
                  }`}
                  disabled={isLoading || !isFormValid}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating Your Account...
                    </>
                  ) : (
                    <>
                      <Shield className="mr-2 h-4 w-4" />
                      Create IoT Account
                    </>
                  )}
                </Button>
              </motion.div>

              <motion.div
                className="text-center text-sm space-y-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.9, duration: 0.5 }}
              >
                <div className="text-slate-500 dark:text-slate-400">
                  Already monitoring devices?{" "}
                  <Link
                    to="/login"
                    className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:underline font-medium transition-colors"
                  >
                    Sign In
                  </Link>
                </div>
              </motion.div>
            </CardFooter>
          </form>
        </Card>
      </motion.div>
    </div>
  );
}
