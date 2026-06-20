import React, { useEffect, useState } from "react";
import { api } from "../lib/api";
import VoiceSummary from "./VoiceSummary";

const ACTION_BY_FACTOR = {
  "Placement Rate": "Launch a placement booster — open more drives and convert active interviews.",
  "Training Completion": "Schedule a CRT / training booster batch for lagging cohorts.",
  "Communication Activity": "Increase partner touchpoints and log outreach in the comm log.",
  "MOU Status": "Begin the MOU renewal process before it lapses.",
  "FDP Participation": "Schedule an FDP session to lift faculty engagement.",
  "Revenue Contribution": "Review seat utilization and plan additional seat purchases.",
};

/**
 * College Health — 6-factor breakdown + AI advisor next-actions.
 * Reads the existing /api/health-score/{institution_id} endpoint, which already
 * returns Placement Rate, Training Completion, Communication, MOU, FDP, and Revenue
 * factors with weight + contribution + detail. Adds an AI verdict + optional narration.
 */
export default function HealthBreakdown({ institutionId, showVoice = false }) {
  const [health, setHealth] = useState(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    if (!institutionId) return undefined;
    let alive = true;
    api
      .get(`/health-score/${institutionId}`)
      .then(({ data }) => { if (alive) setHealth(data); })
      .catch(() => { if (alive) setErr(true); });
    return () => { alive = false; };
  }, [institutionId]);

  if (err || !institutionId) return null;

  if (!health) {
    return (
      <div className="editorial p-8 h-full" data-testid="health-breakdown">
        <div className="font-mono text-[10px] tracking-[0.24em] text-ink-400">COLLEGE HEALTH / 6-FACTOR</div>
        <div className="text-sm text-ink-400 mt-4">Computing health…</div>
      </div>
    );
  }

  const factors = health.factors || [];
  const weakest = factors.length ? [...factors].sort((a, b) => (a.value || 0) - (b.value || 0))[0] : null;
  const strongest = factors.length ? [...factors].sort((a, b) => (b.value || 0) - (a.value || 0))[0] : null;
  const verdict = weakest
    ? `Overall health is ${health.label} at ${health.score} out of 100. Strongest factor is ${strongest.label} at ${Math.round(strongest.value)}. The weakest is ${weakest.label} at ${Math.round(weakest.value)} — ${weakest.detail}. Prioritise lifting ${weakest.label} to raise the overall score.`
    : `Overall health is ${health.label} at ${health.score} out of 100.`;

  const actions = [...factors]
    .sort((a, b) => (a.value || 0) - (b.value || 0))
    .slice(0, 3)
    .map((f) => ACTION_BY_FACTOR[f.label])
    .filter(Boolean);

  return (
    <div className="editorial p-8 h-full" data-testid="health-breakdown">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="font-mono text-[10px] tracking-[0.24em] text-ink-400">COLLEGE HEALTH / 6-FACTOR</div>
        {showVoice && <VoiceSummary text={verdict} label="Narrate health" />}
      </div>
      <div className="flex items-baseline gap-3 mt-3">
        <div className="font-display text-6xl tracking-tightest tnum">{health.score}</div>
        <div className="font-mono text-[11px] tracking-[0.18em] uppercase text-ink-500">
          {health.grade ? `Grade ${health.grade} · ` : ""}{health.label}
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {factors.map((f) => {
          const pct = Math.max(0, Math.min(100, Number(f.value) || 0));
          return (
            <div key={f.label}>
              <div className="flex items-center justify-between text-sm">
                <span className="font-display tracking-tight">{f.label}</span>
                <span className="font-mono text-[11px] text-ink-500 tnum">{Math.round(pct)} · {Math.round((f.weight || 0) * 100)}%</span>
              </div>
              <div className="mt-2 h-1.5 bg-bone-300 relative">
                <div className="absolute inset-y-0 left-0 bg-accent" style={{ width: `${pct}%` }} />
              </div>
              <div className="text-xs text-ink-400 mt-1">{f.detail}</div>
            </div>
          );
        })}
      </div>

      <div className="border-t border-line my-5" />
      <div className="font-mono text-[10px] tracking-[0.24em] text-ink-400">AI VERDICT</div>
      <p className="font-serif text-base text-ink-600 mt-2 leading-relaxed">{verdict}</p>

      {actions.length > 0 && (
        <div className="mt-5">
          <div className="font-mono text-[10px] tracking-[0.24em] text-ink-400">AI ADVISOR / NEXT ACTIONS</div>
          <ol className="mt-3 space-y-2">
            {actions.map((a, i) => (
              <li key={i} className="flex gap-3 text-sm text-ink-600">
                <span className="font-mono text-[11px] text-accent tnum shrink-0">{String(i + 1).padStart(2, "0")}</span>
                <span>{a}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
