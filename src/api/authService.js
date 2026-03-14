import { authClient } from "./client";

export const login = async (email, password) => {
    try{
        const response = await authClient.post("/auth/login", { email, password });
        if (response.data.access_token) {
            localStorage.setItem("token", response.data.access_token);
        }
        return response.data;
    }
catch(error){
    console.error("Login failed:", error);
    throw error;
}
};

export const signup = async (userData) => {
  try {
    const response = await authClient.post("/auth/signup", userData);
    return response.data;
  } catch (error) {
    console.error("Signup failed:", error);
    throw error;
  }
};
