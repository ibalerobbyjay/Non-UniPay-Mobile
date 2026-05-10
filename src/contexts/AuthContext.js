import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useEffect, useState } from "react";
import api, { setAuthToken } from "../services/api";

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
        setAuthToken(storedToken);
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error("Error loading storage data:", error);
    } finally {
      setLoading(false);
    }
  }

  async function login(email, password) {
    try {
      const response = await api.post("/login", { email, password });
      console.log("Login response:", JSON.stringify(response.data));
      const { access_token, user: userData } = response.data;

      if (userData.role === "admin") {
        return {
          success: false,
          message:
            "Admin accounts cannot log in to the mobile app. Please use the web admin panel.",
        };
      }

      setAuthToken(access_token);
      setToken(access_token);
      setUser(userData);

      await AsyncStorage.setItem("@token", access_token);
      await AsyncStorage.setItem("@user", JSON.stringify(userData));

      return { success: true, user: userData };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || "Login failed",
      };
    }
  }

  async function register(userData) {
    try {
      const response = await api.post("/register", userData);
      return { success: true, message: response.data.message };
    } catch (error) {
      if (error.response?.status === 422) {
        const firstError = Object.values(error.response.data.errors)[0][0];
        return { success: false, message: firstError };
      }
      return {
        success: false,
        message:
          error.response?.data?.message ||
          "Registration failed. Please try again.",
      };
    }
  }

  async function updateUser(updates) {
    const updated = { ...user, ...updates }; // ← use user directly, not prev
    setUser(updated); // ← plain object = instant re-render
    await AsyncStorage.setItem("@user", JSON.stringify(updated));
  }

  async function logout() {
    try {
      await api.post("/logout");
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setAuthToken(null);
      setUser(null);
      setToken(null);
      await AsyncStorage.removeItem("@token");
      await AsyncStorage.removeItem("@user");
    }
  }

  return (
    <AuthContext.Provider
      value={{ user, token, login, register, logout, updateUser, loading }}
    >
      {children}
    </AuthContext.Provider>
  );
};
