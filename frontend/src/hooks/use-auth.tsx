
import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { useSearchParams, useNavigate, useLocation } from "react-router-dom";
import { getEdpPortalUrl } from "@/lib/config";
import { verifyToken, setSessionToken, clearSessionToken, type EnsureUserResponse } from "@/lib/api";

// ── Types ──

export interface UserPermissions {
  canCreateIssue: boolean;
  canEditIssue: boolean;
  canResolveIssue: boolean;
  canBulkUpload: boolean;
  canAccessAdmin: boolean;
}

interface AuthUser {
  id: string;
  name: string;
  email: string;
  initials: string;
  permissions: UserPermissions;
}

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isBlocked: boolean;
  isNotRegistered: boolean;
  authFailed: boolean;
  permissions: UserPermissions;
  logout: () => void;
}

const SESSION_KEY = "auth_user";

const DEFAULT_PERMISSIONS: UserPermissions = {
  canCreateIssue: false,
  canEditIssue: false,
  canResolveIssue: false,
  canBulkUpload: false,
  canAccessAdmin: false,
};

function deriveInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function mapResponseToAuthUser(res: EnsureUserResponse): AuthUser {
  return {
    id: res.id,
    name: res.name,
    email: res.email,
    initials: deriveInitials(res.name),
    permissions: {
      canCreateIssue: res.canCreateIssue,
      canEditIssue: res.canEditIssue,
      canResolveIssue: res.canResolveIssue,
      canBulkUpload: res.canBulkUpload,
      canAccessAdmin: res.canAccessAdmin,
    },
  };
}

async function redirectToEdp() {
  const url = await getEdpPortalUrl();
  window.location.href = url;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function AuthProviderInner({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isNotRegistered, setIsNotRegistered] = useState(false);
  const [authFailed, setAuthFailed] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => {
    async function init() {
      // 1. Admin routes have their own auth — skip entirely
      if (pathname.startsWith("/admin")) {
        setIsLoading(false);
        return;
      }

      // 2. Check sessionStorage for existing session
      const stored = sessionStorage.getItem(SESSION_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as AuthUser;
          // Migration: old format without permissions → clear and re-auth
          if (parsed.permissions) {
            setUser(parsed);
            setIsLoading(false);
            return;
          }
          sessionStorage.removeItem(SESSION_KEY);
        } catch {
          sessionStorage.removeItem(SESSION_KEY);
        }
      }

      // 3. Check URL for EDP auth token
      const authToken = searchParams.get("auth");

      if (authToken) {
        // Retry up to 3 times for transient server errors (500, deadlocks, etc.)
        let lastErr: any = null;
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            const response = await verifyToken(authToken);
            const authUser = mapResponseToAuthUser(response.user);
            sessionStorage.setItem(SESSION_KEY, JSON.stringify(authUser));
            setSessionToken(response.sessionToken);
            setUser(authUser);
            lastErr = null;
            break;
          } catch (err: any) {
            lastErr = err;
            // Only retry on 500+ server errors
            if (err.status >= 500 && attempt < 2) {
              await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
              continue;
            }
            break;
          }
        }

        if (lastErr) {
          if (lastErr.status === 403 && lastErr.body?.blocked) {
            setIsBlocked(true);
          } else if (lastErr.status === 403) {
            setIsNotRegistered(true);
          } else if (lastErr.status === 401) {
            setAuthFailed(true);
          } else {
            console.error("Failed to verify token:", lastErr);
            setAuthFailed(true);
          }
        }

        setIsLoading(false);

        // Strip auth param from URL
        const cleaned = new URLSearchParams(searchParams.toString());
        cleaned.delete("auth");
        const qs = cleaned.toString();
        navigate(pathname + (qs ? `?${qs}` : ""), { replace: true });
        return;
      }

      // 4. No session, no token → redirect to EDP portal
      setIsLoading(false);
      redirectToEdp();
    }

    init();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const logout = useCallback(() => {
    sessionStorage.removeItem(SESSION_KEY);
    clearSessionToken();
    setUser(null);
    redirectToEdp();
  }, []);

  const permissions = user?.permissions ?? DEFAULT_PERMISSIONS;

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, isBlocked, isNotRegistered, authFailed, permissions, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  return <AuthProviderInner>{children}</AuthProviderInner>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within <AuthProvider>");
  return context;
}
