
import { useState } from "react";
import { adminLogin } from "@/lib/admin-api";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2, ArrowRight, Lock } from "lucide-react";

export default function AdminLoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await adminLogin(username, password);
      sessionStorage.setItem("admin_token", res.token);
      sessionStorage.setItem("admin_username", res.username);
      navigate("/admin", { replace: true });
    } catch {
      setError("Invalid username or password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-4"
      style={{ background: "radial-gradient(ellipse at top, #141414 0%, #0a0a0a 60%)" }}>

      {/* Ambient gradient orbs */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-[35%] -left-[15%] h-[600px] w-[600px] rounded-full opacity-[0.05]"
          style={{ background: "radial-gradient(circle, #c6a646, transparent 70%)" }} />
        <div className="absolute -bottom-[25%] -right-[10%] h-[500px] w-[500px] rounded-full opacity-[0.03]"
          style={{ background: "radial-gradient(circle, #b8962e, transparent 70%)" }} />
      </div>

      {/* Card */}
      <div className="login-card relative w-full max-w-[360px]"
        style={{ animation: "login-enter 0.5s cubic-bezier(0.16, 1, 0.3, 1) both" }}>
        <div className="rounded-2xl"
          style={{
            padding: "40px 36px 36px",
            background: "#141414",
            border: "1px solid #1e1e1e",
            boxShadow: "0 20px 60px rgba(0,0,0,0.5), 0 1px 3px rgba(0,0,0,0.2)",
          }}>

          {/* Header */}
          <div className="mb-10 text-center">
            <p className="text-[11px] font-medium uppercase tracking-[0.15em] mb-3"
              style={{ color: "#c6a646" }}>
              Issue Tracker
            </p>
            <h1 className="text-[26px] font-bold tracking-tight leading-none"
              style={{ color: "#e5e7eb" }}>
              Admin Portal
            </h1>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Username */}
            <div className="mb-6">
              <label htmlFor="username"
                className="block text-[11px] font-medium uppercase tracking-wider mb-2"
                style={{ color: "#71717a" }}>
                Username
              </label>
              <input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                required
                autoFocus
                autoComplete="username"
                className="login-input w-full h-[44px] rounded-[10px] px-4 text-[14px] outline-none transition-all duration-150 placeholder:opacity-25"
                style={{
                  background: "#1e1e1e",
                  border: "1px solid #2a2a2a",
                  color: "#e5e7eb",
                }}
              />
            </div>

            {/* Password */}
            <div className="mb-8">
              <label htmlFor="password"
                className="block text-[11px] font-medium uppercase tracking-wider mb-2"
                style={{ color: "#71717a" }}>
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  required
                  autoComplete="current-password"
                  className="login-input w-full h-[44px] rounded-[10px] px-4 pr-10 text-[14px] outline-none transition-all duration-150 placeholder:opacity-25"
                  style={{
                    background: "#1e1e1e",
                    border: "1px solid #2a2a2a",
                    color: "#e5e7eb",
                  }}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-all duration-150 hover:opacity-70"
                  style={{ color: "#52525b" }}>
                  {showPassword
                    ? <EyeOff className="h-[15px] w-[15px]" />
                    : <Eye className="h-[15px] w-[15px]" />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <p className="text-[13px] font-medium mb-4" style={{ color: "#f87171" }}>
                {error}
              </p>
            )}

            {/* Button */}
            <button
              type="submit"
              disabled={loading}
              className="login-btn flex items-center justify-center gap-2 w-full h-[44px] rounded-[10px] text-[14px] font-semibold transition-all duration-200 disabled:opacity-50"
              style={{
                background: "linear-gradient(135deg, #b8962e, #c6a646)",
                color: "#0a0a0a",
                boxShadow: "0 2px 16px rgba(198,166,70,0.15)",
              }}>
              {loading
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <>Sign In <ArrowRight className="h-4 w-4" /></>}
            </button>
          </form>

          {/* Security indicator */}
          <div className="flex items-center justify-center gap-1.5 mt-6">
            <Lock className="h-3 w-3" style={{ color: "#3f3f46" }} />
            <p className="text-[10px] tracking-wide" style={{ color: "#3f3f46" }}>
              Secure Enterprise Access
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-[10px] mt-8 tracking-wide"
          style={{ color: "rgba(255,255,255,0.12)" }}>
          &copy; 2026 Ali & Sons Group
        </p>
      </div>

      {/* Scoped styles */}
      <style>{`
        @keyframes login-enter {
          from { opacity: 0; transform: translateY(12px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .login-input:focus {
          border-color: #c6a646 !important;
          box-shadow: 0 0 0 3px rgba(198,166,70,0.12);
        }
        .login-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 24px rgba(198,166,70,0.25);
        }
        .login-btn:active:not(:disabled) {
          transform: translateY(0) scale(0.98);
        }
      `}</style>
    </div>
  );
}
