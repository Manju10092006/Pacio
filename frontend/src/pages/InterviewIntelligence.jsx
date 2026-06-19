import React, { useEffect, useState } from "react";
import { api } from "../lib/api";

export default function InterviewIntelligence() {
  const [d, setD] = useState(null);
  const [history, setHistory] = useState(null);
  useEffect(() => {
    Promise.all([
      api.get("/interviews/intelligence"),
      api.get("/interviews/history"),
    ]).then(([intelligence, timelines]) => {
      setD(intelligence.data);
      setHistory(timelines.data);
    });
  }, []);
  if (!d) return <div className="font-mono text-xs text-ink-400">LOADING...</div>;

  const rubric = d.rubric_avgs || {};
  const summary = d.summary || {};
  const timelines = history?.items || [];
  const weakest = history?.weak_area_detection || [];
  const improving = history?.improvement_tracking || [];

  return (
    <div className="space-y-10">
      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-12 md:col-span-8 editorial p-10">
          <div className="font-mono text-[10px] tracking-[0.28em] text-ink-400">INTERVIEW AI</div>
          <h1 className="font-display text-5xl md:text-6xl tracking-tightest mt-3" data-testid="int-heading">
            Interviews, diagnosed.
          </h1>
          <p className="font-serif text-lg text-ink-500 mt-2 max-w-xl">
            Confidence, communication, technical depth, and body language translated into remediation queues.
          </p>
        </div>
        <div className="col-span-12 md:col-span-4 grid grid-rows-2 gap-3">
          <div className="editorial bg-ink-900 text-bone-100 p-8">
            <div className="font-mono text-[10px] tracking-[0.24em] text-bone-100/40">AVG OVERALL</div>
            <div className="font-display text-6xl tnum mt-2">{summary.avg_overall || 0}%</div>
          </div>
          <div className="editorial p-8">
            <div className="font-mono text-[10px] tracking-[0.24em] text-ink-400">WEAK QUEUE</div>
            <div className="font-display text-6xl tnum mt-2 text-accent">{summary.weak_student_count || 0}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-3" data-testid="int-rubrics">
        {[
          ["Confidence", rubric.confidence],
          ["Communication", rubric.communication],
          ["Technical", rubric.technical],
          ["Body language", rubric.body_language],
        ].map(([label, value]) => (
          <div key={label} className="col-span-12 md:col-span-3 editorial p-6">
            <div className="font-mono text-[10px] tracking-[0.24em] text-ink-400">{label.toUpperCase()}</div>
            <div className="font-display text-5xl tracking-tightest mt-3 tnum">{value || 0}%</div>
            <div className="mt-3 h-1.5 bg-bone-300 relative">
              <div className="absolute inset-y-0 left-0 bg-accent" style={{ width: `${value || 0}%` }} />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-12 md:col-span-5 editorial p-8">
          <div className="font-mono text-[10px] tracking-[0.24em] text-ink-400">WEAK RUBRICS</div>
          <div className="mt-5 space-y-3">
            {(d.weak_rubrics || []).map((r) => (
              <div key={r.rubric} className="border border-line bg-bone-50 p-4">
                <div className="font-display text-lg capitalize">{r.rubric.replace("_", " ")}</div>
                <div className="text-sm text-ink-500">Score {r.score}% / benchmark gap {r.gap_to_benchmark}</div>
              </div>
            ))}
            {(d.weak_rubrics || []).length === 0 && <div className="text-sm text-ink-400">Rubric health is above intervention benchmark.</div>}
          </div>
        </div>
        <div className="col-span-12 md:col-span-7 editorial p-8 bg-bone-50">
          <div className="font-mono text-[10px] tracking-[0.24em] text-ink-400">INTERVIEW TYPE PERFORMANCE</div>
          <div className="mt-5 divide-y divide-line">
            {(d.by_type || []).map((row) => (
              <div key={row.type} className="grid grid-cols-12 py-3 text-sm">
                <div className="col-span-4 font-display text-lg">{row.type}</div>
                <div className="col-span-2 font-mono text-xs">{row.count} reports</div>
                <div className="col-span-2 text-right">Overall {row.avg_overall}%</div>
                <div className="col-span-2 text-right">Tech {row.avg_technical}%</div>
                <div className="col-span-2 text-right">Comm {row.avg_communication}%</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-3" data-testid="interview-history">
        <div className="col-span-12 md:col-span-4 editorial p-8">
          <div className="font-mono text-[10px] tracking-[0.24em] text-ink-400">INTERVIEW READINESS</div>
          <div className="mt-5 space-y-3">
            {timelines.slice(0, 5).map((row) => (
              <div key={row.student_id} className="border border-line bg-bone-50 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="font-display text-lg">{row.student_name}</div>
                    <div className="font-mono text-[10px] text-ink-400">{row.roll_number} / {row.department}</div>
                  </div>
                  <div className="font-display text-2xl tnum text-accent">{row.latest_score}</div>
                </div>
                <div className="mt-3 flex justify-between text-xs text-ink-500">
                  <span>{row.interviews} interviews</span>
                  <span className="font-mono tnum">delta {row.improvement >= 0 ? "+" : ""}{row.improvement}</span>
                </div>
              </div>
            ))}
            {timelines.length === 0 && <div className="text-sm text-ink-400">No interview history is available for this scope.</div>}
          </div>
        </div>
        <div className="col-span-12 md:col-span-4 editorial p-8 bg-bone-50">
          <div className="font-mono text-[10px] tracking-[0.24em] text-ink-400">WEAK AREA DETECTION</div>
          <div className="mt-5 divide-y divide-line">
            {weakest.slice(0, 6).map((row) => (
              <div key={row.student_id} className="py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-medium">{row.student_name}</div>
                  <div className="font-mono text-xs tnum">{row.interview_readiness}</div>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(row.weak_areas || []).map((area) => (
                    <span key={`${row.student_id}-${area.area}`} className="pill bg-bone-100 text-[9px]">
                      {area.area}: gap {area.gap}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="col-span-12 md:col-span-4 editorial p-8">
          <div className="font-mono text-[10px] tracking-[0.24em] text-ink-400">IMPROVEMENT TRACKING</div>
          <div className="mt-5 space-y-3">
            {improving.slice(0, 5).map((row) => (
              <div key={row.student_id} className="grid grid-cols-12 items-center gap-3 border border-line bg-bone-50 p-4">
                <div className="col-span-8">
                  <div className="font-medium">{row.student_name}</div>
                  <div className="text-xs text-ink-500">{row.latest_feedback || "Faculty review pending"}</div>
                </div>
                <div className="col-span-4 text-right">
                  <div className="font-display text-2xl tnum">{row.first_score} -> {row.latest_score}</div>
                  <div className="font-mono text-[10px] text-ink-400">delta {row.improvement >= 0 ? "+" : ""}{row.improvement}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="editorial" data-testid="int-rows">
        <div className="grid grid-cols-12 px-6 py-3 border-b border-line font-mono text-[10px] tracking-[0.24em] text-ink-400">
          <div className="col-span-3">STUDENT</div>
          <div className="col-span-1">TYPE</div>
          <div className="col-span-1 text-right">CONF</div>
          <div className="col-span-1 text-right">COMM</div>
          <div className="col-span-1 text-right">TECH</div>
          <div className="col-span-1 text-right">BODY</div>
          <div className="col-span-1 text-right">SCORE</div>
          <div className="col-span-3">FEEDBACK</div>
        </div>
        {(d.rows || []).map((r) => (
          <div key={r.interview_id} className="grid grid-cols-12 px-6 py-4 border-b border-line items-center text-sm" data-testid="int-row">
            <div className="col-span-3">
              <div className="font-medium">{r.student_name}</div>
              <div className="font-mono text-[10px] text-ink-400">{r.roll_number} / {r.department}</div>
            </div>
            <div className="col-span-1"><span className="pill bg-bone-100 text-[9px]">{r.type}</span></div>
            <div className="col-span-1 text-right font-mono tnum">{r.confidence_score}</div>
            <div className="col-span-1 text-right font-mono tnum">{r.communication_score}</div>
            <div className="col-span-1 text-right font-mono tnum">{r.technical_score}</div>
            <div className="col-span-1 text-right font-mono tnum">{r.body_language_score}</div>
            <div className="col-span-1 text-right font-display text-xl tnum text-accent">{r.overall_score}</div>
            <div className="col-span-3 text-xs text-ink-500 italic">{r.feedback}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
