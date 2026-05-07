import axios from "axios";

export const SERVER_ROOT = "https://non-unipay.online";

// Module-level token store — survives navigation, no AsyncStorage needed
let _token = null;

export function setAuthToken(token) {
  _token = token;
  if (token) {
    api.defaults.headers.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.Authorization;
  }
}

export function getAuthToken() {
  return _token;
}

const api = axios.create({
  baseURL: `${SERVER_ROOT}/api`,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
    "ngrok-skip-browser-warning": "true",
  },
});

api.interceptors.request.use((config) => {
  if (_token) {
    config.headers.Authorization = `Bearer ${_token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      setAuthToken(null);
    }
    return Promise.reject(error);
  },
);

export function getImageUrl(path) {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  if (path.startsWith("storage/") || path.startsWith("/storage/")) {
    const clean = path.replace(/^\//, "");
    return `${SERVER_ROOT}/${clean}`;
  }
  return `${SERVER_ROOT}/storage/${path}`;
}

export default api;
