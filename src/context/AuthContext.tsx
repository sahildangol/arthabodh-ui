import React, { createContext, useContext, useState, useEffect } from "react";
import { jwtDecode } from "jwt-decode";
import type { User, AuthContextType } from "../common/types/auth";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [token, setToken] = useState<string | null>(
    localStorage.getItem("token"),
  );
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const decodeAndSetUser = (token: string) => {
    try {
      const decoded: any = jwtDecode(token);

      // Check for expiration (FastAPI sends 'exp' usually)
      const currentTime = Date.now() / 1000;
      if (decoded.exp && decoded.exp < currentTime) {
        logout();
        return;
      }

      setUser({
        id: decoded.user_id,
        email: decoded.email || "Active Session",
        first_name: `User #${decoded.user_id}`,
      } as any);
    } catch (err) {
      console.error("Token decoding failed", err);
      logout();
    }
  };

  useEffect(() => {
    const savedToken = localStorage.getItem("token");
    if (savedToken) {
      setToken(savedToken);
      decodeAndSetUser(savedToken);
    }
    setLoading(false);
  }, []);

  const login = (data: { token: string }) => {
    localStorage.setItem("token", data.token);
    setToken(data.token);
    decodeAndSetUser(data.token);
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
