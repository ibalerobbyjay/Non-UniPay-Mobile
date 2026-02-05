import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

// Create axios instance
const api = axios.create({
  baseURL: "https://daniele-cosmic-vapidly.ngrok-free.dev/api", // Make sure this matches your Laravel IP + port
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// Automatically attach token for authenticated requests
api.interceptors.request.use(async (config) => {
  try {
    const token = await AsyncStorage.getItem("@token"); // Must match AuthContext
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (error) {
    console.error("Error reading token from storage:", error);
  }
  return config;
});

// Global response interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      console.log("Unauthorized - Token expired or invalid");
      // Remove invalid token
      await AsyncStorage.removeItem("@token");
      await AsyncStorage.removeItem("@user");
      delete api.defaults.headers.Authorization;
    }
    return Promise.reject(error);
  },
);

export default api;
