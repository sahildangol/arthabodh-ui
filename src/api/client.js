import axios from "axios";
import { config } from "dotenv";

//auth,watchlist etc with protected routes
export const authClient = axios.create({
  baseURL: "http://localhost:8001",
});

//market data (Live Market, Index)
export const marketClient = axios.create({
  baseURL: "http://localhost:8001",
});

//for auto injecting token in header(interceptor)
authClient.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

//Redirect to login if the token expires
authClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
