import React, { useEffect, useState } from "react";
import { api } from "../lib/api";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export default function PlacementIntelligence() {
  const [overview, setOverview] = useState(null);
  const [intel, setIntel] = useState(null);

  useEffect(() => {
    Promise.allSettled([
      api.get("/placements/overview"),
      api.get("/placements/intelligence"),
    ]).then(([ovRes, intRes]) => {
      if (ovRes.status === "fulfilled") setOverview(ovRes.value.data);
      if (intRes.status === "fulfilled") setIntel(intRes.value.data);
    });
  }, []);

  if (!overview && !intel) return <div className="font-mono text-xs text-ink-400">LOADING PLACEMENT INTELLIGENCE...</div>;

  const ov = overview || {};
  const il = intel || {};
  const forecast = il.forecast || {};
  const funnel = il.funnel || [];
  const riskStudents = il.risk_students || [];
  const departments = il.departments || ov.departments || [];
  const recruiterConversion = il.recruiter_conversion || [];
  const trend = il.readiness_trend || [];
  const yearData = (ov.year_summaries || ov.years || []).map(y => ({
    year: y.year, avg: y.avg_lpa || y.avg_ctc, top: y.top_offer_lpa || y.top_ctc, offers: y.offers
  }));

  return (
    <div className="space-y-10">
      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-12 md:col-span-8 editorial p-10">
          <div className="font-mono text-[10px] tracking-[0.28em] text-ink-400">PLACEMENT INTELLIGENCE ENGINE</div>
          <h1 className="font-display text-5xl md:text-6xl tracking-tightest mt-3">Placement forecast.</h1>
          <p className="font-serif text-lg text-ink-500 mt-2 max-w-xl">Forecast offers, identify risk students, analyze department placement rates, and track recruiter conversion.</p>
        </div>
        <div className="col-span-12 md:col-span-4 editorial bg-ink-900 text-bone-100 p-10">
          <div className="font-mono text-[10px] tracking-[0.28em] text-bone-100/40">PLACEMENT RATE</div>
          <div className="font-display text-[8vw] md:text-[6vw] tracking-tightest leading-[0.9] tnum text-accent">{ov.placement_rate || il.placement_rate || 0}%</div>
          <div className="text-bone-100/60 text-sm">{ov.total_placed || il.placed || 0} placed / {ov.total_students || il.total || 0} students</div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-3">
        {[
          { label: "Forecast Offers", value: forecast.predicted_offers || forecast.forecasted || 0, sub: `${forecast.confidence || 0}% confidence` },
          { label: "Current Offers", value: ov.total_offers || il.current_offers || 0, sub: "accepted offers" },
          { label: "Open Capacity", value: forecast.open_capacity || 0, sub: "unfilled positions" },
          { label: "Interview Pipeline", value: forecast.interview_stage || il.interview_pipeline || 0, sub: "in interview stage" },
        ].map(card => (
          <div key={card.label} className="col-span-12 md:col-span-3 editorial p-6">
            <div className="font-mono text-[10px] tracking-[0.24em] text-ink-400">{card.label.toUpperCase()}</div>
            <div className="font-display text-5xl tracking-tightest mt-3 tnum">{card.value}</div>
            <div className="text-sm text-ink-500 mt-2">{card.sub}</div>
          </div>
        ))}
      </div>

      {funnel.length > 0 && (
        <div className="editorial p-8">
          <div className="font-mono text-[10px] tracking-[0.24em] text-ink-400">PLACEMENT FUNNEL</div>
          <div className="mt-6 space-y-4">
            {funnel.map((stage, i) => (
              <div key={stage.stage || i}>
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{stage.stage}</span>
                  <span className="font-mono">{stage.count} ({stage.conversion_rate || stage.rate || 0}%)</span>
                </div>
                <div className="mt-2 h-3 bg-bone-300 relative">
                  <div className="absolute inset-y-0 left-0 bg-ink-900" style={{ width: `${Math.min(100, stage.conversion_rate || stage.rate || stage.pct || 0)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {riskStudents.length > 0 && (
        <div className="editorial p-8 bg-ink-900 text-bone-100">
          <div className="font-mono text-[10px] tracking-[0.24em] text-bone-100/40">RISK STUDENTS · NEEDS INTERVENTION</div>
          <div className="mt-5 divide-y divide-bone-100/10">
            {riskStudents.slice(0, 10).map((stu, i) => (
              <div key={stu.student_id || i} className="grid grid-cols-12 gap-3 py-4">
                <div className="col-span-3 font-medium">{stu.name}</div>
                <div className="col-span-2 font-mono text-sm text-bone-100/50">{stu.roll_number || "—"}</div>
                <div className="col-span-2 font-mono text-sm text-bone-100/50">{stu.department}</div>
                <div className="col-span-2 text-right font-display text-xl tnum text-accent">{stu.readiness || stu.readiness_score || 0}</div>
                <div className="col-span-3 text-right">
                  <span className={`text-xs px-2 py-1 ${stu.band === "needs_intervention" ? "bg-red-900/30 text-red-300" : "bg-yellow-900/30 text-yellow-300"}`}>
                    {stu.band || stu.readiness_band || "watch"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-12 lg:col-span-7 editorial p-8">
          <div className="font-mono text-[10px] tracking-[0.24em] text-ink-400">DEPARTMENT ANALYTICS</div>
          <div className="mt-5 divide-y divide-line">
            {departments.map((dept, i) => (
              <div key={dept.department || i} className="grid grid-cols-12 gap-3 py-4">
                <div className="col-span-4 font-medium">{dept.department}</div>
                <div className="col-span-2 font-mono text-sm text-ink-500">{dept.placed || 0}/{dept.total || 0}</div>
                <div className="col-span-2 text-right font-display text-accent tnum">{dept.placement_rate || 0}%</div>
                <div className="col-span-4">
                  <div className="h-2 bg-bone-300 relative mt-1">
                    <div className="absolute inset-y-0 left-0 bg-ink-900" style={{ width: `${dept.placement_rate || 0}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="col-span-12 lg:col-span-5 editorial p-8 bg-bone-50">
          <div className="font-mono text-[10px] tracking-[0.24em] text-ink-400">READINESS DISTRIBUTION</div>
          <div className="mt-5 space-y-3">
            {trend.map((band, i) => (
              <div key={band.band || i}>
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{band.band || band.label}</span>
                  <span className="font-mono">{band.count} ({band.share || 0}%)</span>
                </div>
                <div className="mt-2 h-2 bg-bone-300 relative">
                  <div className="absolute inset-y-0 left-0 bg-accent" style={{ width: `${band.share || 0}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {yearData.length > 0 && (
        <div className="editorial p-8">
          <div className="font-mono text-[10px] tracking-[0.24em] text-ink-400">CTC TREND</div>
          <div className="mt-6" style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={yearData}>
                <XAxis dataKey="year" tick={{ fontSize: 11, fontFamily: "monospace" }} />
                <YAxis tick={{ fontSize: 11, fontFamily: "monospace" }} />
                <Tooltip contentStyle={{ fontFamily: "monospace", fontSize: 12, border: "1px solid #ddd", borderRadius: 0 }} />
                <Line type="monotone" dataKey="avg" stroke="#0a0a0a" strokeWidth={2} dot={{ r: 3 }} name="Avg LPA" />
                <Line type="monotone" dataKey="top" stroke="#ff3b00" strokeWidth={2} dot={{ r: 3 }} name="Top LPA" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {ov.placement_records && ov.placement_records.length > 0 && (
        <div className="editorial p-8 bg-bone-50">
          <div className="font-mono text-[10px] tracking-[0.24em] text-ink-400">HISTORICAL HIRING COMPANIES</div>
          <h3 className="font-display text-2xl tracking-tight mt-1 mb-6">Track record across companies</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-line text-[10px] font-mono tracking-wider text-ink-400 uppercase">
                  <th className="pb-3">Academic Year</th>
                  <th className="pb-3">Company</th>
                  <th className="pb-3 text-right">Selects</th>
                  <th className="pb-3 text-right">CTC (LPA)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line text-sm">
                {ov.placement_records.slice(0, 15).map((rec, i) => (
                  <tr key={rec.record_id || i} className="hover:bg-bone-100/50 transition-colors">
                    <td className="py-3 font-mono">{rec.academic_year}</td>
                    <td className="py-3 font-semibold">{rec.company}</td>
                    <td className="py-3 text-right font-mono tnum">{rec.selects}</td>
                    <td className="py-3 text-right font-mono tnum text-accent">₹{rec.ctc_lpa} L</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {recruiterConversion.length > 0 && (
        <div className="editorial">
          <div className="p-6 border-b border-line">
            <div className="font-mono text-[10px] tracking-[0.24em] text-ink-400">RECRUITER CONVERSION ANALYTICS</div>
          </div>
          <div className="grid grid-cols-12 px-6 py-3 border-b border-line font-mono text-[10px] tracking-[0.24em] text-ink-400">
            <div className="col-span-3">COMPANY</div>
            <div className="col-span-2 text-right">APPS</div>
            <div className="col-span-2 text-right">INTERVIEWS</div>
            <div className="col-span-2 text-right">SELECTED</div>
            <div className="col-span-3 text-right">CONVERSION</div>
          </div>
          {recruiterConversion.map((r, i) => (
            <div key={r.company || i} className="grid grid-cols-12 px-6 py-3 border-b border-line items-center text-sm hover:bg-bone-200 transition-colors">
              <div className="col-span-3 font-medium">{r.company}</div>
              <div className="col-span-2 text-right font-mono tnum">{r.applications || 0}</div>
              <div className="col-span-2 text-right font-mono tnum">{r.interviews || 0}</div>
              <div className="col-span-2 text-right font-mono tnum">{r.selected || 0}</div>
              <div className="col-span-3 text-right font-display text-xl tnum text-accent">{r.conversion_rate || 0}%</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
