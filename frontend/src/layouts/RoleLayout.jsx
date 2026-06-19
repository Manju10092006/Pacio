import React, { useEffect, useState } from "react";
import { NavLink, Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import { LogOut, ArrowUpRight, Menu, X, Search, Bell, Sparkles } from "lucide-react";
import { useAuth } from "../App";
import { api, setAuthToken } from "../lib/api";

function SidebarBody({ label, role, accent, sections, user, onLogout, isMobile, onClose }) {
  return (
    <div className="dashboard-sidebar h-full w-[286px] flex flex-col lg:rounded-r-[34px]">
      <div className="p-6 flex items-start justify-between">
        <Link to="/" className="flex items-center gap-3" data-testid="dash-brand">
          <div className="w-10 h-10 rounded-2xl bg-ink-900 grid place-items-center shadow-sm">
            <div className="w-3 h-3 rounded-full" style={{ background: accent }} />
          </div>
          <div>
            <div className="font-display text-[22px] leading-none">CareerOS</div>
            <div className="mt-1 text-[11px] font-medium text-ink-400">{label}</div>
          </div>
        </Link>
        {isMobile && (
          <button className="p-2 rounded-full bg-white/80 border border-line" onClick={onClose} data-testid="drawer-close" aria-label="Close menu">
            <X size={18} />
          </button>
        )}
      </div>

      <div className="px-5 pb-4">
        <div className="soft-input flex items-center gap-2 px-3 py-2.5 text-sm text-ink-400">
          <Search size={15} />
          <span>Search console...</span>
          <span className="ml-auto rounded-full bg-bone-200 px-2 py-0.5 text-[10px] text-ink-400">/</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-4">
        {sections.map((s) => (
          <div key={s.title} className="mb-6">
            <div className="px-7 pb-2 text-[12px] font-semibold text-ink-400">{s.title}</div>
            <nav className="px-4 space-y-1.5">
              {s.items.map(({ to, label: itemLabel, icon: Icon, key }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={key === "command" || key === "overview" || key === "home"}
                  data-testid={`nav-${key}`}
                  className={({ isActive }) =>
                    `group flex items-center gap-3 rounded-2xl px-3.5 py-3 text-sm transition-all ${
                      isActive
                        ? "bg-white text-ink-900 font-semibold shadow-[0_14px_30px_-22px_rgba(23,25,28,0.45)] ring-1 ring-line"
                        : "text-ink-500 hover:text-ink-900 hover:bg-white/60"
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span
                        className="grid h-8 w-8 place-items-center rounded-xl bg-bone-200/70 text-ink-500 transition-colors group-hover:bg-white"
                        style={isActive ? { background: `${accent}18`, color: accent } : {}}
                      >
                        <Icon size={16} />
                      </span>
                      <span>{itemLabel}</span>
                      {isActive && <span className="ml-auto h-2 w-2 rounded-full" style={{ background: accent }} />}
                    </>
                  )}
                </NavLink>
              ))}
            </nav>
          </div>
        ))}
      </div>

      <div className="m-4 rounded-[24px] bg-white/74 p-4 ring-1 ring-line shadow-[0_18px_42px_-30px_rgba(23,25,28,0.42)]">
        <div className="mb-4 flex items-center gap-2 rounded-2xl bg-accent-soft/70 px-3 py-2 text-[12px] text-accent">
          <Sparkles size={14} />
          <span className="font-medium">Intelligence workspace</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl grid place-items-center font-display text-lg text-bone-50" style={{ background: accent }}>
            {(user?.name || "?").charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate" data-testid="user-name">{user?.name}</div>
            <div className="text-[11px] text-ink-400">{role.replace("_", " ")}</div>
          </div>
          <button onClick={onLogout} data-testid="logout-btn" title="Sign out" className="grid h-9 w-9 place-items-center rounded-full bg-bone-100 text-ink-400 hover:text-accent transition-colors">
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
    <div className="dashboard-shell min-h-screen text-ink-900 flex">
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
        <header className="dashboard-topbar mx-3 mt-3 lg:mx-6 lg:mt-5 h-16 rounded-[24px] flex items-center justify-between px-4 lg:px-5 sticky top-3 lg:top-5 z-30">
          <div className="flex items-center gap-3">
            <button className="lg:hidden p-2 rounded-full bg-white hover:bg-bone-200 transition-colors" onClick={() => setOpen(true)} data-testid="mobile-menu-btn" aria-label="Open menu">
              <Menu size={18} />
            </button>
            <div className="hidden md:flex soft-input h-10 min-w-[260px] items-center gap-2 px-3 text-sm text-ink-400">
              <Search size={15} />
              <span>Search students, drives, reports...</span>
            </div>
            <div className="ticker text-ink-400 hidden xl:flex items-center gap-3" data-testid="topbar-ticker">
              <span>CAREEROS</span>
              <span className="w-1 h-1 bg-accent rounded-full" />
              <span className="text-ink-900">{label}</span>
              <span>{new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short", year: "numeric" })}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="pill hidden md:inline-flex" data-testid="env-badge">Live Production</span>
            <button className="grid h-10 w-10 place-items-center rounded-full bg-white/84 border border-line text-ink-500 hover:text-ink" aria-label="Notifications">
              <Bell size={16} />
            </button>
            <Link to="/" className="pill hidden sm:inline-flex items-center gap-1">careeros.app <ArrowUpRight size={12} /></Link>
            <div className="grid h-10 w-10 place-items-center rounded-full text-sm font-semibold text-white" style={{ background: accent }}>
              {(user?.name || "?").charAt(0)}
            </div>
          </div>
        </header>

        <div className="dashboard-main p-3 sm:p-5 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
