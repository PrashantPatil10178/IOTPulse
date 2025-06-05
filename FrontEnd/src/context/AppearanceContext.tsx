"use client";

import type React from "react";
import { createContext, useContext, useState, useEffect } from "react";

export const COLOR_SCHEMES = [
  {
    id: "blue",
    name: "Blue",
    primary: { light: "#3B82F6", dark: "#60A5FA" },
    secondary: { light: "#8B5CF6", dark: "#A78BFA" },
    accent: { light: "#06B6D4", dark: "#22D3EE" },
    cssVars: {
      light: {
        "--primary": "221.2 83.2% 53.3%",
        "--primary-foreground": "210 40% 98%",
        "--secondary": "262.1 83.3% 57.8%",
        "--secondary-foreground": "210 40% 98%",
        "--accent": "188.7 85.7% 53.3%",
        "--accent-foreground": "210 40% 98%",
      },
      dark: {
        "--primary": "217.2 91.2% 59.8%",
        "--primary-foreground": "222.2 84% 4.9%",
        "--secondary": "262.1 83.3% 57.8%",
        "--secondary-foreground": "210 40% 98%",
        "--accent": "188.7 85.7% 53.3%",
        "--accent-foreground": "210 40% 98%",
      },
    },
  },
  {
    id: "green",
    name: "Green",
    primary: { light: "#10B981", dark: "#34D399" },
    secondary: { light: "#059669", dark: "#10B981" },
    accent: { light: "#06B6D4", dark: "#22D3EE" },
    cssVars: {
      light: {
        "--primary": "158.1 64.4% 51.6%",
        "--primary-foreground": "210 40% 98%",
        "--secondary": "160 84.1% 39.4%",
        "--secondary-foreground": "210 40% 98%",
        "--accent": "188.7 85.7% 53.3%",
        "--accent-foreground": "210 40% 98%",
      },
      dark: {
        "--primary": "156.2 73.5% 66.1%",
        "--primary-foreground": "222.2 84% 4.9%",
        "--secondary": "158.1 64.4% 51.6%",
        "--secondary-foreground": "210 40% 98%",
        "--accent": "188.7 85.7% 53.3%",
        "--accent-foreground": "210 40% 98%",
      },
    },
  },
  {
    id: "purple",
    name: "Purple",
    primary: { light: "#8B5CF6", dark: "#A78BFA" },
    secondary: { light: "#7C3AED", dark: "#8B5CF6" },
    accent: { light: "#EC4899", dark: "#F472B6" },
    cssVars: {
      light: {
        "--primary": "262.1 83.3% 57.8%",
        "--primary-foreground": "210 40% 98%",
        "--secondary": "263.4 70% 50.4%",
        "--secondary-foreground": "210 40% 98%",
        "--accent": "322.7 84.6% 60.5%",
        "--accent-foreground": "210 40% 98%",
      },
      dark: {
        "--primary": "258.3 89.5% 66.3%",
        "--primary-foreground": "222.2 84% 4.9%",
        "--secondary": "262.1 83.3% 57.8%",
        "--secondary-foreground": "210 40% 98%",
        "--accent": "322.7 84.6% 60.5%",
        "--accent-foreground": "210 40% 98%",
      },
    },
  },
  {
    id: "orange",
    name: "Orange",
    primary: { light: "#F59E0B", dark: "#FBBF24" },
    secondary: { light: "#EF4444", dark: "#F87171" },
    accent: { light: "#8B5CF6", dark: "#A78BFA" },
    cssVars: {
      light: {
        "--primary": "45.4 93.4% 47.5%",
        "--primary-foreground": "210 40% 98%",
        "--secondary": "0 84.2% 60.2%",
        "--secondary-foreground": "210 40% 98%",
        "--accent": "262.1 83.3% 57.8%",
        "--accent-foreground": "210 40% 98%",
      },
      dark: {
        "--primary": "48 96% 53%",
        "--primary-foreground": "222.2 84% 4.9%",
        "--secondary": "0 84.2% 60.2%",
        "--secondary-foreground": "210 40% 98%",
        "--accent": "262.1 83.3% 57.8%",
        "--accent-foreground": "210 40% 98%",
      },
    },
  },
  {
    id: "red",
    name: "Red",
    primary: { light: "#EF4444", dark: "#F87171" },
    secondary: { light: "#DC2626", dark: "#EF4444" },
    accent: { light: "#F59E0B", dark: "#FBBF24" },
    cssVars: {
      light: {
        "--primary": "0 84.2% 60.2%",
        "--primary-foreground": "210 40% 98%",
        "--secondary": "0 72.2% 50.6%",
        "--secondary-foreground": "210 40% 98%",
        "--accent": "45.4 93.4% 47.5%",
        "--accent-foreground": "210 40% 98%",
      },
      dark: {
        "--primary": "0 84.2% 60.2%",
        "--primary-foreground": "222.2 84% 4.9%",
        "--secondary": "0 84.2% 60.2%",
        "--secondary-foreground": "210 40% 98%",
        "--accent": "48 96% 53%",
        "--accent-foreground": "210 40% 98%",
      },
    },
  },
];

type ThemeMode = "light" | "dark" | "system";
type InterfaceDensity = "compact" | "comfortable" | "spacious";
type FontSize = "small" | "medium" | "large";

interface AppearanceContextType {
  themeMode: ThemeMode;
  changeThemeMode: (mode: ThemeMode) => void;
  colorScheme: string;
  changeColorScheme: (scheme: string) => void;
  animationsEnabled: boolean;
  toggleAnimations: (enabled?: boolean) => void;
  interfaceDensity: InterfaceDensity;
  changeInterfaceDensity: (density: InterfaceDensity) => void;
  roundedCorners: boolean;
  toggleRoundedCorners: (enabled?: boolean) => void;
  fontSize: FontSize;
  changeFontSize: (size: FontSize) => void;
  selectedColorSchemeDefinition: (typeof COLOR_SCHEMES)[0];
}

const AppearanceContext = createContext<AppearanceContextType | undefined>(
  undefined
);

export function AppearanceProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [themeMode, setThemeMode] = useState<ThemeMode>("system");
  const [colorScheme, setColorScheme] = useState("blue");
  const [animationsEnabled, setAnimationsEnabled] = useState(true);
  const [interfaceDensity, setInterfaceDensity] =
    useState<InterfaceDensity>("comfortable");
  const [roundedCorners, setRoundedCorners] = useState(true);
  const [fontSize, setFontSize] = useState<FontSize>("medium");

  const selectedColorSchemeDefinition =
    COLOR_SCHEMES.find((s) => s.id === colorScheme) || COLOR_SCHEMES[0];

  // Apply theme mode
  useEffect(() => {
    const root = window.document.documentElement;

    if (
      themeMode === "dark" ||
      (themeMode === "system" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches)
    ) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [themeMode]);

  // Apply color scheme
  useEffect(() => {
    const root = window.document.documentElement;
    const isDark = root.classList.contains("dark");
    const scheme = selectedColorSchemeDefinition;
    const vars = isDark ? scheme.cssVars.dark : scheme.cssVars.light;

    Object.entries(vars).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });

    // Add color scheme class
    root.setAttribute("data-color-scheme", colorScheme);
  }, [colorScheme, selectedColorSchemeDefinition, themeMode]);

  // Apply interface density
  useEffect(() => {
    const root = window.document.documentElement;
    root.setAttribute("data-density", interfaceDensity);

    // Remove existing density classes
    root.classList.remove(
      "density-compact",
      "density-comfortable",
      "density-spacious"
    );
    root.classList.add(`density-${interfaceDensity}`);
  }, [interfaceDensity]);

  // Apply animations
  useEffect(() => {
    const root = window.document.documentElement;
    if (animationsEnabled) {
      root.classList.remove("reduce-motion");
    } else {
      root.classList.add("reduce-motion");
    }
  }, [animationsEnabled]);

  // Apply rounded corners
  useEffect(() => {
    const root = window.document.documentElement;
    if (roundedCorners) {
      root.classList.remove("no-rounded");
    } else {
      root.classList.add("no-rounded");
    }
  }, [roundedCorners]);

  // Apply font size
  useEffect(() => {
    const root = window.document.documentElement;
    root.setAttribute("data-font-size", fontSize);

    // Remove existing font size classes
    root.classList.remove("text-sm", "text-base", "text-lg");

    switch (fontSize) {
      case "small":
        root.classList.add("text-sm");
        break;
      case "medium":
        root.classList.add("text-base");
        break;
      case "large":
        root.classList.add("text-lg");
        break;
    }
  }, [fontSize]);

  // Load saved preferences
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme-mode") as ThemeMode;
    const savedColorScheme = localStorage.getItem("color-scheme");
    const savedAnimations = localStorage.getItem("animations-enabled");
    const savedDensity = localStorage.getItem(
      "interface-density"
    ) as InterfaceDensity;
    const savedRounded = localStorage.getItem("rounded-corners");
    const savedFontSize = localStorage.getItem("font-size") as FontSize;

    if (savedTheme) setThemeMode(savedTheme);
    if (savedColorScheme) setColorScheme(savedColorScheme);
    if (savedAnimations !== null)
      setAnimationsEnabled(savedAnimations === "true");
    if (savedDensity) setInterfaceDensity(savedDensity);
    if (savedRounded !== null) setRoundedCorners(savedRounded === "true");
    if (savedFontSize) setFontSize(savedFontSize);
  }, []);

  const changeThemeMode = (mode: ThemeMode) => {
    setThemeMode(mode);
    localStorage.setItem("theme-mode", mode);
  };

  const changeColorScheme = (scheme: string) => {
    setColorScheme(scheme);
    localStorage.setItem("color-scheme", scheme);
  };

  const toggleAnimations = (enabled?: boolean) => {
    const newValue = enabled ?? !animationsEnabled;
    setAnimationsEnabled(newValue);
    localStorage.setItem("animations-enabled", newValue.toString());
  };

  const changeInterfaceDensity = (density: InterfaceDensity) => {
    setInterfaceDensity(density);
    localStorage.setItem("interface-density", density);
  };

  const toggleRoundedCorners = (enabled?: boolean) => {
    const newValue = enabled ?? !roundedCorners;
    setRoundedCorners(newValue);
    localStorage.setItem("rounded-corners", newValue.toString());
  };

  const changeFontSize = (size: FontSize) => {
    setFontSize(size);
    localStorage.setItem("font-size", size);
  };

  return (
    <AppearanceContext.Provider
      value={{
        themeMode,
        changeThemeMode,
        colorScheme,
        changeColorScheme,
        animationsEnabled,
        toggleAnimations,
        interfaceDensity,
        changeInterfaceDensity,
        roundedCorners,
        toggleRoundedCorners,
        fontSize,
        changeFontSize,
        selectedColorSchemeDefinition,
      }}
    >
      {children}
    </AppearanceContext.Provider>
  );
}

export function useAppearance() {
  const context = useContext(AppearanceContext);
  if (context === undefined) {
    throw new Error("useAppearance must be used within an AppearanceProvider");
  }
  return context;
}
