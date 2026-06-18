import React, { useEffect, useState } from "react";
import { api } from "../lib/api";

export default function TalentPool() {
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState(null);
  const [filters, setFilters] = useState({ minCgpa: 7.0, minReadiness: 70, department: "", skill: "" });

  const load = (next = filters) => {
    const params = new URLSearchParams({
      min_cgpa: next.minCgpa,
      min_readiness: next.minReadiness,
      limit: 80,
    });
    if (next.department) params.set("department", next.department);
    if (next.skill) params.set("skill", next.skill);
    api.get(`/recruiters/me/talent-pool?${params.toString()}`).then(({ data }) => {
      setItems(data.items || []);
      setMeta(data);
    });
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  const setFilter = (key, value) => setFilters((current) => ({ ...current, [key]: value }));

  return (
    <div className="space-y-10">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div>
          <div className="font-mono text-[10px] tracking-[0.28em] text-ink-400">TALENT POOL</div>
          <h1 className="font-display text-5xl md:text-6xl tracking-tightest mt-3" data-testid="talent-heading">
            Discover ready talent.
          </h1>
          <p className="font-serif text-lg text-ink-500 mt-2 max-w-xl">Filter by readiness, CGPA, department, and skill signal across partner institutions.</p>
        </div>
        <div className="editorial p-4 grid grid-cols-2 md:grid-cols-5 gap-3">
          <label className="font-mono text-[10px] tracking-[0.18em] text-ink-400">
            MIN CGPA
            <input type="number" step="0.1" min="6" max="10" value={filters.minCgpa} onChange={(e) => setFilter("minCgpa", e.target.value)}
              data-testid="talent-cgpa" className="mt-1 w-full bg-bone-50 border border-line px-3 py-2 font-display text-xl focus:outline-none" />
          </label>
          <label className="font-mono text-[10px] tracking-[0.18em] text-ink-400">
            READINESS
            <input type="number" step="1" min="0" max="100" value={filters.minReadiness} onChange={(e) => setFilter("minReadiness", e.target.value)}
              data-testid="talent-readiness" className="mt-1 w-full bg-bone-50 border border-line px-3 py-2 font-display text-xl focus:outline-none" />
          </label>
          <label className="font-mono text-[10px] tracking-[0.18em] text-ink-400">
            DEPT
            <input value={filters.department} onChange={(e) => setFilter("department", e.target.value.toUpperCase())}
              data-testid="talent-dept" placeholder="CSE" className="mt-1 w-full bg-bone-50 border border-line px-3 py-2 text-sm focus:outline-none" />
          </label>
          <label className="font-mono text-[10px] tracking-[0.18em] text-ink-400">
            SKILL
            <input value={filters.skill} onChange={(e) => setFilter("skill", e.target.value)}
              data-testid="talent-skill" placeholder="React" className="mt-1 w-full bg-bone-50 border border-line px-3 py-2 text-sm focus:outline-none" />
          </label>
          <button onClick={() => load(filters)} className="btn py-2 px-4 text-xs self-end justify-center" data-testid="talent-apply">Apply</button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-3" data-testid="talent-summary">
        {[
          { label: "Matched", value: items.length, sub: "current filter" },
          { label: "Institutions", value: meta?.institution_ids?.length || 0, sub: "partner pool" },
          { label: "Min readiness", value: meta?.filters?.min_readiness || filters.minReadiness, sub: "threshold" },
          { label: "Min CGPA", value: meta?.filters?.min_cgpa || filters.minCgpa, sub: "eligibility" },
        ].map((card) => (
          <div key={card.label} className="col-span-12 md:col-span-3 editorial p-6">
            <div className="font-mono text-[10px] tracking-[0.24em] text-ink-400">{card.label.toUpperCase()}</div>
            <div className="font-display text-5xl tracking-tightest mt-3 tnum">{card.value}</div>
            <div className="text-sm text-ink-500 mt-2">{card.sub}</div>
          </div>
        ))}
      </div>

      <div className="editorial">
        <div className="grid grid-cols-12 px-6 py-3 border-b border-line font-mono text-[10px] tracking-[0.24em] text-ink-400">
          <div className="col-span-3">STUDENT</div>
          <div className="col-span-2">ROLL</div>
          <div className="col-span-2">DEPT</div>
          <div className="col-span-1 text-right">CGPA</div>
          <div className="col-span-1 text-right">READY</div>
          <div className="col-span-1 text-right">ATS</div>
          <div className="col-span-2">MATCH</div>
        </div>
        {items.map((s, i) => (
          <div key={s.student_id} className="grid grid-cols-12 px-6 py-4 border-b border-line items-center text-sm hover:bg-bone-200 transition-colors" data-testid={`talent-row-${i}`}>
            <div className="col-span-3 font-medium">{s.name}</div>
            <div className="col-span-2 font-mono text-xs tnum">{s.roll_number}</div>
            <div className="col-span-2"><span className="pill bg-bone-100 text-[9px]">{s.department}</span></div>
            <div className="col-span-1 text-right font-display tnum">{s.cgpa}</div>
            <div className="col-span-1 text-right font-display text-accent tnum">{s.readiness_score}</div>
            <div className="col-span-1 text-right font-display tnum">{s.ats_score}</div>
            <div className="col-span-2 text-xs text-ink-500 truncate">{(s.match_reasons || s.skills || []).slice(0, 3).join(" / ")}</div>
          </div>
        ))}
        {items.length === 0 && <div className="px-6 py-12 text-center text-ink-400">No candidates match the current filters.</div>}
      </div>
    </div>
  );
}
