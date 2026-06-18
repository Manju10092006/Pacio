import React, { useEffect, useState } from "react";
import { api } from "../lib/api";

export default function AptitudeIntelligence() {
  const [d, setD] = useState(null);
  useEffect(() => {
    api.get("/aptitude/intelligence", { timeout: 8000 })
      .then(({ data }) => setD(data))
      .catch(() => setD({ summary: {}, by_section: [], weak_sections: [], priority_students: [] }));
  }, []);
  if (!d) return <div className="font-mono text-xs text-ink-400">LOADING APTITUDE...</div>;

  const summary = d.summary || {};

  return (
    <div className="space-y-10">
      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-12 md:col-span-8 editorial p-10">
          <div className="font-mono text-[10px] tracking-[0.28em] text-ink-400">APTITUDE INTELLIGENCE</div>
          <h1 className="font-display text-5xl md:text-6xl tracking-tightest mt-3" data-testid="apt-heading">
            Speed, accuracy, weakness.
          </h1>
          <p className="font-serif text-lg text-ink-500 mt-2 max-w-xl">
            Section-level performance with weak-area discovery and student intervention queues.
          </p>
        </div>
        <div className="col-span-12 md:col-span-4 editorial bg-ink-900 text-bone-100 p-10">
          <div className="font-mono text-[10px] tracking-[0.28em] text-bone-100/40">OVERALL SCORE</div>
          <div className="font-display text-[8vw] md:text-[6vw] tracking-tightest leading-[0.9] tnum text-accent">{summary.overall_score || 0}%</div>
          <div className="text-bone-100/60 text-sm">{summary.tests || 0} test attempts / {summary.health || "watch"}</div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-3" data-testid="apt-summary">
        {[
          { label: "Accuracy", value: `${summary.overall_accuracy || 0}%`, sub: "average correct rate" },
          { label: "Avg speed", value: `${summary.avg_time_sec || 0}s`, sub: "per question" },
          { label: "Students", value: summary.students || 0, sub: "inside scope" },
          { label: "Weak rows", value: d.priority_students?.length || 0, sub: "needs faculty action" },
        ].map((card) => (
          <div key={card.label} className="col-span-12 md:col-span-3 editorial p-6">
            <div className="font-mono text-[10px] tracking-[0.24em] text-ink-400">{card.label.toUpperCase()}</div>
            <div className="font-display text-5xl tracking-tightest mt-3 tnum">{card.value}</div>
            <div className="text-sm text-ink-500 mt-2">{card.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-3" data-testid="apt-sections">
        {d.by_section.map((s) => (
          <div key={s._id} className="col-span-12 md:col-span-6 editorial p-8 bg-bone-50" data-testid={`apt-${s._id}`}>
            <div className="font-mono text-[10px] tracking-[0.2em] text-ink-400">SECTION / {s._id} / {s.health}</div>
            <h3 className="font-display text-2xl tracking-tight mt-1">{s.section_name}</h3>
            <div className="grid grid-cols-4 gap-4 mt-6">
              <div><div className="font-mono text-[10px] tracking-[0.2em] text-ink-400">SCORE</div><div className="font-display text-4xl mt-1 tnum">{s.avg_score}%</div></div>
              <div><div className="font-mono text-[10px] tracking-[0.2em] text-ink-400">ACC</div><div className="font-display text-4xl mt-1 tnum text-accent">{s.avg_accuracy}%</div></div>
              <div><div className="font-mono text-[10px] tracking-[0.2em] text-ink-400">TIME</div><div className="font-display text-4xl mt-1 tnum">{s.avg_time_sec}s</div></div>
              <div><div className="font-mono text-[10px] tracking-[0.2em] text-ink-400">GAP</div><div className="font-display text-4xl mt-1 tnum">{s.weakness_index}</div></div>
            </div>
            <div className="mt-5 h-2 bg-bone-300 relative">
              <div className="absolute inset-y-0 left-0 bg-ink-900" style={{ width: `${s.avg_score}%` }} />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-12 md:col-span-5 editorial p-8">
          <div className="font-mono text-[10px] tracking-[0.24em] text-ink-400">WEAKEST SECTIONS</div>
          <div className="mt-5 space-y-3">
            {(d.weak_sections || []).map((s) => (
              <div key={s._id} className="border border-line bg-bone-50 p-4">
                <div className="font-display text-lg">{s.section_name}</div>
                <div className="text-sm text-ink-500">Weakness index {s.weakness_index} / avg score {s.avg_score}%</div>
              </div>
            ))}
          </div>
        </div>
        <div className="col-span-12 md:col-span-7 editorial p-8 bg-bone-50">
          <div className="font-mono text-[10px] tracking-[0.24em] text-ink-400">PRIORITY STUDENTS</div>
          <div className="mt-5 divide-y divide-line">
            {(d.priority_students || []).slice(0, 8).map((row) => (
              <div key={row.score_id} className="grid grid-cols-12 py-3 text-sm">
                <div className="col-span-4 font-medium">{row.student_name}</div>
                <div className="col-span-2 font-mono text-xs">{row.department}</div>
                <div className="col-span-2 font-mono text-xs">{row.section_code}</div>
                <div className="col-span-2 text-right font-display text-accent">{row.score_pct}%</div>
                <div className="col-span-2 text-right text-xs text-ink-500">{row.reason}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
