import React, { useEffect, useState } from "react";
import { NavLink, Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import { LogOut, ArrowUpRight, Menu, X } from "lucide-react";
import { useAuth } from "../App";
import { api, setAuthToken } from "../lib/api";

function SidebarBody({ label, role, accent, sections, user, onLogout, isMobile, onClose }) {
  return (
    <div className="h-full w-[280px] bg-bone-50 border-r border-line flex flex-col">
      <div className="p-6 border-b border-line flex items-start justify-between">
        <Link to="/" className="flex items-center gap-3" data-testid="dash-brand">
          <div className="w-7 h-7 bg-ink-900 grid place-items-center"><div className="w-2 h-2" style={{ background: accent }} /></div>
          <div>
            <div className="font-display font-bold tracking-tight text-[15px]">CareerOS</div>
            <div className="font-mono text-[9px] tracking-[0.28em] text-ink-400 uppercase">{label}</div>
          </div>
        </Link>
        {isMobile && (
          <button className="p-1" onClick={onClose} data-testid="drawer-close" aria-label="Close menu">
            <X size={18} />
          </button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto py-4">
        {sections.map((s) => (
          <div key={s.title} className="mb-6">
            <div className="px-7 pb-2 font-mono text-[10px] tracking-[0.28em] text-ink-400">{s.title}</div>
            <nav className="px-3 space-y-px">
              {s.items.map(({ to, label: ll, icon: Icon, key }) => (
                <NavLink
                  key={to} to={to} end={key === "command" || key === "overview" || key === "home"}
                  data-testid={`nav-${key}`}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-2.5 text-sm transition-colors border-l-2 ${
                      isActive ? "border-l-[3px] bg-bone-100 text-ink-900 font-medium" : "border-transparent text-ink-500 hover:text-ink-900 hover:bg-bone-100"
                    }`
                  }
                  style={({ isActive }) => isActive ? { borderColor: accent } : {}}
                >
                  <Icon size={16} />
                  <span>{ll}</span>
                </NavLink>
              ))}
            </nav>
          </div>
        ))}
      </div>
      <div className="p-5 border-t border-line">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 grid place-items-center font-display font-bold text-bone-50" style={{ background: accent }}>
            {(user?.name || "?").charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate" data-testid="user-name">{user?.name}</div>
            <div className="font-mono text-[10px] tracking-[0.16em] text-ink-400 uppercase">{role.replace("_", " ")}</div>
          </div>
          <button onClick={onLogout} data-testid="logout-btn" title="Sign out" className="text-ink-400 hover:text-accent transition-colors">
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
  const [cmdOpen, setCmdOpen] = useState(false);
  const [cmdQuery, setCmdQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  const allItems = sections.flatMap((s) => s.items);
  const filteredItems = allItems.filter((item) =>
    item.label.toLowerCase().includes(cmdQuery.toLowerCase())
  );

  useEffect(() => { setOpen(false); }, [location.pathname]);
  useEffect(() => {
    document.body.style.overflow = (open || cmdOpen) ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open, cmdOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCmdOpen((o) => !o);
        setCmdQuery("");
        setSelectedIndex(0);
      } else if (e.key === "Escape") {
        setCmdOpen(false);
      } else if (cmdOpen) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredItems.length));
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % Math.max(1, filteredItems.length));
        } else if (e.key === "Enter") {
          e.preventDefault();
          if (filteredItems[selectedIndex]) {
            navigate(filteredItems[selectedIndex].to);
            setCmdOpen(false);
          }
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [cmdOpen, filteredItems, navigate, selectedIndex]);

  useEffect(() => {
    if (cmdOpen) {
      setSelectedIndex(0);
    }
  }, [cmdQuery, cmdOpen]);

  const logout = async () => {
    await api.post("/auth/logout").catch(() => {});
    setAuthToken(null);
    setUser(null);
    navigate("/");
  };

  const shared = { label, role, accent, sections, user, onLogout: logout };

  return (
    <div className="min-h-screen bg-bone-100 text-ink-900 flex">
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

      {/* COMMAND PALETTE */}
      {cmdOpen && (
        <div 
          className="fixed inset-0 bg-ink-900/60 backdrop-blur-sm z-50 flex items-start justify-center pt-24 px-4"
          onClick={() => setCmdOpen(false)}
        >
          <div 
            className="bg-bone-50 border border-line w-full max-w-lg shadow-2xl overflow-hidden animate-[fadein_.15s_ease-out]"
            onClick={(e) => e.stopPropagation()}
            data-testid="command-palette"
          >
            <div className="p-4 border-b border-line flex items-center gap-3">
              <span className="font-mono text-xs text-ink-400">SEARCH</span>
              <input
                type="text"
                autoFocus
                placeholder="Type a page name to navigate..."
                value={cmdQuery}
                onChange={(e) => setCmdQuery(e.target.value)}
                className="w-full bg-transparent focus:outline-none font-sans text-sm text-ink-900"
              />
              <span className="font-mono text-[9px] border border-line px-1.5 py-0.5 text-ink-400">ESC</span>
            </div>
            
            <div className="max-h-[300px] overflow-y-auto divide-y divide-line/30 font-mono text-xs">
              {filteredItems.map((item, idx) => {
                const Icon = item.icon;
                const active = idx === selectedIndex;
                return (
                  <div
                    key={item.to}
                    onClick={() => {
                      navigate(item.to);
                      setCmdOpen(false);
                    }}
                    className={`flex items-center justify-between px-4 py-3.5 cursor-pointer transition-all ${
                      active ? "bg-accent/10 border-l-4" : "hover:bg-bone-100/50"
                    }`}
                    style={active ? { borderLeftColor: accent } : {}}
                  >
                    <div className="flex items-center gap-3">
                      {Icon && <Icon size={14} className={active ? "text-accent" : "text-ink-400"} />}
                      <span className={active ? "font-bold text-accent" : "text-ink-700"}>{item.label}</span>
                    </div>
                    {active && <span className="text-[10px] text-accent/70 tracking-widest font-sans font-bold">ENTER ↵</span>}
                  </div>
                );
              })}
              {filteredItems.length === 0 && (
                <div className="p-8 text-center text-ink-400 font-serif">No matching pages found.</div>
              )}
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 min-w-0 relative">
        <header className="h-12 border-b border-line bg-bone-50 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-30 glass">
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
            <button 
              onClick={() => setCmdOpen(true)}
              className="hidden md:inline-flex items-center gap-1.5 text-xs font-mono border border-line px-2 py-1 bg-bone-100 hover:border-accent hover:text-accent transition-colors"
            >
              <span>Search</span>
              <span className="border-l border-line-strong pl-1.5 text-ink-400">⌘K</span>
            </button>
            <span className="pill hidden md:inline-flex" data-testid="env-badge">Live · Production data</span>
            <Link to="/" className="text-sm text-ink-500 ink-link hidden md:inline-flex items-center gap-1">careeros.app <ArrowUpRight size={12} /></Link>
          </div>
        </header>

        <div className="p-4 sm:p-6 lg:p-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
