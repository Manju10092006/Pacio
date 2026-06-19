import React, { useEffect, useState } from "react";
import { NavLink, Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import { LogOut, ArrowUpRight, Menu, X } from "lucide-react";
import { useAuth } from "../App";
import { api, setAuthToken } from "../lib/api";

function SidebarBody({ label, role, accent, sections, user, onLogout, isMobile, onClose }) {
  return (
    <div className="h-full w-[288px] command-dark border-r border-white/10 flex flex-col">
      <div className="p-6 border-b border-white/10 flex items-start justify-between">
        <Link to="/" className="flex items-center gap-3" data-testid="dash-brand">
          <div className="w-8 h-8 rounded-[8px] bg-white/10 border border-white/10 grid place-items-center"><div className="w-2 h-2 rounded-full" style={{ background: accent, boxShadow: `0 0 20px ${accent}` }} /></div>
          <div>
            <div className="font-display font-bold tracking-tight text-[15px] text-bone">CareerOS</div>
            <div className="font-mono text-[9px] tracking-[0.28em] text-bone/45 uppercase">{label}</div>
          </div>
        </Link>
        {isMobile && (
          <button className="p-1 text-bone/70 hover:text-bone" onClick={onClose} data-testid="drawer-close" aria-label="Close menu">
            <X size={18} />
          </button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto py-4">
        {sections.map((s) => (
          <div key={s.title} className="mb-6">
            <div className="px-7 pb-2 font-mono text-[10px] tracking-[0.28em] text-bone/35">{s.title}</div>
            <nav className="px-3 space-y-px">
              {s.items.map(({ to, label: ll, icon: Icon, key }) => (
                <NavLink
                  key={to} to={to} end={key === "command" || key === "overview" || key === "home"}
                  data-testid={`nav-${key}`}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-2.5 text-sm transition-colors rounded-[8px] border border-transparent ${
                      isActive ? "bg-white/10 text-bone font-medium" : "text-bone/60 hover:text-bone hover:bg-white/5"
                    }`
                  }
                  style={({ isActive }) => isActive ? { borderColor: `${accent}55`, boxShadow: `inset 3px 0 0 ${accent}` } : {}}
                >
                  <Icon size={16} />
                  <span>{ll}</span>
                </NavLink>
              ))}
            </nav>
          </div>
        ))}
      </div>
      <div className="p-5 border-t border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-[8px] grid place-items-center font-display font-bold text-bone-50" style={{ background: accent }}>
            {(user?.name || "?").charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate text-bone" data-testid="user-name">{user?.name}</div>
            <div className="font-mono text-[10px] tracking-[0.16em] text-bone/40 uppercase">{role.replace("_", " ")}</div>
          </div>
          <button onClick={onLogout} data-testid="logout-btn" title="Sign out" className="text-bone/40 hover:text-accent transition-colors">
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function RoleLayout({ label, role, accent, sections }) {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  useEffect(() => { setOpen(false); }, [location.pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const logout = async () => {
    await api.post("/auth/logout").catch(() => {});
    setAuthToken(null);
    setUser(null);
    navigate("/");
  };

  const shared = { label, role, accent, sections, user, onLogout: logout };

  return (
    <div className="min-h-screen text-ink-900 flex">
      <aside className="hidden lg:flex shrink-0">
        <SidebarBody {...shared} isMobile={false} />
      </aside>

      {open && (
        <>
          <div className="fixed inset-0 bg-ink-900/40 z-40 lg:hidden" onClick={() => setOpen(false)} aria-hidden />
          <aside className="fixed inset-y-0 left-0 z-50 lg:hidden shadow-2xl animate-[slidein_.25s_ease-out]" data-testid="mobile-drawer">
            <SidebarBody {...shared} isMobile={true} onClose={() => setOpen(false)} />
          </aside>
        </>
      )}

      <main className="flex-1 min-w-0 relative">
        <header className="h-14 border-b border-line flex items-center justify-between px-4 lg:px-8 sticky top-0 z-30 glass">
          <div className="flex items-center gap-3">
            <button className="lg:hidden p-1.5 -ml-1 hover:bg-bone-200 transition-colors" onClick={() => setOpen(true)} data-testid="mobile-menu-btn" aria-label="Open menu">
              <Menu size={18} />
            </button>
            <div className="ticker text-ink-400 flex items-center gap-3" data-testid="topbar-ticker">
              <span>CAREEROS</span>
              <span className="w-1 h-1 bg-accent rounded-full" />
              <span className="text-ink-900">{label}</span>
              <span className="hidden md:inline text-ink-400">·</span>
              <span className="hidden md:inline">{new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short", year: "numeric" })}</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="pill hidden md:inline-flex" data-testid="env-badge">Live · Production data</span>
            <Link to="/" className="text-sm text-ink-500 ink-link hidden md:inline-flex items-center gap-1">careeros.app <ArrowUpRight size={12} /></Link>
          </div>
        </header>

        <div className="p-4 sm:p-6 lg:p-8 xl:p-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
