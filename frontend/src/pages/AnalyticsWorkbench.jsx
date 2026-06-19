import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { AlertTriangle, ArrowUpRight, BrainCircuit, Gauge, Route, ShieldCheck } from "lucide-react";

const fmt = (value, digits = 0) => {
  const n = Number(value || 0);
  return n.toLocaleString(undefined, { maximumFractionDigits: digits, minimumFractionDigits: digits });
};

const healthColor = (health) => ({
  strong: "#2f6b3f",
  healthy: "#2f6b3f",
  watch: "#c1440e",
  critical: "#9f1d1d",
  high: "#2f6b3f",
  medium: "#c1440e",
  low: "#9f1d1d",
}[health] || "#0a0a0a");

function MetricCard({ metric, index }) {
  return (
    <div className={`${index === 0 ? "col-span-12 md:col-span-6" : "col-span-12 md:col-span-2"} editorial p-7`}>
      <div className="flex items-start justify-between gap-4">
        <div className="font-mono text-[10px] tracking-[0.24em] text-ink-400 uppercase">{metric.label}</div>
        <span className="w-2.5 h-2.5 mt-1" style={{ background: healthColor(metric.health) }} />
      </div>
      <div className={`${index === 0 ? "text-7xl" : "text-5xl"} font-display tracking-tightest mt-4 tnum`}>
        {fmt(metric.value, Number.isInteger(metric.value) ? 0 : 1)}{metric.unit}
      </div>
      <div className="text-sm text-ink-500 mt-3 leading-relaxed">{metric.question}</div>
    </div>
  );
}

export default function AnalyticsWorkbench() {
  const [data, setData] = useState(null);
  const [modules, setModules] = useState(null);

  useEffect(() => {
    api.get("/analytics/engine").then(({ data }) => setData(data)).catch(() => setData(null));
    api.get("/intelligence/modules").then(({ data }) => setModules(data)).catch(() => setModules(null));
  }, []);

  const funnelData = useMemo(() => (data?.funnel || []).filter((row) => row.stage !== "Rejected"), [data]);
  const healthRows = data?.department_health || [];

  if (!data) {
    return <div className="font-mono text-xs tracking-[0.28em] text-ink-400">LOADING ANALYTICS ENGINE...</div>;
  }

  return (
    <div className="space-y-10">
      <section className="grid grid-cols-12 gap-3">
        <div className="col-span-12 lg:col-span-8 editorial bg-ink-900 text-bone-100 p-10 lg:p-14 overflow-hidden relative">
          <div className="absolute right-8 top-8 hidden md:grid grid-cols-3 gap-1 opacity-20">
            {Array.from({ length: 27 }).map((_, i) => <span key={i} className="w-3 h-3 bg-accent" />)}
          </div>
          <div className="font-mono text-[10px] tracking-[0.28em] text-bone-100/40">PHASE 7 / ANALYTICS ENGINE</div>
          <h1 className="font-display text-5xl md:text-7xl tracking-tightest leading-[0.92] mt-3" data-testid="analytics-heading">
            Command intelligence, not dashboards.
          </h1>
          <p className="font-serif text-lg text-bone-100/70 mt-5 max-w-2xl">
            Forecasts, leakage, department health, and intervention load in one operating surface.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <span className="pill border-bone-100/20 text-bone-100">Scope / {data.scope.institution || "Institution"}</span>
            <span className="pill border-bone-100/20 text-bone-100">{data.scope.department || "All departments"}</span>
            <span className="pill border-bone-100/20 text-bone-100">Health / {data.summary.health}</span>
          </div>
        </div>
        <div className="col-span-12 lg:col-span-4 editorial p-10 bg-bone-50">
          <div className="flex items-center gap-3 text-ink-400">
            <Gauge size={18} />
            <div className="font-mono text-[10px] tracking-[0.24em] uppercase">Operating Score</div>
          </div>
          <div className="font-display text-8xl tracking-tightest mt-6 tnum text-accent">
            {fmt(data.summary.command_score, 1)}
          </div>
          <div className="text-sm text-ink-500 mt-2">Composite of placement, readiness, training, and conversion.</div>
          <div className="hairline my-6" />
          <div className="grid grid-cols-3 gap-3 text-xs">
            <div>
              <div className="font-mono text-[10px] text-ink-400">PLACED</div>
              <div className="font-display text-2xl mt-1">{fmt(data.summary.placement_rate)}%</div>
            </div>
            <div>
              <div className="font-mono text-[10px] text-ink-400">READY</div>
              <div className="font-display text-2xl mt-1">{fmt(data.summary.readiness_avg, 1)}</div>
            </div>
            <div>
              <div className="font-mono text-[10px] text-ink-400">CONVERT</div>
              <div className="font-display text-2xl mt-1">{fmt(data.summary.conversion_rate, 1)}%</div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-12 gap-3" data-testid="analytics-kpis">
        {(data.kpis || []).map((metric, index) => <MetricCard key={metric.label} metric={metric} index={index} />)}
      </section>

      <section className="grid grid-cols-12 gap-3">
        <div className="col-span-12 lg:col-span-7 editorial p-8" data-testid="analytics-trend">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <div className="font-mono text-[10px] tracking-[0.24em] text-ink-400">PLACEMENT TRAJECTORY</div>
              <h2 className="font-display text-2xl tracking-tight mt-1">Offer trend and recruiter liquidity</h2>
            </div>
            <span className="pill">{fmt(data.summary.offers_delta_pct, 1)}% YoY</span>
          </div>
          <div className="h-80">
            <ResponsiveContainer>
              <LineChart data={data.trend || []}>
                <CartesianGrid vertical={false} stroke="rgba(10,10,10,0.08)" />
                <XAxis dataKey="academic_year" tick={{ fontSize: 10, fill: "#777", fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#777", fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 0, border: "1px solid rgba(10,10,10,0.18)" }} />
                <Line type="monotone" dataKey="offers" stroke="#0a0a0a" strokeWidth={3} dot={false} />
                <Line type="monotone" dataKey="companies" stroke="#ff3b00" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-5 editorial p-8 bg-bone-50" data-testid="analytics-funnel">
          <div className="flex items-center gap-3 text-ink-400">
            <Route size={18} />
            <div className="font-mono text-[10px] tracking-[0.24em] uppercase">Funnel Leakage</div>
          </div>
          <div className="mt-6 h-72">
            <ResponsiveContainer>
              <BarChart data={funnelData}>
                <CartesianGrid vertical={false} stroke="rgba(10,10,10,0.08)" />
                <XAxis dataKey="stage" tick={{ fontSize: 10, fill: "#777", fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#777", fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 0, border: "1px solid rgba(10,10,10,0.18)" }} />
                <Bar dataKey="count" fill="#0a0a0a" />
                <Bar dataKey="leakage" fill="#c1440e" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-5 space-y-2">
            {funnelData.slice(0, 4).map((row) => (
              <div key={row.stage} className="grid grid-cols-12 gap-3 text-sm border-t border-line pt-3">
                <div className="col-span-3 font-display">{row.stage}</div>
                <div className="col-span-2 font-mono tnum">{row.count}</div>
                <div className="col-span-2 font-mono text-accent tnum">{row.leakage}%</div>
                <div className="col-span-5 text-ink-500 text-xs">{row.action}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-12 gap-3">
        <div className="col-span-12 lg:col-span-7 editorial p-8" data-testid="analytics-departments">
          <div className="font-mono text-[10px] tracking-[0.24em] text-ink-400">DEPARTMENT HEALTH</div>
          <h2 className="font-display text-2xl tracking-tight mt-1">Where leadership should look first</h2>
          <div className="mt-6 divide-y divide-line">
            {healthRows.map((row) => (
              <div key={row.department} className="grid grid-cols-12 gap-4 py-4 items-center">
                <div className="col-span-3">
                  <div className="font-display text-xl">{row.department}</div>
                  <div className="font-mono text-[10px] text-ink-400 uppercase">{row.health}</div>
                </div>
                <div className="col-span-3">
                  <div className="text-xs text-ink-400">Placement</div>
                  <div className="font-display text-3xl tnum">{fmt(row.placement_rate)}%</div>
                </div>
                <div className="col-span-3">
                  <div className="text-xs text-ink-400">Readiness</div>
                  <div className="font-display text-3xl tnum text-accent">{fmt(row.readiness_avg, 1)}</div>
                </div>
                <div className="col-span-3">
                  <div className="h-2 bg-bone-300">
                    <div className="h-full" style={{ width: `${Math.min(100, row.health_score)}%`, background: healthColor(row.health) }} />
                  </div>
                  <div className="text-xs text-ink-500 mt-2">{row.interventions} interventions</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="col-span-12 lg:col-span-5 space-y-3">
          <div className="editorial bg-ink-900 text-bone-100 p-8" data-testid="analytics-risk">
            <div className="flex items-center gap-3 text-bone-100/50">
              <AlertTriangle size={18} />
              <div className="font-mono text-[10px] tracking-[0.24em] uppercase">Risk Register</div>
            </div>
            <div className="mt-5 space-y-4">
              {(data.risk_register || []).slice(0, 4).map((risk) => (
                <div key={risk.risk} className="border-t border-bone-100/10 pt-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-display text-xl tracking-tight">{risk.risk}</div>
                    <span className="font-mono text-[10px] uppercase text-accent">{risk.severity}</span>
                  </div>
                  <div className="text-sm text-bone-100/60 mt-1">{risk.signal}</div>
                  <div className="text-xs text-bone-100/40 mt-2">{risk.action}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="editorial p-8 bg-bone-50">
            <div className="flex items-center gap-3 text-ink-400">
              <BrainCircuit size={18} />
              <div className="font-mono text-[10px] tracking-[0.24em] uppercase">Recommendations</div>
            </div>
            <div className="mt-5 space-y-3">
              {(data.recommendations || []).map((rec) => (
                <Link key={rec.title} to={rec.to || "#"} className="block border border-line bg-bone-100 p-4 hover:border-ink-900 transition-colors">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-display text-lg">{rec.title}</div>
                    <ArrowUpRight size={14} />
                  </div>
                  <div className="text-sm text-ink-500 mt-1">{rec.body}</div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {modules?.cards?.length > 0 && (
        <section className="editorial p-8" data-testid="analytics-modules">
          <div className="flex items-center gap-3 text-ink-400">
            <ShieldCheck size={18} />
            <div className="font-mono text-[10px] tracking-[0.24em] uppercase">Module Health</div>
          </div>
          <div className="grid grid-cols-12 gap-3 mt-6">
            {modules.cards.map((card) => (
              <Link key={card.code} to={card.to || "#"} className="col-span-12 md:col-span-4 border border-line bg-bone-50 p-5 hover:border-ink-900 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="font-display text-xl tracking-tight">{card.module}</div>
                  <span className="w-2.5 h-2.5" style={{ background: healthColor(card.health) }} />
                </div>
                <div className="font-display text-5xl tracking-tightest mt-4 tnum">{fmt(card.score, 1)}</div>
                <div className="text-sm text-ink-500 mt-2">{card.primary}</div>
                <div className="text-xs text-ink-400 mt-1">{card.action}</div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
