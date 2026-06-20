import React, { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../App";
import { DollarSign, TrendingUp, Award, CreditCard, FileText } from "lucide-react";

export default function Revenue() {
  useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/revenue/me")
      .then(({ data }) => setData(data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="font-mono text-xs text-ink-400 p-8">LOADING…</div>;

  const records = data?.records || [];
  const terms = data?.mou_terms || {};
  const totalAccrued = data?.total_accrued_inr || 0;
  const expected = data?.expected_inr || 0;
  const revenueScore = data?.revenue_score || 0;
  const payoutStatus = data?.payout_status || "—";

  const formatINR = (val) => `₹${(val / 100000).toFixed(2)}L`;

  return (
    <div className="space-y-10">
      {/* Header */}
      <div>
        <div className="font-mono text-[10px] tracking-[0.28em] text-ink-400">§ REVENUE</div>
        <h1 className="font-display text-5xl md:text-6xl tracking-tightest mt-3" data-testid="revenue-heading">
          Partnership <span className="text-accent">Revenue</span>
        </h1>
        <p className="font-serif text-lg text-ink-500 mt-2 max-w-xl">Revenue share tracking across partnership agreements.</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-12 gap-3" data-testid="revenue-kpi">
        {[
          { label: "TOTAL ACCRUED", value: formatINR(totalAccrued), accent: true, icon: DollarSign },
          { label: "EXPECTED", value: formatINR(expected), accent: false, icon: TrendingUp },
          { label: "REVENUE SCORE", value: revenueScore, accent: false, icon: Award },
          { label: "PAYOUT STATUS", value: payoutStatus, accent: false, icon: CreditCard },
        ].map((card) => (
          <div key={card.label} className="col-span-12 md:col-span-3 editorial p-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-mono text-[10px] tracking-[0.24em] text-ink-400">{card.label}</div>
                <div className={`font-display text-4xl tracking-tightest mt-3 tnum ${card.accent ? "text-accent" : ""}`}>
                  {card.value}
                </div>
              </div>
              <card.icon size={20} className="text-ink-300" />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-3">
        {/* Revenue records table */}
        <div className="col-span-12 lg:col-span-8 border border-line bg-bone-50" data-testid="revenue-table">
          <div className="p-6 border-b border-line">
            <div className="font-mono text-[10px] tracking-[0.24em] text-ink-400">REVENUE RECORDS / {records.length}</div>
            <h3 className="font-display text-2xl tracking-tight mt-1">Transaction history</h3>
          </div>
          <div className="grid grid-cols-12 px-6 py-3 border-b border-line font-mono text-[10px] tracking-[0.2em] text-ink-400">
            <div className="col-span-3">PERIOD</div>
            <div className="col-span-3">AMOUNT</div>
            <div className="col-span-3">TYPE</div>
            <div className="col-span-3 text-right">DATE</div>
          </div>
          <div className="max-h-[420px] overflow-y-auto divide-y divide-line">
            {records.map((r, i) => (
              <div key={r.record_id || i} className="grid grid-cols-12 px-6 py-3 items-center text-sm hover:bg-bone-100 transition-colors" data-testid={`revenue-row-${i}`}>
                <div className="col-span-3 font-medium">{r.period || "—"}</div>
                <div className="col-span-3 font-display text-xl text-accent tnum">{formatINR(r.amount_inr || 0)}</div>
                <div className="col-span-3">
                  <span className="font-mono text-[10px] tracking-[0.2em] px-2 py-0.5 border border-line">
                    {(r.type || "—").toUpperCase()}
                  </span>
                </div>
                <div className="col-span-3 text-right font-mono text-xs">{r.date?.slice(0, 10) || "—"}</div>
              </div>
            ))}
            {records.length === 0 && <div className="p-12 text-center text-ink-400">No revenue records found.</div>}
          </div>
        </div>

        {/* MOU revenue terms */}
        <div className="col-span-12 lg:col-span-4 editorial bg-ink-900 text-bone-100 p-8" data-testid="revenue-terms">
          <div className="flex items-center gap-3">
            <FileText size={20} className="text-accent" />
            <div className="font-mono text-[10px] tracking-[0.24em] text-bone-100/60">MOU REVENUE TERMS</div>
          </div>
          <div className="hairline my-6 border-bone-100/30" />
          <div className="space-y-5">
            {[
              { label: "PARTNERSHIP TYPE", value: terms.partnership_type || "—" },
              { label: "REVENUE SHARE %", value: terms.revenue_share_pct != null ? `${terms.revenue_share_pct}%` : "—" },
              { label: "BILLING CYCLE", value: terms.billing_cycle || "—" },
              { label: "CONTRACT PERIOD", value: terms.contract_period || "—" },
              { label: "MIN GUARANTEE", value: terms.min_guarantee_inr ? formatINR(terms.min_guarantee_inr) : "—" },
            ].map((item) => (
              <div key={item.label}>
                <div className="font-mono text-[10px] tracking-[0.24em] text-bone-100/60">{item.label}</div>
                <div className="font-display text-xl mt-1">{item.value}</div>
              </div>
            ))}
          </div>
          <div className="hairline my-6 border-bone-100/30" />
          <div className="font-serif text-sm text-bone-100/70">
            Revenue terms are governed by the active MOU. Contact your partnership manager for amendments.
          </div>
        </div>
      </div>
    </div>
  );
}
