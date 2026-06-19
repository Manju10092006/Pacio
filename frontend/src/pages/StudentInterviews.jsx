import React, { useEffect, useState } from "react";
import { api } from "../lib/api";
import { Badge, Progress, EmptyState } from "../components/Primitives";
import { PageTransition, CounterAnimation, DashboardReveal } from "../components/Motion";
import { DataTable } from "../components/DataTable";

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

  if (!d) return <div className="font-mono text-xs text-ink-400 p-8">LOADING INTERVIEWS...</div>;

  const myTimeline = d.student_timelines?.[0] || d.my_timeline || {};
  const reports = d.reports || d.interviews || [];
  const rubrics = d.rubric_averages || {};
  const weakAreas = d.weak_areas || myTimeline.weak_areas || [];
  const improvement = myTimeline.improvement_delta || 0;
  const latest = myTimeline.latest_score || 0;
  const first = myTimeline.first_score || 0;

  const schedColumns = [
    { key: "company", header: "Company", sortable: true, render: (company, row) => (
      <div>
        <div className="font-display font-semibold">{company}</div>
        <div className="text-[10px] text-ink/50 uppercase font-mono">{row.role || row.type}</div>
      </div>
    )},
    { key: "starts_at", header: "Scheduled At", sortable: true, render: (starts, row) => (
      <span className="font-mono text-xs">{starts || row.date}</span>
    )},
    { key: "type", header: "Type", sortable: true, render: (t) => <Badge variant="outline">{t || "Interview"}</Badge> },
    { key: "status", header: "Status", render: (st) => <Badge variant="solid">{st || "Scheduled"}</Badge> }
  ];

  const historyColumns = [
    { key: "type", header: "Type", sortable: true, render: (t) => <span className="font-medium">{t || "Mock"}</span> },
    { key: "date", header: "Date", sortable: true, render: (d) => <span className="font-mono text-xs text-ink/65">{d || "—"}</span> },
    { key: "confidence_score", header: "Confidence", sortable: true, render: (s) => <span className="font-mono tnum">{s || 0}</span> },
    { key: "communication_score", header: "Comm", sortable: true, render: (s) => <span className="font-mono tnum">{s || 0}</span> },
    { key: "technical_score", header: "Tech", sortable: true, render: (s) => <span className="font-mono tnum">{s || 0}</span> },
    { key: "hr_score", header: "HR", sortable: true, render: (s) => <span className="font-mono tnum">{s || 0}</span> },
    { key: "overall_score", header: "Overall", sortable: true, render: (s) => <span className="font-display text-lg text-accent tnum font-semibold">{s || 0}</span> },
    { key: "feedback", header: "Feedback", render: (fb) => <span className="text-xs text-ink/65 font-serif max-w-[200px] truncate block" title={fb}>{fb || "—"}</span> }
  ];

  return (
    <PageTransition className="space-y-10">
      <DashboardReveal className="grid grid-cols-12 gap-4">
        <div className="col-span-12 md:col-span-8 editorial p-10 dash-reveal">
          <div className="font-mono text-[10px] tracking-[0.28em] text-ink-400">§ YOUR INTERVIEW INTELLIGENCE</div>
          <h1 className="font-display text-5xl md:text-6xl tracking-tightest mt-3">Interview readiness.</h1>
          <p className="font-serif text-lg text-ink-500 mt-2 max-w-xl">
            Track your interview performance, identify weak areas, and prepare for upcoming interviews.
          </p>
        </div>
        <div className="col-span-12 md:col-span-4 editorial bg-ink text-bone p-10 flex flex-col justify-between dash-reveal">
          <div>
            <div className="font-mono text-[10px] tracking-[0.28em] text-bone/45">LATEST SCORE</div>
            <div className="font-display text-[8vw] md:text-[6vw] tracking-tightest leading-[0.9] tnum text-accent">
              <CounterAnimation value={latest || 0} />
            </div>
            <div className="text-bone/60 text-sm mt-1">{reports.length} interview{reports.length !== 1 ? "s" : ""} recorded</div>
          </div>
          <div className="mt-6">
            <Progress value={latest || 0} />
          </div>
        </div>
      </DashboardReveal>

      <DashboardReveal className="grid grid-cols-12 gap-4">
        {[
          { label: "Total Interviews", value: reports.length, sub: "sessions completed" },
          { label: "Average Score", value: myTimeline.avg_score || Math.round(reports.reduce((a, r) => a + (r.overall_score || 0), 0) / Math.max(1, reports.length)), sub: "overall average" },
          { label: "Best Score", value: myTimeline.best_score || Math.max(0, ...reports.map(r => r.overall_score || 0)), sub: "peak performance" },
          { label: "Improvement", value: `${improvement >= 0 ? "+" : ""}${improvement}%`, sub: `from ${first} → ${latest}` },
        ].map((card) => (
          <div key={card.label} className="col-span-12 md:col-span-3 editorial p-6 dash-reveal">
            <div className="font-mono text-[10px] tracking-[0.24em] text-ink-400">{card.label.toUpperCase()}</div>
            <div className="font-display text-5xl tracking-tightest mt-4 tnum">{card.value}</div>
            <div className="text-sm text-ink-500 mt-2 font-serif">{card.sub}</div>
          </div>
        ))}
      </DashboardReveal>

      <DashboardReveal className="grid grid-cols-12 gap-4">
        <div className="col-span-12 md:col-span-6 editorial p-8 bg-bone-100/40 dash-reveal">
          <div className="font-mono text-[10px] tracking-[0.24em] text-ink-400">RUBRIC BREAKDOWN</div>
          <div className="mt-6 space-y-4">
            {["communication", "confidence", "technical", "hr"].map((rubric) => {
              const val = rubrics[rubric] || myTimeline[`${rubric}_avg`] || 0;
              return (
                <div key={rubric}>
                  <div className="flex justify-between text-sm items-center">
                    <span className="font-medium capitalize">{rubric === "hr" ? "Body Language / HR" : rubric}</span>
                    <span className="font-display text-xl tnum text-accent">{val}</span>
                  </div>
                  <div className="mt-1.5">
                    <Progress value={val} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="col-span-12 md:col-span-6 editorial p-8 bg-paper dash-reveal">
          <div className="font-mono text-[10px] tracking-[0.24em] text-ink-400">WEAK AREAS</div>
          {weakAreas.length > 0 ? (
            <div className="mt-5 space-y-3">
              {weakAreas.map((area, i) => (
                <div key={i} className="border border-line bg-bone-50 p-4 flex items-center justify-between">
                  <div>
                    <div className="font-display text-lg tracking-tight uppercase">{area.rubric || area.area || area}</div>
                    <div className="text-xs text-ink-500 font-serif mt-1">Gap to benchmark: {area.gap || 0} points</div>
                  </div>
                  <div className="font-display text-3xl text-accent tnum">{area.score || 0}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-5">
              <EmptyState title="No weak areas identified" description="Congratulations! Your performance scores are in sync with current hiring standards." />
            </div>
          )}
        </div>
      </DashboardReveal>

      {schedule.length > 0 && (
        <div className="editorial p-8 bg-ink text-bone">
          <div className="font-mono text-[10px] tracking-[0.24em] text-bone/45 mb-6">UPCOMING INTERVIEWS</div>
          <div className="bg-paper text-ink p-4 border border-line-strong">
            <DataTable data={schedule} columns={schedColumns} initialPageSize={3} />
          </div>
        </div>
      )}

      {reports.length > 0 && (
        <div className="editorial p-8 bg-paper">
          <div className="border-b border-line pb-4 mb-6">
            <div className="font-mono text-[10px] tracking-[0.24em] text-ink-400">INTERVIEW HISTORY</div>
          </div>
          <DataTable data={reports} columns={historyColumns} initialPageSize={5} />
        </div>
      )}
    </PageTransition>
  );
}
