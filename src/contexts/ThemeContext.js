import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useEffect, useState } from "react";

export const ThemeContext = createContext({
  isDark: false,
  toggleTheme: () => {},
  colors: {},
});

export const LIGHT_COLORS = {
  // Backgrounds
  background: "#f8fafc",
  surface: "#ffffff",
  surfaceSecondary: "#f8fafc",
  // Text
  textPrimary: "#1e293b",
  textSecondary: "#64748b",
  textMuted: "#94a3b8",
  textInverse: "#ffffff",
  // Borders
  border: "#e2e8f0",
  borderLight: "#f1f5f9",
  // Brand
  brand: "#0f3c91",
  brandLight: "#eff6ff",
  // Accents
  accent: "#f4b414",
  // Status
  success: "#22c55e",
  warning: "#f59e0b",
  danger: "#ef4444",
  dangerLight: "#fff",
  // Misc
  overlay: "rgba(0,0,0,0.55)",
  inputBackground: "#f8fafc",
  gradientStart: "#0f3c91",
  gradientEnd: "#1a4da8",
  cooldownBg: "#fffbeb",
  cooldownBorder: "rgb(244, 180, 20)",
  cooldownText: "#92400e",
  shadow: "#000",
};

export const DARK_COLORS = {
  // Backgrounds
  background: "#0f172a",
  surface: "#1e293b",
  surfaceSecondary: "#0f172a",
  // Text
  textPrimary: "#f1f5f9",
  textSecondary: "#94a3b8",
  textMuted: "#64748b",
  textInverse: "#ffffff",
  // Borders
  border: "#334155",
  borderLight: "#1e293b",
  // Brand
  brand: "#60a5fa",
  brandLight: "#1e3a5f",
  // Accents
  accent: "#f4b414",
  // Status
  success: "#22c55e",
  warning: "#f59e0b",
  danger: "#f87171",
  dangerLight: "#1e293b",
  // Misc
  overlay: "rgba(0,0,0,0.75)",
  inputBackground: "#0f172a",
  gradientStart: "#0c2e6e",
  gradientEnd: "#1a3f8f",
  cooldownBg: "#2d2006",
  cooldownBorder: "#b26a00",
  cooldownText: "#fcd34d",
  shadow: "#000",
};

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem("theme").then((val) => {
      if (val === "dark") setIsDark(true);
    });
  }, []);

  const toggleTheme = async () => {
    const next = !isDark;
    setIsDark(next);
    await AsyncStorage.setItem("theme", next ? "dark" : "light");
  };

  const colors = isDark ? DARK_COLORS : LIGHT_COLORS;

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme, colors }}>
      {children}
    </ThemeContext.Provider>
  );
}

// Convenience hook
export function useTheme() {
  return useContext(ThemeContext);
}
