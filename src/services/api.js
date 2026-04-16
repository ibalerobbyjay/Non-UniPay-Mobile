import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

export const SERVER_ROOT = "https://non-unipay.up.railway.app";

const api = axios.create({
  baseURL: `${SERVER_ROOT}/api`,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
    "ngrok-skip-browser-warning": "true",
  },
});

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

export function getImageUrl(path) {
  if (!path) return null;

  // Already a full external URL — return as-is (Cloudinary, etc.)
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  // Legacy local storage paths
  if (path.startsWith("storage/") || path.startsWith("/storage/")) {
    const clean = path.replace(/^\//, "");
    return `${SERVER_ROOT}/${clean}`;
  }

  return `${SERVER_ROOT}/storage/${path}`;
}
export default api;
