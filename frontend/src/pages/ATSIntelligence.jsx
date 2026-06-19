import React, { useEffect, useState } from "react";
import { api } from "../lib/api";

export default function ATSIntelligence() {
  const [d, setD] = useState(null);
  useEffect(() => { api.get("/ats/intelligence").then(({ data }) => setD(data)); }, []);
  if (!d) return <div className="font-mono text-xs text-ink-400">LOADING ATS...</div>;

  const summary = d.summary || {};

  return (
    <div className="space-y-10">
      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-12 md:col-span-8 editorial p-10">
          <div className="font-mono text-[10px] tracking-[0.28em] text-ink-400">RESUME ATS / INTELLIGENCE</div>
          <h1 className="font-display text-5xl md:text-6xl tracking-tightest mt-3" data-testid="ats-heading">
            Resume risk, ranked.
          </h1>
          <p className="font-serif text-lg text-ink-500 mt-2 max-w-xl">
            ATS score, keyword gaps, format risk, and role-readiness queues for resume intervention.
          </p>
        </div>
        <div className="col-span-12 md:col-span-4 editorial bg-ink-900 text-bone-100 p-10">
          <div className="font-mono text-[10px] tracking-[0.28em] text-bone-100/40">INSTITUTIONAL AVG</div>
          <div className="font-display text-[8vw] md:text-[6vw] tracking-tightest leading-[0.9] tnum text-accent">{summary.avg_score || d.avg_score}<span className="text-bone-100">%</span></div>
          <div className="text-bone-100/60 text-sm">{d.count} resumes / {summary.health || "watch"}</div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-3" data-testid="ats-summary">
        {[
          { label: "Keyword match", value: `${summary.avg_keyword_match || 0}%`, sub: "average role match" },
          { label: "Format score", value: `${summary.avg_format_score || 0}%`, sub: "parser quality" },
          { label: "Low ATS", value: summary.low_score_count || 0, sub: "below comfort band" },
          { label: "Format risk", value: summary.format_risk_count || 0, sub: "needs cleanup" },
        ].map((card) => (
          <div key={card.label} className="col-span-12 md:col-span-3 editorial p-6">
            <div className="font-mono text-[10px] tracking-[0.24em] text-ink-400">{card.label.toUpperCase()}</div>
            <div className="font-display text-5xl tracking-tightest mt-3 tnum">{card.value}</div>
            <div className="text-sm text-ink-500 mt-2">{card.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-12 md:col-span-5 editorial p-8">
          <div className="font-mono text-[10px] tracking-[0.24em] text-ink-400">KEYWORD HEATMAP</div>
          <div className="mt-5 space-y-3">
            {(d.keyword_heatmap || []).slice(0, 8).map((k) => (
              <div key={k.keyword}>
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{k.keyword}</span>
                  <span className="font-mono text-ink-400">{k.coverage_gap_pct}% gap</span>
                </div>
                <div className="mt-2 h-1.5 bg-bone-300 relative">
                  <div className="absolute inset-y-0 left-0 bg-accent" style={{ width: `${Math.min(100, k.coverage_gap_pct)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="col-span-12 md:col-span-7 editorial p-8 bg-bone-50">
          <div className="font-mono text-[10px] tracking-[0.24em] text-ink-400">RESUME REWRITE QUEUE</div>
          <div className="mt-5 divide-y divide-line">
            {(d.priority_students || []).slice(0, 8).map((r) => (
              <div key={r.ats_id} className="grid grid-cols-12 py-3 text-sm">
                <div className="col-span-4 font-medium">{r.student_name}</div>
                <div className="col-span-2 font-mono text-xs">{r.department}</div>
                <div className="col-span-2 text-right font-display text-accent">{r.score}</div>
                <div className="col-span-2 text-right font-mono text-xs">{r.keyword_match_pct}% KW</div>
                <div className="col-span-2 text-right text-xs text-ink-500">{r.risk_level}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-3" data-testid="ats-versioning">
        <div className="col-span-12 lg:col-span-5 editorial p-8 bg-ink-900 text-bone-100">
          <div className="font-mono text-[10px] tracking-[0.24em] text-bone-100/40">RESUME VERSIONING</div>
          <div className="font-display text-6xl tracking-tightest mt-3 text-accent">{d.resume_versions?.length || 0}</div>
          <div className="text-sm text-bone-100/60 mt-2">versioned resume signals connected to readiness and recruiter compatibility.</div>
          <div className="mt-6 space-y-3">
            {(d.skill_gaps || []).slice(0, 4).map((gap) => (
              <div key={gap.keyword} className="border-t border-bone-100/10 pt-3">
                <div className="font-display text-lg">{gap.keyword}</div>
                <div className="text-xs text-bone-100/50">{gap.suggestion}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="col-span-12 lg:col-span-7 editorial p-8">
          <div className="font-mono text-[10px] tracking-[0.24em] text-ink-400">RECRUITER COMPATIBILITY</div>
          <div className="mt-5 divide-y divide-line">
            {(d.recruiter_compatibility || []).slice(0, 8).map((row) => (
              <div key={`${row.student_id}-${row.latest_resume_id}`} className="grid grid-cols-12 gap-3 py-3 text-sm">
                <div className="col-span-4">
                  <div className="font-medium">{row.student_name}</div>
                  <div className="font-mono text-[10px] text-ink-400">{row.roll_number} / v{row.latest_version}</div>
                </div>
                <div className="col-span-2 text-right font-display text-accent">{row.recruiter_match_score}</div>
                <div className="col-span-2 text-right font-mono">{row.ats_score} ATS</div>
                <div className="col-span-2 text-right font-mono">{row.keyword_score}% KW</div>
                <div className="col-span-2 text-right text-xs text-ink-500">{row.score_delta >= 0 ? "+" : ""}{row.score_delta} delta</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="editorial" data-testid="ats-rows">
        <div className="p-6 border-b border-line">
          <div className="font-mono text-[10px] tracking-[0.24em] text-ink-400">LATEST UPLOADS / TOP 40</div>
        </div>
        <div className="grid grid-cols-12 px-6 py-3 border-b border-line font-mono text-[10px] tracking-[0.24em] text-ink-400">
          <div className="col-span-3">STUDENT</div>
          <div className="col-span-2">ROLL</div>
          <div className="col-span-1">DEPT</div>
          <div className="col-span-2">FILE</div>
          <div className="col-span-1 text-right">SCORE</div>
          <div className="col-span-1 text-right">KW</div>
          <div className="col-span-2">MISSING</div>
        </div>
        {d.rows.map((r, i) => (
          <div key={r.ats_id} className="grid grid-cols-12 px-6 py-3 border-b border-line items-center text-sm hover:bg-bone-200 transition-colors" data-testid={`ats-${i}`}>
            <div className="col-span-3 font-medium">{r.student_name}</div>
            <div className="col-span-2 font-mono text-xs tnum">{r.roll_number}</div>
            <div className="col-span-1"><span className="pill bg-bone-100 text-[9px]">{r.department}</span></div>
            <div className="col-span-2 font-mono text-xs text-ink-500 truncate">{r.uploaded_filename}</div>
            <div className="col-span-1 text-right font-display text-xl tnum" style={{ color: r.score >= 80 ? "#0a0a0a" : r.score >= 60 ? "#d4a017" : "#ff3b00" }}>{r.score}</div>
            <div className="col-span-1 text-right font-mono tnum">{r.keyword_match_pct}%</div>
            <div className="col-span-2 text-xs text-ink-500 truncate">{(r.missing_keywords || []).join(", ")}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
