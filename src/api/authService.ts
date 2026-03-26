import { authClient } from "./client";

type LoginPayload = {
  token?: string;
  access_token?: string;
};

export const login = async (email: string, password: string) => {
  try {
    const response = await authClient.post<LoginPayload>("/auth/login", {
      email,
      password,
    });

    const token = response.data.token || response.data.access_token;
    if (!token) {
      throw new Error("Token missing in login response");
    }

    localStorage.setItem("token", token);

    return {
      ...response.data,
      token,
    };
  } catch (error) {
    console.error("Login failed:", error);
    throw error;
  }
};

export const signup = async (userData: {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
}) => {
  try {
    const response = await authClient.post("/auth/signup", userData);
    return response.data;
  } catch (error) {
    console.error("Signup failed:", error);
    throw error;
  }
};
