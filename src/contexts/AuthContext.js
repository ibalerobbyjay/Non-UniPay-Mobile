import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useEffect, useState } from "react";
import api from "../services/api";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStorageData();
  }, []);

  async function loadStorageData() {
    try {
      const storedToken = await AsyncStorage.getItem("@token");
      const storedUser = await AsyncStorage.getItem("@user");

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        api.defaults.headers.Authorization = `Bearer ${storedToken}`;
      }
    } catch (error) {
      console.error("Error loading storage data:", error);
    } finally {
      setLoading(false);
    }
  }

  async function login(email, password) {
    try {
      console.log("Attempting login with:", email, password);

      const response = await api.post("/login", { email, password });

      console.log("API response:", response.data);

      const { access_token, user: userData } = response.data;

      // 🚨 Block admin users immediately – do NOT store token
      if (userData.role === "admin") {
        console.log("Admin login blocked – token discarded");
        return {
          success: false,
          message:
            "Admin accounts cannot log in to the mobile app. Please use the web admin panel.",
        };
      }

      // ✅ Store token only for non‑admin users
      setToken(access_token);
      setUser(userData);

      await AsyncStorage.setItem("@token", access_token);
      await AsyncStorage.setItem("@user", JSON.stringify(userData));

      api.defaults.headers.Authorization = `Bearer ${access_token}`;

      console.log("Login successful, token stored:", access_token);

      return { success: true, user: userData };
    } catch (error) {
      console.log("Login error:", error.response?.data || error.message);

      return {
        success: false,
        message: error.response?.data?.message || "Login failed",
      };
    }
  }

  async function register(userData) {
    try {
      console.log("Registering user:", userData);

      const response = await api.post("/register", userData);

      console.log("Registration response:", response.data);

      return {
        success: true,
        message: response.data.message,
      };
    } catch (error) {
      console.log("Registration error:", error.response?.data || error.message);

      if (error.response?.status === 422) {
        const errors = error.response.data.errors;
        const firstError = Object.values(errors)[0][0];
        return {
          success: false,
          message: firstError,
        };
      }

      return {
        success: false,
        message:
          error.response?.data?.message ||
          "Registration failed. Please try again.",
      };
    }
  }

  async function logout() {
    try {
      await api.post("/logout");
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setUser(null);
      setToken(null);
      await AsyncStorage.removeItem("@token");
      await AsyncStorage.removeItem("@user");
      delete api.defaults.headers.Authorization;
    }
  }

  return (
    <AuthContext.Provider
      value={{ user, token, login, register, logout, loading }}
    >
      {children}
    </AuthContext.Provider>
  );
};
