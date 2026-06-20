import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";

/**
 * AI High-Risk Students widget.
 * Reads /api/readiness/students (institution-scoped server-side from the session),
 * surfacing the lowest-readiness students the existing intelligence engine already
 * flags as weak_students — turning the prediction engine into a visible action list.
 */
export default function HighRiskStudents({ rosterPath, limit = 6 }) {
  const [roster, setRoster] = useState(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    let alive = true;
    api
      .get("/readiness/students")
      .then(({ data }) => { if (alive) setRoster(data); })
      .catch(() => { if (alive) setErr(true); });
    return () => { alive = false; };
  }, []);

  if (err) return null;

  const weak = (roster?.weak_students || []).slice(0, limit);

  return (
    <div className="editorial p-8 h-full" data-testid="high-risk-students">
      <div className="flex items-center justify-between gap-4">
        <div className="font-mono text-[10px] tracking-[0.24em] text-ink-400">AI RISK / HIGH-RISK STUDENTS</div>
        {rosterPath && (
          <Link to={rosterPath} className="font-mono text-[10px] tracking-[0.18em] uppercase text-accent hover:underline">
            Open roster →
          </Link>
        )}
      </div>

      {!roster && <div className="text-sm text-ink-400 mt-5">Scoring students…</div>}

      <div className="mt-5 space-y-px">
        {weak.map((s, i) => {
          const topRisk = (s.risks || [])[0];
          return (
            <div key={s.student_id || i} className="flex items-center justify-between py-3 border-b border-line last:border-0">
              <div className="min-w-0">
                <div className="font-display tracking-tight truncate text-ink-900">{s.name || s.roll_number || "Student"}</div>
                <div className="font-mono text-[10px] text-ink-400 mt-0.5 truncate">
                  {(s.department || "—")}{topRisk ? ` · ${topRisk.message}` : s.readiness_label ? ` · ${s.readiness_label}` : ""}
                </div>
              </div>
              <div className="text-right ml-3 shrink-0">
                <div className="font-display text-2xl tnum text-accent">{Math.round(s.readiness_score)}</div>
                <div className="font-mono text-[9px] tracking-[0.16em] uppercase text-ink-400">/100</div>
              </div>
            </div>
          );
        })}
        {roster && weak.length === 0 && (
          <div className="text-sm text-ink-400">No high-risk students — every tracked student is on track.</div>
        )}
      </div>

      {roster?.needs_intervention != null && (
        <div className="mt-4 font-mono text-[10px] tracking-[0.18em] uppercase text-ink-400">
          {roster.needs_intervention} need intervention · avg readiness {roster.avg_readiness}/100
        </div>
      )}
    </div>
  );
}
