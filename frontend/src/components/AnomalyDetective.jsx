import React, { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { TrendingUp, AlertTriangle, Sparkles, Activity } from "lucide-react";

/**
 * Anomaly Detective — "AI without an LLM".
 * Scans the live /api/placements/overview payload (year-over-year summaries, department
 * breakdown, readiness, forecast) and surfaces WINNER / ALERT / OPPORTUNITY signals from
 * real variance. Pure frontend, no backend change.
 */
const pctDelta = (cur, prev) => (prev ? ((cur - prev) / prev) * 100 : 0);
const lpa = (v) => Number(v || 0).toFixed(1);

export default function AnomalyDetective() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    let alive = true;
    api.get("/placements/overview")
      .then(({ data }) => { if (alive) setData(data); })
      .catch(() => { if (alive) setErr(true); });
    return () => { alive = false; };
  }, []);

  const anomalies = useMemo(() => {
    if (!data) return [];
    const out = [];
    const years = [...(data.year_summaries || [])].sort((a, b) => String(b.academic_year || "").localeCompare(String(a.academic_year || "")));
    const cur = years[0];
    const prev = years[1];
    if (cur && prev) {
      const od = pctDelta(cur.offers || 0, prev.offers || 0);
      if (od >= 8) out.push({ type: "WINNER", title: `Offers up ${Math.round(od)}% year over year`, body: `${cur.offers} offers in ${cur.academic_year} vs ${prev.offers} the year before.` });
      else if (od <= -8) out.push({ type: "ALERT", title: `Offers down ${Math.round(Math.abs(od))}% year over year`, body: `${cur.offers} offers in ${cur.academic_year} vs ${prev.offers} prior — review drive coverage.` });
      const cd = pctDelta(cur.avg_lpa || 0, prev.avg_lpa || 0);
      if (cd >= 8) out.push({ type: "WINNER", title: `Average package up ${Math.round(cd)}%`, body: `Average CTC rose to ${lpa(cur.avg_lpa)} LPA.` });
      else if (cd <= -8) out.push({ type: "ALERT", title: `Average package down ${Math.round(Math.abs(cd))}%`, body: `Average CTC slipped to ${lpa(cur.avg_lpa)} LPA.` });
    }
    const depts = [...(data.department_breakdown || [])].sort((a, b) => (a.placement_rate || 0) - (b.placement_rate || 0));
    const weakest = depts[0];
    const strongest = depts[depts.length - 1];
    if (weakest && (weakest.placement_rate || 0) < 60) {
      out.push({ type: "ALERT", title: `${weakest.department} placement at ${weakest.placement_rate}%`, body: `${weakest.placed}/${weakest.total} placed — below the 60% benchmark.` });
    }
    if (strongest && strongest !== weakest && (strongest.placement_rate || 0) >= 80) {
      out.push({ type: "WINNER", title: `${strongest.department} leading at ${strongest.placement_rate}%`, body: "Top-performing department — replicate its CRT cadence." });
    }
    const needs = data.readiness?.needs_intervention || 0;
    if (needs > 0) out.push({ type: "OPPORTUNITY", title: `${needs} students need intervention`, body: "Readiness below threshold — a targeted booster could convert them before drives." });
    const fc = data.forecast || {};
    if ((fc.forecasted_offers || 0) > (fc.current_offers || 0)) {
      out.push({ type: "OPPORTUNITY", title: `Forecast ${fc.forecasted_offers} offers this cycle`, body: `Open pipeline can lift offers above the current ${fc.current_offers} if conversions hold.` });
    }
    return out;
  }, [data]);

  if (err || !data) return null;

  const ICON = { WINNER: TrendingUp, ALERT: AlertTriangle, OPPORTUNITY: Sparkles };

  return (
    <div className="editorial p-8 h-full" data-testid="anomaly-detective">
      <div className="flex items-center gap-2 font-mono text-[10px] tracking-[0.24em] text-ink-400">
        <Activity size={12} /> ANOMALY DETECTIVE
      </div>
      <h3 className="font-display text-2xl tracking-tight mt-1">What changed</h3>

      <div className="mt-5 space-y-3">
        {anomalies.slice(0, 5).map((a, i) => {
          const Icon = ICON[a.type] || Activity;
          return (
            <div key={i} className="border-b border-line pb-3 last:border-0">
              <div className="flex items-center gap-2 font-mono text-[9px] tracking-[0.18em] uppercase text-accent">
                <Icon size={12} /> {a.type}
              </div>
              <div className="font-display text-base tracking-tight mt-1 text-ink-900">{a.title}</div>
              <div className="text-xs text-ink-500 mt-0.5">{a.body}</div>
            </div>
          );
        })}
        {anomalies.length === 0 && (
          <div className="text-sm text-ink-400">No significant anomalies this cycle — metrics are stable.</div>
        )}
      </div>
    </div>
  );
}
