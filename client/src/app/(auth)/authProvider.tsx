"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { User } from "@/types";
import api from "@/lib/api";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signin: (email: string, password: string) => Promise<void>;
  signup: (
    email: string,
    password: string,
    name: string,
    phone?: string
  ) => Promise<void>;
  googleSignin: (credential: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  signout: () => void;
  setUser: (user: User) => void;
  refreshUser: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

const toUser = (dbUser: any): User => ({
  id: dbUser.id,
  email: dbUser.email,
  name: dbUser.name,
  phone: dbUser.phone,
  role: dbUser.role,
  isVendor: dbUser.isVendor || false,
  hasPassword: dbUser.hasPassword ?? true,
  hasGoogle: dbUser.hasGoogle || false,
  createdAt: dbUser.createdAt,
  updatedAt: dbUser.updatedAt,
});

const errorMessage = (error: any, fallback: string) =>
  error?.response?.data?.message || error?.message || fallback;

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const storeSession = (token: string, userData: User) => {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(userData));
    setUser(userData);
  };

  const clearSession = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  };

  // Restore the session on load; the server is the source of truth for
  // role and isVendor, so always re-fetch /auth/me.
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const { data } = await api.get("/auth/me");
        storeSession(token, toUser(data));
      } catch {
        clearSession();
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  const signin = async (email: string, password: string) => {
    try {
      const { data } = await api.post("/auth/signin", { email, password });
      storeSession(data.token, toUser(data.user));
      router.push("/");
    } catch (error: any) {
      clearSession();
      throw new Error(errorMessage(error, "Sign in failed"));
    }
  };

  const signup = async (
    email: string,
    password: string,
    name: string,
    phone?: string
  ) => {
    try {
      const { data } = await api.post("/auth/signup", {
        email,
        password,
        name,
        phone: phone?.trim() || undefined,
      });
      storeSession(data.token, toUser(data.user));
      router.push("/");
    } catch (error: any) {
      throw new Error(errorMessage(error, "Sign up failed"));
    }
  };

  // credential is the ID token Google Identity Services hands the page
  const googleSignin = async (credential: string) => {
    try {
      const { data } = await api.post("/auth/google", { credential });
      storeSession(data.token, toUser(data.user));
      router.push("/");
    } catch (error: any) {
      throw new Error(errorMessage(error, "Google sign in failed"));
    }
  };

  // The server signs out other sessions and returns a fresh token for this one
  const changePassword = async (currentPassword: string, newPassword: string) => {
    try {
      const { data } = await api.put("/auth/password", {
        currentPassword,
        newPassword,
      });
      storeSession(data.token, toUser(data.user));
    } catch (error: any) {
      throw new Error(errorMessage(error, "Failed to change password"));
    }
  };

  const signout = () => {
    clearSession();
    router.push("/signin");
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem("user", JSON.stringify(updatedUser));
  };

  const refreshUser = async () => {
    try {
      if (!localStorage.getItem("token")) return;
      const { data } = await api.get("/auth/me");
      updateUser(toUser(data));
    } catch (error) {
      console.error("Failed to refresh user:", error);
    }
  };

  const value = {
    user,
    loading,
    signin,
    signup,
    googleSignin,
    changePassword,
    signout,
    setUser: updateUser,
    refreshUser,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
