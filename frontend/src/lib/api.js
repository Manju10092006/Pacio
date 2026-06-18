import axios from "axios";

const BASE = process.env.REACT_APP_BACKEND_URL || "";
const TOKEN_KEY = "careeros_access_token";

export const api = axios.create({
  baseURL: `${BASE}/api`,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

export const getAuthToken = () => {
  try { return window.localStorage.getItem(TOKEN_KEY); }
  catch { return null; }
};

export const setAuthToken = (token) => {
  try {
    if (token) window.localStorage.setItem(TOKEN_KEY, token);
    else window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Ignore storage failures; cookie auth still works.
  }
};

api.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error?.response?.status === 401) setAuthToken(null);
    return Promise.reject(error);
  },
);

export const apiUrl = (path) => `${BASE}/api${path}`;
