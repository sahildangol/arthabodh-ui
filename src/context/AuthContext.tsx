import React, { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";
import { User, LoginResponse, AuthContextType } from "../common/types/auth";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [token, setToken] = useState<string | null>(
    localStorage.getItem("token"),
  );
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verifyToken = async () => {
      if (token) {
        //verification bypassed to simulate login
        // try {
        //   const response = await axios.get('http://localhost:8000/protected', {
        //     headers: { Authorization: `Bearer ${token}` }
        //   });
        //   setUser(response.data.user);
        // } catch (error) {
        //   logout(); // Clear invalid token
        // }
      }
      setLoading(false);
    };
    verifyToken();
  }, [token]);

  const login = (data: LoginResponse) => {
    localStorage.setItem("token", data.token);
    setToken(data.token);
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
