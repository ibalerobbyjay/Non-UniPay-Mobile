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
      const response = await api.post("/login", { email, password });
      const { access_token, user: userData } = response.data;

      setToken(access_token);
      setUser(userData);

      await AsyncStorage.setItem("@token", access_token);
      await AsyncStorage.setItem("@user", JSON.stringify(userData));

      api.defaults.headers.Authorization = `Bearer ${access_token}`;

      return { success: true };
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
      const { access_token, user: newUser } = response.data;

      setToken(access_token);
      setUser(newUser);

      await AsyncStorage.setItem("@token", access_token);
      await AsyncStorage.setItem("@user", JSON.stringify(newUser));

      api.defaults.headers.Authorization = `Bearer ${access_token}`;

      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || "Registration failed",
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
