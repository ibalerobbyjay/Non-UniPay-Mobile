import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

export const SERVER_ROOT = "https://daniele-cosmic-vapidly.ngrok-free.dev";

// API root only
const api = axios.create({
  baseURL: `${SERVER_ROOT}/api`,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
    "ngrok-skip-browser-warning": "true",
  },
});

// Automatically attach token for authenticated requests
api.interceptors.request.use(async (config) => {
  try {
    const token = await AsyncStorage.getItem("@token");
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
      await AsyncStorage.removeItem("@token");
      await AsyncStorage.removeItem("@user");
      delete api.defaults.headers.Authorization;
    }
    return Promise.reject(error);
  },
);

/**
 * Converts any profile picture path/URL returned by Laravel into
 * a correct absolute URL pointing at the current ngrok tunnel.
 *
 * Handles three cases:
 *  1. Already a full URL (http/https) — replaces the host with SERVER_ROOT
 *  2. Relative path starting with "storage/" — prepends SERVER_ROOT + "/"
 *  3. Relative path without leading slash  — prepends SERVER_ROOT + "/storage/"
 */
export function getImageUrl(path) {
  if (!path) return null;

  if (path.startsWith("http://") || path.startsWith("https://")) {
    // Replace whatever host Laravel used (localhost, 127.0.0.1, old ngrok, etc.)
    return path.replace(/https?:\/\/[^/]+/, SERVER_ROOT);
  }

  if (path.startsWith("storage/") || path.startsWith("/storage/")) {
    const clean = path.replace(/^\//, ""); // strip leading slash if any
    return `${SERVER_ROOT}/${clean}`;
  }

  // Raw relative path like "profile_pictures/xxx.jpg"
  return `${SERVER_ROOT}/storage/${path}`;
}

export default api;
