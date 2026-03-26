import axios from "axios";
import type { InternalAxiosRequestConfig } from "axios";

const BASE_URL = "http://localhost:8001";

export const authClient = axios.create({
  baseURL: BASE_URL,
});

export const marketClient = axios.create({
  baseURL: BASE_URL,
});

authClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

authClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);

