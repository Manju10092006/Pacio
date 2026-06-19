import React, { useEffect, useState } from "react";
import { api } from "../lib/api";
import { toast } from "sonner";

export default function TalentPool() {
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [shortlists, setShortlists] = useState([]);
  const [savedFilters, setSavedFilters] = useState([]);
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
  const loadRecruiterIntel = () => {
    Promise.all([
      api.get("/recruiters/me/recommendations"),
      api.get("/recruiters/me/shortlists"),
      api.get("/recruiters/me/saved-filters"),
    ]).then(([recs, list, saved]) => {
      setRecommendations(recs.data.items || []);
      setShortlists(list.data.items || []);
      setSavedFilters(saved.data.items || []);
    });
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); loadRecruiterIntel(); }, []);

  const setFilter = (key, value) => setFilters((current) => ({ ...current, [key]: value }));
  const shortlistedIds = new Set(shortlists.map((row) => `${row.student_id}:${row.job_id || ""}`));
  const shortlistCandidate = async (candidate) => {
    const payload = {
      student_id: candidate.student_id,
      job_id: candidate.job_id,
      readiness_score: candidate.readiness_score,
      match_score: candidate.interview_next_score || candidate.skill_match_score,
      notes: candidate.answer || "Recruiter shortlist",
    };
    await api.post("/recruiters/me/shortlists", payload);
    toast.success("Candidate shortlisted");
    loadRecruiterIntel();
  };
  const saveCurrentFilter = async () => {
    await api.post("/recruiters/me/saved-filters", {
      name: `${filters.department || "All"} ${filters.skill || "talent"} view`,
      min_cgpa: Number(filters.minCgpa),
      min_readiness: Number(filters.minReadiness),
      department: filters.department || null,
      skill: filters.skill || null,
    });
    toast.success("Talent filter saved");
    loadRecruiterIntel();
  };

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
        <div className="editorial p-4 grid grid-cols-2 md:grid-cols-6 gap-3">
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
          <button onClick={saveCurrentFilter} className="btn py-2 px-4 text-xs self-end justify-center" data-testid="talent-save-filter">Save</button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-3" data-testid="talent-summary">
        {[
          { label: "Matched", value: items.length, sub: "current filter" },
          { label: "Interview next", value: recommendations.filter((row) => row.answer === "Interview next").length, sub: "recommended now" },
          { label: "Institutions", value: meta?.institution_ids?.length || 0, sub: "partner pool" },
          { label: "Shortlisted", value: shortlists.length, sub: "active list" },
        ].map((card) => (
          <div key={card.label} className="col-span-12 md:col-span-3 editorial p-6">
            <div className="font-mono text-[10px] tracking-[0.24em] text-ink-400">{card.label.toUpperCase()}</div>
            <div className="font-display text-5xl tracking-tightest mt-3 tnum">{card.value}</div>
            <div className="text-sm text-ink-500 mt-2">{card.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-3" data-testid="recruiter-intelligence-platform">
        <div className="col-span-12 lg:col-span-8 editorial p-8">
          <div className="font-mono text-[10px] tracking-[0.24em] text-ink-400">WHICH STUDENTS SHOULD I INTERVIEW NEXT?</div>
          <div className="mt-5 divide-y divide-line">
            {recommendations.slice(0, 8).map((candidate) => {
              const key = `${candidate.student_id}:${candidate.job_id || ""}`;
              const alreadyShortlisted = shortlistedIds.has(key);
              return (
                <div key={key} className="grid grid-cols-12 gap-4 py-4 items-center">
                  <div className="col-span-12 md:col-span-4">
                    <div className="font-display text-xl">{candidate.student_name}</div>
                    <div className="font-mono text-[10px] text-ink-400">{candidate.roll_number} / {candidate.department}</div>
                  </div>
                  <div className="col-span-6 md:col-span-3 text-xs text-ink-500">
                    <div className="font-medium text-ink-900">{candidate.job_title}</div>
                    {(candidate.matched_skills || []).slice(0, 3).join(" / ") || "Readiness-led match"}
                  </div>
                  <div className="col-span-3 md:col-span-2 text-right">
                    <div className="font-display text-3xl tnum text-accent">{candidate.interview_next_score}</div>
                    <div className="font-mono text-[10px] text-ink-400">{candidate.answer}</div>
                  </div>
                  <div className="col-span-3 md:col-span-3 flex justify-end">
                    <button
                      className="btn px-4 py-2 text-[10px]"
                      disabled={alreadyShortlisted}
                      onClick={() => shortlistCandidate(candidate)}
                    >
                      {alreadyShortlisted ? "Shortlisted" : "Shortlist"}
                    </button>
                  </div>
                </div>
              );
            })}
            {recommendations.length === 0 && <div className="py-8 text-sm text-ink-400">No recommendation set is available for open roles.</div>}
          </div>
        </div>
        <div className="col-span-12 lg:col-span-4 grid gap-3">
          <div className="editorial p-6 bg-bone-50">
            <div className="font-mono text-[10px] tracking-[0.24em] text-ink-400">SAVED FILTERS</div>
            <div className="mt-4 space-y-3">
              {savedFilters.slice(0, 4).map((view) => (
                <button
                  key={view.filter_id}
                  onClick={() => {
                    const next = {
                      minCgpa: view.filters?.min_cgpa || 7,
                      minReadiness: view.filters?.min_readiness || 70,
                      department: view.filters?.department || "",
                      skill: view.filters?.skill || "",
                    };
                    setFilters(next);
                    load(next);
                  }}
                  className="w-full border border-line bg-bone-100 px-4 py-3 text-left hover:bg-bone-200 transition-colors"
                >
                  <div className="font-medium">{view.name}</div>
                  <div className="font-mono text-[10px] text-ink-400">
                    CGPA {view.filters?.min_cgpa} / Ready {view.filters?.min_readiness}
                  </div>
                </button>
              ))}
              {savedFilters.length === 0 && <div className="text-sm text-ink-400">No saved filters yet.</div>}
            </div>
          </div>
          <div className="editorial p-6">
            <div className="font-mono text-[10px] tracking-[0.24em] text-ink-400">SHORTLISTS</div>
            <div className="mt-4 space-y-2">
              {shortlists.slice(0, 5).map((row) => (
                <div key={row.shortlist_id} className="flex justify-between gap-3 border border-line bg-bone-50 px-4 py-3 text-sm">
                  <div>
                    <div className="font-medium">{row.student_name}</div>
                    <div className="font-mono text-[10px] text-ink-400">{row.department}</div>
                  </div>
                  <div className="font-display text-xl tnum text-accent">{row.match_score || row.readiness_score}</div>
                </div>
              ))}
              {shortlists.length === 0 && <div className="text-sm text-ink-400">No students shortlisted yet.</div>}
            </div>
          </div>
        </div>
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
