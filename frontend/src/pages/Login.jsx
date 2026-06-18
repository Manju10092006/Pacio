import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowUpRight, ArrowLeft } from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../App";
import { toast } from "sonner";

export default function Login() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [demoEmail, setDemoEmail] = useState("tpo@kmit.in");
  const [busy, setBusy] = useState(false);

  // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
  const handleGoogle = () => {
    const redirectUrl = window.location.origin + "/app/overview";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  const handleDemo = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data } = await api.post("/auth/dev-login", { email: demoEmail });
      setUser(data.user);
      const role = data.user.role;
      const approved = data.user.approved;
      if (role === "super_admin") navigate("/app/admin");
      else if (!approved) navigate("/pending");
      else navigate("/app/overview");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Login failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-bone-100 grid md:grid-cols-2 grain">
      {/* Left — editorial */}
      <div className="relative hidden md:flex bg-ink-900 text-bone-100 p-12 flex-col justify-between overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "linear-gradient(135deg, transparent 49.5%, #1538C8 49.5%, #1538C8 50.5%, transparent 50.5%)", backgroundSize: "80px 80px" }} />
        <div className="relative">
          <Link to="/" className="inline-flex items-center gap-3" data-testid="login-brand">
            <div className="w-7 h-7 bg-bone-100 grid place-items-center"><div className="w-2 h-2 bg-accent" /></div>
            <span className="font-display font-bold tracking-tight">CareerOS</span>
          </Link>
        </div>
        <div className="relative">
          <div className="num-mono text-[11px] tracking-[0.24em] text-bone-100/40 mb-6">§ MISSION CONTROL</div>
          <h1 className="font-display text-5xl lg:text-6xl tracking-tightest leading-[0.9]">
            The placement cell <span className="text-accent">deserves</span> a control room.
          </h1>
          <p className="font-serif text-lg text-bone-100/70 mt-8 max-w-md">
            Sign in with your institutional email. Access is gated by a Skill Tank super-admin — verified partners only.
          </p>
        </div>
        <div className="relative num-mono text-[10px] tracking-[0.24em] text-bone-100/40">
          AUTH · GOOGLE OAUTH · TLS 1.3 · SECURE COOKIE
        </div>
      </div>

      {/* Right — form */}
      <div className="flex items-center justify-center p-8 md:p-16">
        <div className="w-full max-w-md">
          <Link to="/" className="ink-link text-sm text-bone-100/55 inline-flex items-center gap-2 mb-12"><ArrowLeft size={14} /> Back</Link>
          <div className="num-mono text-[11px] tracking-[0.28em] text-bone-100/45">SIGN IN · STEP 01</div>
          <h2 className="font-display text-4xl md:text-5xl tracking-tightest mt-3">Welcome back.</h2>
          <p className="font-serif text-lg text-bone-100/55 mt-3">Choose how you'd like to enter the command center.</p>

          <button
            onClick={handleGoogle}
            data-testid="google-signin-btn"
            className="mt-10 w-full flex items-center justify-center gap-3 bg-accent text-bone-100 px-6 py-4 text-sm font-medium hover:bg-accent transition-colors group"
          >
            <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.5-5.9 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C33.9 6.1 29.2 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C33.9 6.1 29.2 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.1 0 9.8-2 13.3-5.2l-6.1-5.2c-2 1.4-4.5 2.4-7.2 2.4-5.3 0-9.7-3.5-11.3-8.3l-6.6 5.1C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.2 5.6l6.1 5.2c-.4.4 6.8-5 6.8-14.8 0-1.3-.1-2.3-.4-3.5z"/></svg>
            Continue with Google
            <ArrowUpRight size={14} className="group-hover:rotate-45 transition-transform" />
          </button>

          <div className="my-10 hairline" />

          <div className="num-mono text-[11px] tracking-[0.28em] text-ink-400 mb-4">DEMO · INSTANT ACCESS</div>
          <form onSubmit={handleDemo} className="space-y-3">
            <select
              value={demoEmail}
              onChange={(e) => setDemoEmail(e.target.value)}
              data-testid="demo-email-select"
              className="w-full px-4 py-3.5 border border-line bg-bone-50 text-ink-900 focus:outline-none focus:border-ink-900"
            >
              <option value="tpo@kmit.in">TPO · Dr. Neil Gogte (KMIT)</option>
              <option value="hod.cse@kmit.in">HOD · Prof. Lavanya Iyer (CSE)</option>
              <option value="coord@kmit.in">Coordinator · Ananya Reddy</option>
              <option value="admin@careeros.app">Super Admin · CareerOS</option>
              <option value="tpo@vasavi.ac.in">Pending TPO · Vasavi (test approval flow)</option>
            </select>
            <button
              type="submit"
              disabled={busy}
              data-testid="demo-login-btn"
              className="w-full flex items-center justify-center gap-3 border border-ink-900 text-ink-900 px-6 py-4 text-sm font-medium hover:bg-accent hover:text-bone-100 transition-colors disabled:opacity-50"
            >
              {busy ? "Entering…" : "Enter as selected role"}
              <ArrowUpRight size={14} />
            </button>
          </form>

          <p className="text-xs text-ink-400 mt-8 leading-relaxed">
            By signing in you agree to CareerOS terms of use. Institutional data is encrypted in transit and at rest.
          </p>
        </div>
      </div>
    </main>
  );
}
