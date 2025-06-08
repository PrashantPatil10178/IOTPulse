"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { toast } from "sonner";
import axios from "axios";
import { api } from "@/lib/api";
import { redirect } from "@tanstack/react-router";

interface UserPreferences {
  themeMode: string;
  colorScheme: string;
  animationsEnabled: boolean;
  density: string;
  roundedCorners: boolean;
  fontSize: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
  smsNotifications: boolean;
  alertsOnly: boolean;
  notificationSounds: boolean;
  language: string;
  timezone: string;
}

interface User {
  id: string;
  email: string;
  username: string;
  fullName: string;
  role: "USER" | "ADMIN";
  preferences: UserPreferences;
  avatar?: string;
}

interface AuthResponse {
  user: User;
  token: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (
    email: string,
    password: string,
    name: string,
    username: string
  ) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
  useDemoCredentials: (role: "admin" | "user") => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const savedUser = localStorage.getItem("iot-dashboard-user");
        const savedToken = localStorage.getItem("iot-dashboard-token");

        if (savedUser && savedToken) {
          setUser(JSON.parse(savedUser));
          setToken(savedToken);
          // Set the token for subsequent requests
          api.defaults.headers.common["Authorization"] = `Bearer ${savedToken}`;
        }
      } catch (error) {
        console.error("Auth initialization error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const handleSuccessfulAuth = useCallback((data: AuthResponse) => {
    const { user, token } = data;

    setUser(user);
    setToken(token);
    localStorage.setItem("iot-dashboard-user", JSON.stringify(user));
    localStorage.setItem("iot-dashboard-token", token);

    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;

    toast.success("Authentication successful!");
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);

      const { data } = await api.post<AuthResponse>("/auth/login", {
        email,
        password,
      });

      handleSuccessfulAuth(data);
      return true;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.message || "Login failed";
        toast.error(message);
      } else {
        toast.error("An unexpected error occurred");
      }
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (
    email: string,
    password: string,
    fullName: string,
    username: string
  ): Promise<boolean> => {
    try {
      setIsLoading(true);

      const { data } = await api.post<AuthResponse>("/auth/register", {
        email,
        password,
        fullName,
        username,
      });

      handleSuccessfulAuth(data);
      return true;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.message || "Registration failed";
        toast.error(message);
      } else {
        toast.error("An unexpected error occurred");
      }
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("iot-dashboard-user");
    localStorage.removeItem("iot-dashboard-token");
    delete api.defaults.headers.common["Authorization"];

    toast.info("Logged out successfully");
    window.location.reload();
  }, []);

  const useDemoCredentials = useCallback(
    async (role: "admin" | "user") => {
      if (role === "admin") {
        await login("admin@cdac.in", "admin123");
      } else {
        await login("nikhilanilpatil78@gmail.com", "Prashant$178");
      }
    },
    [login]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        register,
        logout,
        isLoading,
        useDemoCredentials,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
