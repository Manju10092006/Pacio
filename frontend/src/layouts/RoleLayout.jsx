import React, { useEffect, useState } from "react";
import { NavLink, Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import { LogOut, ArrowUpRight, Menu, X, Search, Bell, Sparkles } from "lucide-react";
import { useAuth } from "../App";
import { api, setAuthToken } from "../lib/api";

function SidebarBody({ label, role, accent, sections, user, onLogout, isMobile, onClose }) {
  return (
    <div className="h-full w-[292px] fusion-sidebar flex flex-col">
      <div className="p-6 flex items-start justify-between">
        <Link to="/" className="flex items-center gap-3" data-testid="dash-brand">
          <div className="w-10 h-10 rounded-2xl bg-white/18 border border-white/22 grid place-items-center shadow-lg shadow-[0_18px_35px_rgba(37,23,94,0.16)]">
            <Sparkles size={17} className="text-white" />
          </div>
          <div>
            <div className="font-display font-bold tracking-tight text-[16px] text-white">CareerOS</div>
            <div className="font-mono text-[9px] tracking-[0.24em] text-white/62 uppercase">{label}</div>
          </div>
        </Link>
        {isMobile && (
          <button className="p-1 rounded-lg bg-white/10 text-white" onClick={onClose} data-testid="drawer-close" aria-label="Close menu">
            <X size={18} />
          </button>
        )}
      </div>

      <div className="px-4 pb-5">
        <div className="flex items-center gap-2 rounded-2xl border border-white/16 bg-white/12 px-3 py-2 text-white/70">
          <Search size={15} />
          <span className="text-xs">Search workspace</span>
          <span className="ml-auto rounded-lg bg-white/12 px-1.5 py-0.5 font-mono text-[9px]">Ctrl K</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {sections.map((s) => (
          <div key={s.title} className="mb-6">
            <div className="px-6 pb-2 font-mono text-[10px] tracking-[0.22em] text-white/48 uppercase">{s.title}</div>
            <nav className="px-3 space-y-1">
              {s.items.map(({ to, label: ll, icon: Icon, key }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={key === "command" || key === "overview" || key === "home"}
                  data-testid={`nav-${key}`}
                  className={({ isActive }) =>
                    `fusion-nav-item flex items-center gap-3 px-4 py-2.5 text-sm transition-all duration-200 ${
                      isActive ? "fusion-nav-item-active font-semibold" : "font-medium"
                    }`
                  }
                >
                  <Icon size={16} />
                  <span>{ll}</span>
                </NavLink>
              ))}
            </nav>
          </div>
        ))}
      </div>

      <div className="p-4">
        <div className="flex items-center gap-3 rounded-3xl border border-white/18 bg-white/13 p-3">
          <div className="w-10 h-10 rounded-2xl grid place-items-center font-display font-bold text-white shadow-md shadow-[0_18px_35px_rgba(37,23,94,0.16)]" style={{ background: accent }}>
            {(user?.name || "?").charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold truncate text-white" data-testid="user-name">{user?.name}</div>
            <div className="font-mono text-[10px] tracking-[0.12em] text-white/55 uppercase">{role.replace("_", " ")}</div>
          </div>
          <button onClick={onLogout} data-testid="logout-btn" title="Sign out" className="rounded-xl p-2 text-white/62 hover:bg-white/14 hover:text-white transition-colors">
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
    <div className="min-h-screen dashboard-shell text-ink-900 flex">
      <aside className="hidden lg:flex shrink-0">
        <SidebarBody {...shared} isMobile={false} />
      </aside>

      {open && (
        <>
          <div className="fixed inset-0 bg-violet/30 backdrop-blur-sm z-40 lg:hidden" onClick={() => setOpen(false)} aria-hidden />
          <aside className="fixed inset-y-0 left-0 z-50 lg:hidden shadow-2xl animate-[slidein_.25s_ease-out]" data-testid="mobile-drawer">
            <SidebarBody {...shared} isMobile={true} onClose={() => setOpen(false)} />
          </aside>
        </>
      )}

      <main className="dashboard-main flex-1 min-w-0 relative">
        <header className="h-16 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-30">
          <div className="flex items-center gap-3 min-w-0">
            <button className="lg:hidden p-2 -ml-1 rounded-2xl bg-white/80 border border-line hover:bg-white transition-colors" onClick={() => setOpen(true)} data-testid="mobile-menu-btn" aria-label="Open menu">
              <Menu size={18} />
            </button>
            <div className="ticker text-ink-400 flex items-center gap-3 min-w-0" data-testid="topbar-ticker">
              <span>CAREEROS</span>
              <span className="w-1 h-1 bg-accent rounded-full" />
              <span className="text-ink-900 truncate">{label}</span>
              <span className="hidden md:inline text-ink-400">.</span>
              <span className="hidden md:inline">{new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short", year: "numeric" })}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="hidden xl:flex h-10 w-[280px] items-center gap-2 rounded-2xl border border-line bg-white/78 px-3 text-xs text-ink-500 shadow-sm backdrop-blur-md">
              <Search size={15} />
              <span>Search students, drives, reports...</span>
            </button>
            <button className="grid h-10 w-10 place-items-center rounded-2xl border border-line bg-white/78 text-ink-500 shadow-sm backdrop-blur-md">
              <Bell size={16} />
            </button>
            <span className="pill pill-accent hidden md:inline-flex" data-testid="env-badge">Live / Production data</span>
            <Link to="/" className="text-sm text-ink-500 ink-link hidden md:inline-flex items-center gap-1">careeros.app <ArrowUpRight size={12} /></Link>
          </div>
        </header>

        <div className="p-4 sm:p-6 lg:px-10 lg:pb-10 lg:pt-4">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
