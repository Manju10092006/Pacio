import React, { useEffect, useState } from "react";
import { api } from "../lib/api";
import { ResponsiveContainer, LineChart, Line, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";

export default function Outcomes() {
  const [data, setData] = useState(null);
  const [intelligence, setIntelligence] = useState(null);
  useEffect(() => {
    Promise.all([
      api.get("/placements/overview"),
      api.get("/placements/intelligence"),
    ]).then(([overview, engine]) => {
      setData(overview.data);
      setIntelligence(engine.data);
    });
  }, []);

  const ctcTrend = [...(data?.year_summaries || [])].reverse().map((y) => ({
    year: y.academic_year,
    avg: y.avg_lpa,
    top: y.top_offer_lpa,
  }));
  const forecast = intelligence?.forecast || data?.forecast || {};
  const funnel = intelligence?.placement_funnel || [];
  const riskStudents = intelligence?.risk_students || [];
  const recruiterConversions = intelligence?.recruiter_conversions || [];
  const readinessTrends = intelligence?.readiness_trends || [];

  return (
    <div className="space-y-10">
      <div>
        <div className="num-mono text-[11px] tracking-[0.28em] text-ink-400">FEATURE · 05</div>
        <h1 className="font-display text-5xl md:text-6xl tracking-tightest mt-3">Placement outcomes</h1>
        <p className="font-serif text-lg text-ink-500 mt-2">Year-over-year intelligence across recruiters, departments and CTC bands.</p>
      </div>

      <div className="grid grid-cols-12 gap-3" data-testid="placement-forecast">
        {[
          { label: "Forecasted offers", value: forecast.forecasted_offers || 0, sub: `${forecast.confidence || "low"} confidence` },
          { label: "Current offers", value: forecast.current_offers || 0, sub: forecast.latest_year || "current year" },
          { label: "Open capacity", value: forecast.open_drive_capacity || 0, sub: "open role seats" },
          { label: "Interview stage", value: forecast.interview_stage_count || 0, sub: "near conversion" },
        ].map((card) => (
          <div key={card.label} className="col-span-12 md:col-span-3 editorial p-6">
            <div className="num-mono text-[10px] tracking-[0.24em] text-ink-400">{card.label.toUpperCase()}</div>
            <div className="font-display text-5xl tracking-tightest mt-3 tnum">{card.value}</div>
            <div className="text-sm text-ink-500 mt-2">{card.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 border border-line bg-bone-50 p-8" data-testid="placement-intelligence-engine">
          <div className="num-mono text-[10px] tracking-[0.24em] text-ink-400">PLACEMENT INTELLIGENCE ENGINE</div>
          <h3 className="font-display text-2xl tracking-tight mt-1">Forecast, funnel, and risk drill-down</h3>
          <div className="grid grid-cols-12 gap-3 mt-6">
            <div className="col-span-12 md:col-span-4">
              <div className="text-sm font-medium mb-3">Placement funnel</div>
              <div className="space-y-2">
                {funnel.map((stage) => (
                  <div key={stage.stage} className="grid grid-cols-12 items-center gap-3">
                    <div className="col-span-4 text-xs text-ink-500">{stage.stage}</div>
                    <div className="col-span-6 h-2 bg-bone-300">
                      <div className="h-full bg-ink-900" style={{ width: `${Math.min(100, stage.share || stage.percent || 0)}%` }} />
                    </div>
                    <div className="col-span-2 text-right font-mono text-xs tnum">{stage.count}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="col-span-12 md:col-span-4">
              <div className="text-sm font-medium mb-3">Risk students</div>
              <div className="divide-y divide-line">
                {riskStudents.slice(0, 5).map((student) => (
                  <div key={student.student_id} className="py-2 grid grid-cols-12 gap-2 text-sm">
                    <div className="col-span-7">
                      <div className="font-medium">{student.name}</div>
                      <div className="font-mono text-[10px] text-ink-400">{student.roll_number} / {student.department}</div>
                    </div>
                    <div className="col-span-3 text-right font-display tnum text-accent">{student.readiness_score}</div>
                    <div className="col-span-2 text-right text-xs text-ink-500">{student.readiness_label || student.readiness_band}</div>
                  </div>
                ))}
                {riskStudents.length === 0 && <div className="text-sm text-ink-400">No active placement risk in this scope.</div>}
              </div>
            </div>
            <div className="col-span-12 md:col-span-4">
              <div className="text-sm font-medium mb-3">Readiness trend</div>
              <div className="space-y-2">
                {readinessTrends.map((band) => (
                  <div key={band.band}>
                    <div className="flex justify-between text-xs text-ink-500">
                      <span>{band.band}</span>
                      <span className="font-mono tnum">{band.students} / {band.share}%</span>
                    </div>
                    <div className="mt-1 h-1.5 bg-bone-300">
                      <div className="h-full bg-accent" style={{ width: `${band.share || 0}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="col-span-12 md:col-span-8 border border-line bg-bone-50 p-8" data-testid="ctc-trend-card">
          <div className="num-mono text-[10px] tracking-[0.24em] text-ink-400">CTC TREND · AVG vs TOP OFFER</div>
          <h3 className="font-display text-2xl tracking-tight mt-1">Decade of compensation</h3>
          <div className="h-72 mt-6">
            <ResponsiveContainer>
              <LineChart data={ctcTrend}>
                <CartesianGrid stroke="rgba(17,17,17,0.06)" vertical={false} />
                <XAxis dataKey="year" tick={{ fill: "#888", fontSize: 11, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#888", fontSize: 11, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ border: "1px solid rgba(17,17,17,0.2)", borderRadius: 0, background: "#FFF" }} />
                <Line type="monotone" dataKey="avg" stroke="#0E0E10" strokeWidth={2} dot={{ r: 3, fill: "#0E0E10" }} name="Avg LPA" />
                <Line type="monotone" dataKey="top" stroke="#D97706" strokeWidth={2.5} dot={{ r: 4, fill: "#D97706" }} name="Top LPA" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="col-span-12 md:col-span-4 border border-bone-100/12 bg-ink-900 text-bone-100 p-8" data-testid="dept-mix-card">
          <div className="num-mono text-[10px] tracking-[0.24em] text-bone-100/40">DEPARTMENT MIX</div>
          <div className="space-y-4 mt-6">
            {(data?.department_breakdown || []).map((d) => {
              const pct = d.total ? Math.round((d.placed / d.total) * 100) : 0;
              return (
                <div key={d.department}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{d.department}</span>
                    <span className="num-mono text-bone-100/60">{d.placed}/{d.total} · {pct}%</span>
                  </div>
                  <div className="h-1.5 bg-bone-100/10">
                    <div className="h-full bg-accent" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recruiter ledger */}
        <div className="col-span-12 border border-bone-100/12 bg-bone-50" data-testid="recruiter-ledger">
          <div className="p-8 border-b border-line">
            <div className="num-mono text-[10px] tracking-[0.24em] text-bone-100/45">RECRUITER LEDGER · ALL YEARS</div>
            <h3 className="font-display text-2xl tracking-tight mt-1">Every selection on record</h3>
          </div>
          <div className="grid grid-cols-12 px-8 py-3 border-b border-bone-100/12 num-mono text-[10px] tracking-[0.24em] text-bone-100/45">
            <div className="col-span-2">YEAR</div>
            <div className="col-span-5">COMPANY</div>
            <div className="col-span-3 text-right">SELECTS</div>
            <div className="col-span-2 text-right">CTC</div>
          </div>
          <div className="max-h-[440px] overflow-y-auto">
            {(data?.records || []).map((r, i) => (
              <div key={r.record_id} className="grid grid-cols-12 px-8 py-3 border-b border-bone-100/12 items-center hover:bg-bone-100 transition-colors text-sm" data-testid={`ledger-row-${i}`}>
                <div className="col-span-2 num-mono text-ink-400">{r.academic_year}</div>
                <div className="col-span-5 font-medium">{r.company}</div>
                <div className="col-span-3 text-right num-mono">{r.selects}</div>
                <div className="col-span-2 text-right num-mono text-accent">₹{r.ctc_lpa?.toFixed(1)}L</div>
              </div>
            ))}
          </div>
        </div>

        <div className="col-span-12 border border-line bg-bone-50" data-testid="recruiter-conversion-engine">
          <div className="p-8 border-b border-line">
            <div className="num-mono text-[10px] tracking-[0.24em] text-ink-400">RECRUITER CONVERSION ANALYTICS</div>
            <h3 className="font-display text-2xl tracking-tight mt-1">Which hiring partners are converting</h3>
          </div>
          <div className="grid grid-cols-12 px-8 py-3 border-b border-line num-mono text-[10px] tracking-[0.24em] text-ink-400">
            <div className="col-span-4">COMPANY</div>
            <div className="col-span-2 text-right">APPS</div>
            <div className="col-span-2 text-right">INTERVIEWS</div>
            <div className="col-span-2 text-right">SELECTED</div>
            <div className="col-span-2 text-right">CONV</div>
          </div>
          {recruiterConversions.slice(0, 10).map((row) => (
            <div key={row.company} className="grid grid-cols-12 px-8 py-3 border-b border-line items-center text-sm">
              <div className="col-span-4 font-medium">{row.company}</div>
              <div className="col-span-2 text-right font-mono tnum">{row.applications}</div>
              <div className="col-span-2 text-right font-mono tnum">{row.interviews}</div>
              <div className="col-span-2 text-right font-mono tnum">{row.selected}</div>
              <div className="col-span-2 text-right font-display text-xl tnum text-accent">{row.conversion_rate}%</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
