import React, { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../App";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar } from "recharts";
import { ArrowUpRight, TrendingUp, Building2, Users, Award } from "lucide-react";

export default function Overview() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [training, setTraining] = useState(null);

  useEffect(() => {
    api.get("/placements/overview").then(({ data }) => setData(data));
    api.get("/training/completion").then(({ data }) => setTraining(data));
  }, []);

  const latest = data?.year_summaries?.[0];
  const placementRate = data ? Math.round((data.students_placed / Math.max(1, data.students_total)) * 100) : 0;

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <div className="num-mono text-[11px] tracking-[0.28em] text-ink-400">COMMAND CENTER · LIVE</div>
          <h1 className="font-display text-5xl md:text-6xl tracking-tightest mt-3" data-testid="overview-heading">Good morning, <span className="ital">{(user?.name || "TPO").split(/\s+/).slice(0, 2).join(" ")}</span>.</h1>
          <p className="font-serif text-lg text-ink-500 mt-2">Here's what's happening across your placement pipeline today.</p>
        </div>
        <div className="flex gap-3">
          <span className="pill">AY {latest?.academic_year || "2025–26"}</span>
          <span className="pill">{latest?.companies || 148} recruiters</span>
        </div>
      </div>

      {/* KPI Bento */}
      <div className="grid grid-cols-12 gap-6" data-testid="kpi-grid">
        <KPI
          big
          className="col-span-12 md:col-span-7"
          eyebrow="Total offers · current year"
          icon={<Award size={16} />}
          value={latest?.offers || 0}
          sub={`from ${latest?.companies || 0} recruiters · ${latest?.top_company} leading`}
          chart={<MiniArea data={data?.year_summaries} valueKey="offers" />}
        />
        <KPI
          className="col-span-12 md:col-span-5"
          eyebrow="Average CTC"
          icon={<TrendingUp size={16} />}
          value={latest?.avg_lpa || 0}
          decimals={2}
          prefix="₹"
          suffix=" L"
          sub={`Top offer ₹${latest?.top_offer_lpa || 0} L · ${latest?.top_company}`}
        />
        <KPI
          className="col-span-12 md:col-span-4"
          eyebrow="Placement rate"
          icon={<Users size={16} />}
          value={placementRate}
          suffix="%"
          sub={`${data?.students_placed || 0} of ${data?.students_total || 0} eligible`}
        />
        <KPI
          className="col-span-12 md:col-span-4"
          eyebrow="Training avg completion"
          icon={<TrendingUp size={16} />}
          value={training ? Math.round(training.by_program.reduce((a, b) => a + b.avg_completion, 0) / Math.max(1, training.by_program.length)) : 0}
          suffix="%"
          sub={`across ${training?.by_program.length || 0} active programs`}
        />
        <KPI
          className="col-span-12 md:col-span-4"
          eyebrow="Top recruiter · ATS"
          icon={<Building2 size={16} />}
          value={data?.top_recruiters?.[0]?.selects || 0}
          suffix=" selects"
          sub={data?.top_recruiters?.[0]?.company || "—"}
        />
      </div>

      {/* Year-over-year offers */}
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 md:col-span-8 border border-line bg-bone-50 p-8" data-testid="yoy-card">
          <div className="flex items-baseline justify-between mb-6">
            <div>
              <div className="num-mono text-[10px] tracking-[0.24em] text-ink-400">YEAR OVER YEAR</div>
              <h3 className="font-display text-2xl tracking-tight mt-1">Offers trajectory · 2017 → 2026</h3>
            </div>
            <span className="num-mono text-[11px] text-ink-400">SOURCE · INSTITUTIONAL</span>
          </div>
          <div className="h-72">
            <ResponsiveContainer>
              <BarChart data={[...(data?.year_summaries || [])].reverse()}>
                <CartesianGrid stroke="rgba(14,14,16,0.06)" vertical={false} />
                <XAxis dataKey="academic_year" tick={{ fill: "#6B6B66", fontSize: 11, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#6B6B66", fontSize: 11, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ border: "1px solid rgba(14,14,16,0.2)", borderRadius: 0, background: "#FFF", fontFamily: "Satoshi" }} />
                <Bar dataKey="offers" fill="#0E0E10" radius={[2, 2, 0, 0]} />
                <Bar dataKey="companies" fill="#1538C8" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="col-span-12 md:col-span-4 border border-bone-100/12 bg-ink-900 text-bone-100 p-8" data-testid="top-recruiters-card">
          <div className="num-mono text-[10px] tracking-[0.24em] text-bone-100/40">TOP RECRUITERS · ALL-TIME</div>
          <div className="space-y-px mt-6">
            {(data?.top_recruiters || []).slice(0, 8).map((r, i) => (
              <div key={r.company} className="flex items-center justify-between py-3 border-b border-bone-100/10" data-testid={`top-rec-${i}`}>
                <div className="flex items-center gap-4">
                  <span className="num-mono text-[10px] text-bone-100/40">{String(i + 1).padStart(2, "0")}</span>
                  <span className="font-display tracking-tight">{r.company}</span>
                </div>
                <div className="text-right">
                  <div className="num-mono text-sm">{r.selects}</div>
                  <div className="num-mono text-[10px] text-accent">₹{r.max_ctc?.toFixed(1)}L</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Department breakdown */}
      <div className="border border-bone-100/12 bg-bone-50 p-8" data-testid="dept-card">
        <div className="flex items-baseline justify-between mb-6">
          <div>
            <div className="num-mono text-[10px] tracking-[0.24em] text-bone-100/45">BY DEPARTMENT</div>
            <h3 className="font-display text-2xl tracking-tight mt-1">Placement breakdown · current cohorts</h3>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {(data?.department_breakdown || []).map((d) => {
            const pct = d.total ? Math.round((d.placed / d.total) * 100) : 0;
            return (
              <div key={d.department} className="border border-bone-100/12 p-6 bg-bone-100" data-testid={`dept-${d.department}`}>
                <div className="num-mono text-[10px] tracking-[0.24em] text-bone-100/45">{d.department}</div>
                <div className="font-display text-4xl mt-2">{pct}%</div>
                <div className="text-sm text-bone-100/55 mt-2">{d.placed}/{d.total} placed</div>
                <div className="mt-4 h-1.5 bg-bone-300 relative">
                  <div className="absolute inset-y-0 left-0 bg-accent" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function KPI({ eyebrow, value, suffix = "", prefix = "", decimals = 0, sub, icon, className = "", big, chart }) {
  return (
    <div className={`border border-line bg-bone-50 p-8 bento-card ${className}`}>
      <div className="flex items-center justify-between text-ink-400">
        <div className="flex items-center gap-2 num-mono text-[10px] tracking-[0.24em]">{icon}<span>{eyebrow}</span></div>
        <ArrowUpRight size={14} />
      </div>
      <div className={`font-display tracking-tightest mt-6 ${big ? "text-7xl" : "text-5xl"}`}>
        {prefix}{Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}{suffix}
      </div>
      {sub && <div className="text-sm text-ink-500 mt-3">{sub}</div>}
      {chart && <div className="mt-6 h-24">{chart}</div>}
    </div>
  );
}

function MiniArea({ data, valueKey }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={[...(data || [])].reverse()}>
        <defs>
          <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1538C8" stopOpacity={0.5} />
            <stop offset="100%" stopColor="#1538C8" stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey={valueKey} stroke="#1538C8" strokeWidth={2} fill="url(#g1)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
