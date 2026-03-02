
import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { adminLogin as apiLogin } from "@/lib/admin-api";

interface AdminAuthContextValue {
  isAuthenticated: boolean;
  isLoading: boolean;
  username: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

const TOKEN_KEY = "admin_token";
const USERNAME_KEY = "admin_username";

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [username, setUsername] = useState<string | null>(null);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => {
    const token = sessionStorage.getItem(TOKEN_KEY);
    const storedUsername = sessionStorage.getItem(USERNAME_KEY);
    if (token) {
      setIsAuthenticated(true);
      setUsername(storedUsername);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (!isLoading && !isAuthenticated && pathname !== "/admin/login") {
      navigate("/admin/login", { replace: true });
    }
  }, [isLoading, isAuthenticated, pathname, navigate]);

  const login = useCallback(async (user: string, password: string) => {
    const res = await apiLogin(user, password);
    sessionStorage.setItem(TOKEN_KEY, res.token);
    sessionStorage.setItem(USERNAME_KEY, res.username);
    setIsAuthenticated(true);
    setUsername(res.username);
    navigate("/admin", { replace: true });
  }, [navigate]);

  const logout = useCallback(() => {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USERNAME_KEY);
    setIsAuthenticated(false);
    setUsername(null);
    navigate("/admin/login", { replace: true });
  }, [navigate]);

  return (
    <AdminAuthContext.Provider value={{ isAuthenticated, isLoading, username, login, logout }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error("useAdminAuth must be used within AdminAuthProvider");
  return ctx;
}
