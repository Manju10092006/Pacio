import React, { useEffect, useState, createContext, useContext } from "react";
import { Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { Toaster } from "sonner";
import { api } from "./lib/api";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import AuthCallback from "./pages/AuthCallback";
import DashboardLayout from "./pages/DashboardLayout";
import Overview from "./pages/Overview";
import CollegeProfile from "./pages/CollegeProfile";
import StudentRoster from "./pages/StudentRoster";
import Cohorts from "./pages/Cohorts";
import Outcomes from "./pages/Outcomes";
import Training from "./pages/Training";
import MOU from "./pages/MOU";
import AdminPanel from "./pages/AdminPanel";
import OnboardingPending from "./pages/OnboardingPending";

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      const { data } = await api.get("/auth/me");
      setUser(data);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // If returning from OAuth, AuthCallback will set user; skip /me here
    if (window.location.hash?.includes("session_id=")) {
      setLoading(false);
      return;
    }
    refresh();
    // eslint-disable-next-line
  }, []);

  return (
    <AuthCtx.Provider value={{ user, setUser, loading, refresh }}>
      {children}
    </AuthCtx.Provider>
  );
}

function Protected({ children }) {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-ink-400 num-mono text-xs tracking-[0.3em]">LOADING ·</div>;
  if (!user) return <Navigate to="/login" state={{ from: loc }} replace />;
  if (!user.approved && user.role !== "super_admin") return <Navigate to="/pending" replace />;
  return children;
}

function AppRouter() {
  const location = useLocation();
  if (location.hash?.includes("session_id=")) return <AuthCallback />;
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/pending" element={<OnboardingPending />} />
      <Route path="/app" element={<Protected><DashboardLayout /></Protected>}>
        <Route index element={<Navigate to="overview" replace />} />
        <Route path="overview" element={<Overview />} />
        <Route path="college" element={<CollegeProfile />} />
        <Route path="roster" element={<StudentRoster />} />
        <Route path="cohorts" element={<Cohorts />} />
        <Route path="outcomes" element={<Outcomes />} />
        <Route path="training" element={<Training />} />
        <Route path="mou" element={<MOU />} />
        <Route path="admin" element={<AdminPanel />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Toaster position="top-right" theme="light" toastOptions={{ style: { borderRadius: 0, border: "1px solid rgba(17,17,17,0.18)", fontFamily: "Satoshi, system-ui" } }} />
      <AppRouter />
    </AuthProvider>
  );
}
