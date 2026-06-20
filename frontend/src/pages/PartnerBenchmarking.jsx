import React, { useEffect, useState } from "react";
import { api } from "../lib/api";
import { BarChart3, Trophy } from "lucide-react";

const METRICS = [
  ["placement_rate", "Placement rate"],
  ["avg_readiness", "Readiness"],
  ["training_completion", "Training"],
  ["health_score", "Health"],
];

export default function PartnerBenchmarking() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/benchmarking/partner")
      .then(({ data }) => setData(data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="font-mono text-xs text-ink-400 p-8">LOADING...</div>;
  if (!data?.self) return <div className="editorial p-8 text-ink-500">Benchmarking data is not available yet.</div>;

  const self = data.self;

  return (
    <div className="space-y-10">
      <div>
        <div className="font-mono text-[10px] tracking-[0.28em] text-ink-400">§ PARTNER BENCHMARKING</div>
        <h1 className="font-display text-5xl md:text-6xl tracking-tightest mt-3" data-testid="benchmark-heading">
          Know your rank, <span className="text-accent">then move it.</span>
        </h1>
        <p className="font-serif text-lg text-ink-500 mt-2 max-w-xl">
          Compare placement, readiness, training, and health signals against partner averages and top performers.
        </p>
      </div>

      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-12 md:col-span-7 editorial p-8">
          <div className="font-mono text-[10px] tracking-[0.24em] text-ink-400">YOUR POSITION</div>
          <div className="flex items-end gap-6 mt-4">
            <div className="font-display text-[120px] leading-none tracking-tightest text-accent tnum">#{self.rank}</div>
            <div className="pb-5">
              <div className="font-display text-3xl tracking-tight">{self.short_name}</div>
              <div className="font-serif text-ink-500 mt-1">{data.insight}</div>
              <div className="font-mono text-[10px] tracking-[0.2em] text-ink-400 mt-3">PERCENTILE {self.percentile}</div>
            </div>
          </div>
        </div>
        <div className="col-span-12 md:col-span-5 editorial bg-ink-900 text-bone-100 p-8">
          <Trophy className="text-accent" size={28} />
          <div className="font-display text-3xl tracking-tight mt-5">Top band target</div>
          <div className="font-serif text-bone-100/70 mt-2">
            The top partner band averages {data.top_band.health_score}% health and {data.top_band.placement_rate}% placement rate.
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-3">
        {METRICS.map(([key, label]) => {
          const selfValue = Number(self[key] || 0);
          const average = Number(data.averages?.[key] || 0);
          const top = Number(data.top_band?.[key] || 0);
          const max = Math.max(100, selfValue, average, top);
          return (
            <div key={key} className="col-span-12 md:col-span-6 editorial p-6" data-testid={`benchmark-${key}`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-mono text-[10px] tracking-[0.24em] text-ink-400">{label.toUpperCase()}</div>
                  <div className="font-display text-4xl tracking-tightest mt-2 tnum">{selfValue}%</div>
                </div>
                <BarChart3 size={20} className="text-accent" />
              </div>
              <div className="space-y-3 mt-6">
                {[
                  ["CareerOS", selfValue, "bg-accent"],
                  ["Partner avg", average, "bg-ink-300"],
                  ["Top band", top, "bg-ink-900"],
                ].map(([name, value, color]) => (
                  <div key={name}>
                    <div className="flex justify-between font-mono text-[10px] tracking-[0.18em] text-ink-400 mb-1">
                      <span>{name}</span><span>{value}%</span>
                    </div>
                    <div className="h-2 bg-bone-300">
                      <div className={`h-full ${color}`} style={{ width: `${Math.min(100, (Number(value) / max) * 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="border border-line bg-bone-50">
        <div className="grid grid-cols-12 px-6 py-3 border-b border-line font-mono text-[10px] tracking-[0.2em] text-ink-400">
          <div className="col-span-1">RANK</div>
          <div className="col-span-4">INSTITUTION</div>
          <div className="col-span-2">HEALTH</div>
          <div className="col-span-2">PLACEMENT</div>
          <div className="col-span-2">READINESS</div>
          <div className="col-span-1">SEATS</div>
        </div>
        {(data.leaderboard || []).map((row, i) => (
          <div key={row.institution_id} className="grid grid-cols-12 px-6 py-4 border-b border-line text-sm items-center">
            <div className="col-span-1 font-display text-xl tnum">{i + 1}</div>
            <div className="col-span-4 font-medium">{row.short_name}</div>
            <div className="col-span-2 font-mono text-xs tnum">{row.health_score}%</div>
            <div className="col-span-2 font-mono text-xs tnum">{row.placement_rate}%</div>
            <div className="col-span-2 font-mono text-xs tnum">{row.avg_readiness}%</div>
            <div className="col-span-1 font-mono text-xs tnum">{row.seats_used}/{row.seats_purchased}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
