import React from "react";
import { Link } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import VoiceSummary from "./VoiceSummary";

const inr = (v) => {
  const n = Number(v || 0);
  if (n >= 10000000) return `${(n / 10000000).toFixed(2)} Cr`;
  if (n >= 100000) return `${(n / 100000).toFixed(2)} L`;
  return n.toLocaleString();
};

/**
 * Platform-wide AI Executive Summary + Voice Narration + AI Risk Radar (super_admin).
 * Pure presentation: consumes the stats + institutions PlatformControl already fetches,
 * so it adds zero network calls and never touches existing logic.
 */
export default function PlatformSummary({ stats, insts = [] }) {
  if (!stats) return null;

  const pending = insts.filter((i) => i.approved === false);
  const withHealth = insts.filter((i) => typeof i.health_score === "number");
  const atRisk = withHealth.filter((i) => i.health_score < 65).sort((a, b) => a.health_score - b.health_score);

  const risks = [];
  atRisk.slice(0, 4).forEach((i) => {
    risks.push({
      title: i.short_name || i.name,
      body: `Health ${Math.round(i.health_score)} — ${i.health_label || "needs attention"}`,
      severity: i.health_score < 50 ? "high" : "medium",
      to: i.institution_id ? "/platform/institutions" : null,
    });
  });
  if (stats.pending_signups > 0) {
    risks.push({
      title: `${stats.pending_signups} pending signup${stats.pending_signups === 1 ? "" : "s"}`,
      body: "Awaiting review in the partner queue.",
      severity: stats.pending_signups > 5 ? "high" : "medium",
      to: "/platform/institutions",
    });
  }
  pending.slice(0, 2).forEach((i) => {
    risks.push({ title: i.short_name || i.name, body: "Institution pending approval.", severity: "medium", to: "/platform/institutions" });
  });
  const radar = risks.slice(0, 5);

  const narration = [
    `Platform summary. ${stats.institutions} active institution${stats.institutions === 1 ? "" : "s"}, ${Number(stats.students || 0).toLocaleString()} students, and ${stats.jobs_open} open drives across ${stats.recruiters} recruiters.`,
    `${Number(stats.applications || 0).toLocaleString()} applications tracked, with an estimated monthly revenue of ${inr(stats.estimated_mrr_inr)} rupees.`,
    stats.pending_signups ? `${stats.pending_signups} signup${stats.pending_signups === 1 ? "" : "s"} await review.` : "No signups pending review.",
    atRisk.length
      ? `${atRisk.length} college${atRisk.length === 1 ? "" : "s"} are below the health benchmark, led by ${atRisk[0].short_name || atRisk[0].name} at ${Math.round(atRisk[0].health_score)}.`
      : "All scored colleges are at or above the health benchmark.",
    atRisk.length
      ? `Recommended focus: open ${atRisk[0].short_name || atRisk[0].name} and trigger a renewal or training intervention.`
      : "Recommended focus: sustain partner momentum and clear the signup queue.",
  ].filter(Boolean).join(" ");

  return (
    <section className="grid grid-cols-12 gap-3" data-testid="platform-ai-summary">
      <div className="col-span-12 lg:col-span-8 editorial p-8 bg-bone-50">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="font-mono text-[10px] tracking-[0.28em] text-ink-400">AI EXECUTIVE SUMMARY / PLATFORM</div>
          <VoiceSummary text={narration} label="Narrate platform" />
        </div>
        <p className="font-serif text-xl text-ink-600 mt-4 leading-relaxed">{narration}</p>
      </div>

      <div className="col-span-12 lg:col-span-4 editorial p-8 bg-ink-900 text-bone-100">
        <div className="font-mono text-[10px] tracking-[0.24em] text-bone-100/40">AI RISK RADAR / THIS MONTH</div>
        <div className="mt-4 space-y-3">
          {radar.map((r, i) => {
            const inner = (
              <>
                <div className="flex items-center gap-2 font-mono text-[9px] tracking-[0.18em] uppercase text-bone-100/40">
                  <AlertTriangle size={11} className={r.severity === "high" ? "text-accent" : "text-bone-100/40"} />
                  {r.severity}
                </div>
                <div className="font-display text-base tracking-tight mt-1">{r.title}</div>
                <div className="text-xs text-bone-100/60 mt-0.5">{r.body}</div>
              </>
            );
            return r.to ? (
              <Link key={i} to={r.to} className="block border-b border-bone-100/10 pb-3 last:border-0 hover:opacity-80 transition-opacity">{inner}</Link>
            ) : (
              <div key={i} className="border-b border-bone-100/10 pb-3 last:border-0">{inner}</div>
            );
          })}
          {radar.length === 0 && <div className="text-sm text-bone-100/50">No active risks. Platform is healthy.</div>}
        </div>
      </div>
    </section>
  );
}
