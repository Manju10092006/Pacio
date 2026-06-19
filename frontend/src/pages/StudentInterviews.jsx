import React, { useEffect, useState } from "react";
import { api } from "../lib/api";

export default function StudentInterviews() {
  const [d, setD] = useState(null);
  const [schedule, setSchedule] = useState([]);

  useEffect(() => {
    Promise.allSettled([
      api.get("/interviews/history"),
      api.get("/interviews/schedule"),
    ]).then(([histRes, schedRes]) => {
      const hist = histRes.status === "fulfilled" ? histRes.value.data : {};
      setD(hist);
      if (schedRes.status === "fulfilled") setSchedule(schedRes.value.data?.interviews || schedRes.value.data || []);
    });
  }, []);

  if (!d) return <div className="font-mono text-xs text-ink-400">LOADING INTERVIEWS...</div>;

  const myTimeline = d.student_timelines?.[0] || d.my_timeline || {};
  const reports = d.reports || d.interviews || [];
  const rubrics = d.rubric_averages || {};
  const weakAreas = d.weak_areas || myTimeline.weak_areas || [];
  const improvement = myTimeline.improvement_delta || 0;
  const latest = myTimeline.latest_score || 0;
  const first = myTimeline.first_score || 0;

  return (
    <div className="space-y-10">
      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-12 md:col-span-8 editorial p-10">
          <div className="font-mono text-[10px] tracking-[0.28em] text-ink-400">YOUR INTERVIEW INTELLIGENCE</div>
          <h1 className="font-display text-5xl md:text-6xl tracking-tightest mt-3">Interview readiness.</h1>
          <p className="font-serif text-lg text-ink-500 mt-2 max-w-xl">Track your interview performance, identify weak areas, and prepare for upcoming interviews.</p>
        </div>
        <div className="col-span-12 md:col-span-4 editorial bg-ink-900 text-bone-100 p-10">
          <div className="font-mono text-[10px] tracking-[0.28em] text-bone-100/40">LATEST SCORE</div>
          <div className="font-display text-[8vw] md:text-[6vw] tracking-tightest leading-[0.9] tnum text-accent">{latest || 0}</div>
          <div className="text-bone-100/60 text-sm">{reports.length} interview{reports.length !== 1 ? "s" : ""} recorded</div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-3">
        {[
          { label: "Total Interviews", value: reports.length, sub: "sessions completed" },
          { label: "Average Score", value: myTimeline.avg_score || Math.round(reports.reduce((a, r) => a + (r.overall_score || 0), 0) / Math.max(1, reports.length)), sub: "overall average" },
          { label: "Best Score", value: myTimeline.best_score || Math.max(0, ...reports.map(r => r.overall_score || 0)), sub: "peak performance" },
          { label: "Improvement", value: `${improvement >= 0 ? "+" : ""}${improvement}%`, sub: `from ${first} → ${latest}` },
        ].map(card => (
          <div key={card.label} className="col-span-12 md:col-span-3 editorial p-6">
            <div className="font-mono text-[10px] tracking-[0.24em] text-ink-400">{card.label.toUpperCase()}</div>
            <div className="font-display text-5xl tracking-tightest mt-3 tnum">{card.value}</div>
            <div className="text-sm text-ink-500 mt-2">{card.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-12 md:col-span-6 editorial p-8 bg-bone-50">
          <div className="font-mono text-[10px] tracking-[0.24em] text-ink-400">RUBRIC BREAKDOWN</div>
          <div className="mt-6 space-y-5">
            {["communication", "confidence", "technical", "hr"].map(rubric => {
              const val = rubrics[rubric] || myTimeline[`${rubric}_avg`] || 0;
              return (
                <div key={rubric}>
                  <div className="flex justify-between text-sm">
                    <span className="font-medium capitalize">{rubric === "hr" ? "Body Language / HR" : rubric}</span>
                    <span className="font-display text-xl tnum text-accent">{val}</span>
                  </div>
                  <div className="mt-2 h-2 bg-bone-300 relative">
                    <div className="absolute inset-y-0 left-0 bg-ink-900" style={{ width: `${val}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="col-span-12 md:col-span-6 editorial p-8">
          <div className="font-mono text-[10px] tracking-[0.24em] text-ink-400">WEAK AREAS</div>
          {weakAreas.length > 0 ? (
            <div className="mt-5 space-y-3">
              {weakAreas.map((area, i) => (
                <div key={i} className="border border-line bg-bone-50 p-4">
                  <div className="flex justify-between">
                    <div>
                      <div className="font-display text-lg capitalize">{area.rubric || area.area || area}</div>
                      <div className="text-sm text-ink-500">Gap to benchmark: {area.gap || 0} points</div>
                    </div>
                    <div className="font-display text-2xl text-accent tnum">{area.score || 0}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-5 text-sm text-ink-400">No weak areas detected — keep improving!</div>
          )}
        </div>
      </div>

      {schedule.length > 0 && (
        <div className="editorial p-8 bg-ink-900 text-bone-100">
          <div className="font-mono text-[10px] tracking-[0.24em] text-bone-100/40">UPCOMING INTERVIEWS</div>
          <div className="mt-5 divide-y divide-bone-100/10">
            {schedule.slice(0, 6).map((evt, i) => (
              <div key={evt.interview_id || i} className="grid grid-cols-12 gap-3 py-4">
                <div className="col-span-4">
                  <div className="font-display text-lg">{evt.company}</div>
                  <div className="text-sm text-bone-100/50">{evt.role || evt.type}</div>
                </div>
                <div className="col-span-3 font-mono text-sm text-bone-100/60">{evt.starts_at || evt.date}</div>
                <div className="col-span-2 font-mono text-sm text-bone-100/60">{evt.type || "Interview"}</div>
                <div className="col-span-3 text-right">
                  <span className="text-sm px-3 py-1 bg-bone-100/10 text-bone-100">{evt.status || "Scheduled"}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {reports.length > 0 && (
        <div className="editorial">
          <div className="p-6 border-b border-line">
            <div className="font-mono text-[10px] tracking-[0.24em] text-ink-400">INTERVIEW HISTORY</div>
          </div>
          <div className="grid grid-cols-12 px-6 py-3 border-b border-line font-mono text-[10px] tracking-[0.24em] text-ink-400">
            <div className="col-span-2">TYPE</div>
            <div className="col-span-2">DATE</div>
            <div className="col-span-1 text-right">CONF</div>
            <div className="col-span-1 text-right">COMM</div>
            <div className="col-span-1 text-right">TECH</div>
            <div className="col-span-1 text-right">HR</div>
            <div className="col-span-1 text-right">TOTAL</div>
            <div className="col-span-3">FEEDBACK</div>
          </div>
          {reports.map((r, i) => (
            <div key={r.report_id || i} className="grid grid-cols-12 px-6 py-3 border-b border-line items-center text-sm hover:bg-bone-200 transition-colors">
              <div className="col-span-2 font-medium">{r.type || "Mock"}</div>
              <div className="col-span-2 font-mono text-xs text-ink-500">{r.date || "—"}</div>
              <div className="col-span-1 text-right font-display tnum">{r.confidence_score || 0}</div>
              <div className="col-span-1 text-right font-display tnum">{r.communication_score || 0}</div>
              <div className="col-span-1 text-right font-display tnum">{r.technical_score || 0}</div>
              <div className="col-span-1 text-right font-display tnum">{r.hr_score || 0}</div>
              <div className="col-span-1 text-right font-display text-xl tnum text-accent">{r.overall_score || 0}</div>
              <div className="col-span-3 text-xs text-ink-500 truncate">{r.feedback || "—"}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
