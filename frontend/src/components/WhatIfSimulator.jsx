import React, { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { SlidersHorizontal, ArrowRight } from "lucide-react";

/**
 * What-If Simulator — interactive placement forecasting.
 * Reads the live /api/placements/overview baseline (institution-scoped server-side)
 * and projects expected placements + readiness under training / interview levers
 * using a transparent linear sensitivity model. Pure frontend, no LLM, no backend change.
 */
const clamp = (v, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));

export default function WhatIfSimulator() {
  const [base, setBase] = useState(null);
  const [err, setErr] = useState(false);
  const [training, setTraining] = useState(0);   // +% training completion
  const [interview, setInterview] = useState(0); // +% interview / CRT readiness

  useEffect(() => {
    let alive = true;
    api.get("/placements/overview")
      .then(({ data }) => { if (alive) setBase(data); })
      .catch(() => { if (alive) setErr(true); });
    return () => { alive = false; };
  }, []);

  const model = useMemo(() => {
    const total = base?.students_total || 0;
    const placed = base?.students_placed || 0;
    const baseRate = total ? (placed / total) * 100 : 0;
    const baseReadiness = base?.readiness?.avg_readiness ?? 0;
    // Sensitivity: +1% training -> +0.35 pts placement rate; +1% interview -> +0.25 pts.
    const projRate = clamp(baseRate + training * 0.35 + interview * 0.25);
    const projReadiness = clamp(baseReadiness + training * 0.30 + interview * 0.45);
    const projPlaced = Math.round(total * (projRate / 100));
    return {
      total, placed, baseRate, baseReadiness,
      projRate, projPlaced, projReadiness,
      deltaPlaced: projPlaced - placed,
      deltaReadiness: Math.round(projReadiness - baseReadiness),
    };
  }, [base, training, interview]);

  if (err || !base) return null;

  const Lever = ({ label, value, setValue }) => (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="font-display tracking-tight">{label}</span>
        <span className="font-mono text-[11px] text-accent tnum">+{value}%</span>
      </div>
      <input
        type="range" min="0" max="30" step="1" value={value}
        onChange={(e) => setValue(Number(e.target.value))}
        className="w-full mt-2 accent-accent cursor-pointer"
      />
    </div>
  );

  return (
    <div className="editorial p-8 h-full" data-testid="what-if-simulator">
      <div className="flex items-center gap-2 font-mono text-[10px] tracking-[0.24em] text-ink-400">
        <SlidersHorizontal size={12} /> WHAT-IF SIMULATOR
      </div>
      <h3 className="font-display text-2xl tracking-tight mt-1">Model an intervention</h3>

      <div className="mt-6 space-y-5">
        <Lever label="Training completion" value={training} setValue={setTraining} />
        <Lever label="Interview / CRT readiness" value={interview} setValue={setInterview} />
      </div>

      <div className="border-t border-line my-6" />

      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="font-mono text-[10px] tracking-[0.2em] text-ink-400">EXPECTED PLACEMENTS</div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="font-display text-3xl tnum text-ink-400">{model.placed}</span>
            <ArrowRight size={16} className="text-accent" />
            <span className="font-display text-5xl tracking-tightest tnum">{model.projPlaced}</span>
          </div>
          <div className="text-xs text-ink-500 mt-1">
            {model.deltaPlaced >= 0 ? "+" : ""}{model.deltaPlaced} students · {Math.round(model.projRate)}% rate
          </div>
        </div>
        <div>
          <div className="font-mono text-[10px] tracking-[0.2em] text-ink-400">READINESS AVG</div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="font-display text-3xl tnum text-ink-400">{Math.round(model.baseReadiness)}</span>
            <ArrowRight size={16} className="text-accent" />
            <span className="font-display text-5xl tracking-tightest tnum">{Math.round(model.projReadiness)}</span>
          </div>
          <div className="text-xs text-ink-500 mt-1">
            {model.deltaReadiness >= 0 ? "+" : ""}{model.deltaReadiness} pts / 100
          </div>
        </div>
      </div>

      {training === 0 && interview === 0 && (
        <div className="text-xs text-ink-400 mt-5">Drag a lever to project the impact on placements.</div>
      )}
    </div>
  );
}
