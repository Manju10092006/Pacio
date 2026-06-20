import React, { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { BarChart3, Briefcase, Building2, ChevronDown, LayoutGrid, List, Search, TrendingUp } from "lucide-react";
import CompanyLogo from "../components/CompanyLogo";

export default function Recruiters() {
  const [items, setItems] = useState([]);
  const [viewMode, setViewMode] = useState("Cards");
  const [industry, setIndustry] = useState("All");

  useEffect(() => {
    api.get("/recruiters").then(({ data }) => setItems(data.items || [])).catch(() => setItems([]));
  }, []);

  const industries = useMemo(() => ["All", ...Array.from(new Set(items.map((r) => r.industry).filter(Boolean)))], [items]);
  const filtered = industry === "All" ? items : items.filter((r) => r.industry === industry);
  const groups = useMemo(() => {
    const grouped = filtered.reduce((acc, rec) => {
      const key = rec.industry || "Other";
      if (!acc[key]) acc[key] = [];
      acc[key].push(rec);
      return acc;
    }, {});
    return Object.entries(grouped);
  }, [filtered]);

  const totals = {
    recruiters: items.length,
    drives: items.reduce((sum, r) => sum + Number(r.drives_count || 0), 0),
    hires: items.reduce((sum, r) => sum + Number(r.hires_total || 0), 0),
    avgCtc: items.length ? (items.reduce((sum, r) => sum + Number(r.avg_ctc_offered || 0), 0) / items.length).toFixed(1) : 0,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="font-mono text-[10px] tracking-[0.28em] text-ink-400">RECRUITER NETWORK</div>
          <h1 className="font-display text-5xl md:text-6xl tracking-tightest mt-3" data-testid="rec-heading">
            {items.length} active <span className="text-accent">partners.</span>
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden lg:flex items-center gap-2 border border-line bg-bone-50 px-3 py-2 text-xs text-ink-400">
            <Search size={14} /> Search companies, roles, industries...
          </div>
          <div className="flex items-center gap-1 border border-line bg-bone-50 p-1">
            {["Cards", "List"].map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono ${viewMode === mode ? "bg-ink-900 text-bone-100" : "text-ink-400"}`}
              >
                {mode === "Cards" ? <LayoutGrid size={13} /> : <List size={13} />} {mode}
              </button>
            ))}
          </div>
        </div>
      </div>

      <section className="grid grid-cols-12 gap-3">
        {[
          { label: "Recruiters", value: totals.recruiters, icon: Building2 },
          { label: "Open drives", value: totals.drives, icon: Briefcase },
          { label: "Total hires", value: totals.hires, icon: TrendingUp },
          { label: "Avg CTC", value: `Rs ${totals.avgCtc}L`, icon: BarChart3 },
        ].map((card) => (
          <div key={card.label} className="col-span-12 md:col-span-3 editorial p-5">
            <div className="flex items-center justify-between">
              <div className="font-mono text-[10px] tracking-[0.22em] text-ink-400 uppercase">{card.label}</div>
              <card.icon size={16} className="text-accent" />
            </div>
            <div className="font-display text-4xl tracking-tightest mt-4 tnum">{card.value}</div>
          </div>
        ))}
      </section>

      <div className="flex flex-wrap items-center gap-2">
        {industries.map((i) => (
          <button
            key={i}
            onClick={() => setIndustry(i)}
            className={`pill ${industry === i ? "pill-solid" : ""}`}
          >
            {i} <ChevronDown size={12} />
          </button>
        ))}
      </div>

      <div className="space-y-8" data-testid="rec-grid">
        {groups.map(([group, recruiters]) => (
          <section key={group}>
            <div className="flex items-center gap-2 mb-4">
              <h3 className="font-display text-2xl tracking-tight">{group}</h3>
              <span className="pill">{recruiters.length}</span>
            </div>
            <div className={viewMode === "Cards" ? "grid grid-cols-12 gap-3" : "space-y-3"}>
              {recruiters.map((r, i) => {
                const drivePct = Math.min(100, Number(r.drives_count || 0) * 12);
                const hirePct = Math.min(100, Number(r.hires_total || 0) * 4);
                return (
                  <div
                    key={r.recruiter_id}
                    className={`${viewMode === "Cards" ? "col-span-12 md:col-span-6 lg:col-span-4" : ""} editorial p-6 group hover:border-accent transition-colors`}
                    data-testid={`rec-${i}`}
                  >
                    <div className="flex items-center gap-4">
                      <CompanyLogo name={r.name} className="w-12 h-12 border border-line p-1" />
                      <div className="min-w-0 flex-1">
                        <div className="font-display text-2xl tracking-tight truncate">{r.name}</div>
                        <div className="font-mono text-[10px] tracking-[0.18em] text-ink-400 uppercase">{r.industry}</div>
                      </div>
                    </div>
                    <div className="hairline my-5" />
                    <div className="space-y-4">
                      <div>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-ink-500">Drive activity</span>
                          <span className="font-mono text-accent">{r.drives_count || 0}</span>
                        </div>
                        <div className="h-2 bg-bone-200"><div className="h-full bg-accent" style={{ width: `${drivePct}%` }} /></div>
                      </div>
                      <div>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-ink-500">Hiring conversion</span>
                          <span className="font-mono text-accent">{r.hires_total || 0}</span>
                        </div>
                        <div className="h-2 bg-bone-200"><div className="h-full bg-ink-900" style={{ width: `${hirePct}%` }} /></div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-xs mt-5">
                      <div>
                        <div className="font-mono text-[10px] text-ink-400 tracking-[0.18em]">HIRES</div>
                        <div className="font-display text-2xl tnum mt-0.5">{r.hires_total}</div>
                      </div>
                      <div>
                        <div className="font-mono text-[10px] text-ink-400 tracking-[0.18em]">DRIVES</div>
                        <div className="font-display text-2xl tnum mt-0.5">{r.drives_count}</div>
                      </div>
                      <div>
                        <div className="font-mono text-[10px] text-ink-400 tracking-[0.18em]">AVG CTC</div>
                        <div className="font-display text-2xl tnum mt-0.5 text-accent">Rs {r.avg_ctc_offered}L</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
        {items.length === 0 && <div className="editorial p-12 text-center text-ink-400">No recruiters returned by API.</div>}
      </div>
    </div>
  );
}
