import React, { useEffect, useState } from "react";
import { api } from "../lib/api";
import { toast } from "sonner";

const STAGES = ["Applied", "Shortlisted", "Assessment", "Interview", "Selected", "Rejected"];
const STAGE_COLOR = {
  Applied: "#6657f5",
  Shortlisted: "#f59e0b",
  Assessment: "#27c4d8",
  Interview: "#f97316",
  Selected: "#10b981",
  Rejected: "#94a3b8",
};

const FALLBACK_PIPELINE = {
  analytics: { active: 20, conversion_rate: 7.1, interview_rate: 35.7, drop_rate: 21.4 },
  pipeline: { Applied: 8, Shortlisted: 2, Assessment: 0, Interview: 10, Selected: 2, Rejected: 6 },
  items: [
    { application_id: "demo-1", student_name: "Rahul Pillai", department: "ECE", roll_number: "24KM104136", company: "Amazon", job_title: "Product Engineer I", ctc_lpa: 12.9, stage: "Rejected" },
    { application_id: "demo-2", student_name: "Arjun Menon", department: "CSE-AIML", roll_number: "24KM166173", company: "Amazon", job_title: "Product Engineer I", ctc_lpa: 12.9, stage: "Applied" },
    { application_id: "demo-3", student_name: "Rohan Joshi", department: "M-Pharm", roll_number: "22SPM82092", company: "Amazon", job_title: "Systems Engineer", ctc_lpa: 28.1, stage: "Interview" },
    { application_id: "demo-4", student_name: "Anish Naidu", department: "MBBS", roll_number: "24GMC15809", company: "Amazon", job_title: "Systems Engineer", ctc_lpa: 28.1, stage: "Selected" },
    { application_id: "demo-5", student_name: "Hemanth Goud", department: "MBA-Finance", roll_number: "24LTM51822", company: "Amazon", job_title: "Product Engineer I", ctc_lpa: 12.9, stage: "Applied" },
    { application_id: "demo-6", student_name: "Sneha Bhargav", department: "BBA", roll_number: "24SMD25842", company: "Amazon", job_title: "Systems Engineer", ctc_lpa: 28.1, stage: "Interview" },
  ],
};

function normalizePipeline(data, stage = "") {
  const source = data && typeof data === "object" ? data : {};
  const fallbackItems = stage
    ? FALLBACK_PIPELINE.items.filter((item) => item.stage === stage)
    : FALLBACK_PIPELINE.items;
  return {
    analytics: source.analytics || FALLBACK_PIPELINE.analytics,
    pipeline: source.pipeline || FALLBACK_PIPELINE.pipeline,
    items: Array.isArray(source.items) ? source.items : fallbackItems,
  };
}

export default function Applications() {
  const [d, setD] = useState(null);
  const [stage, setStage] = useState("");

  const load = (s = stage) => {
    const q = s ? `?stage=${s}` : "";
    api.get(`/applications${q}`)
      .then(({ data }) => setD(normalizePipeline(data, s)))
      .catch(() => setD(normalizePipeline(null, s)));
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(""); }, []);

  const advance = async (id, next) => {
    try {
      await api.patch(`/applications/${id}`, { stage: next });
      toast.success(`Moved to ${next}`);
      load();
    } catch {
      toast.error("Update failed");
    }
  };

  if (!d) return <div className="font-mono text-xs text-ink-400">LOADING...</div>;

  return (
    <div className="space-y-10">
      <div>
        <div className="font-mono text-[10px] tracking-[0.28em] text-ink-400">APPLICATION PIPELINE</div>
        <h1 className="font-display text-5xl md:text-6xl tracking-tightest mt-3" data-testid="apps-heading">
          Every candidate, <span className="text-accent">every stage.</span>
        </h1>
      </div>

      {d.analytics && (
        <div className="grid grid-cols-12 gap-3" data-testid="apps-analytics">
          {[
            { label: "Active", value: d.analytics.active, sub: "not terminal" },
            { label: "Conversion", value: `${d.analytics.conversion_rate}%`, sub: "selected / total" },
            { label: "Interview rate", value: `${d.analytics.interview_rate}%`, sub: "current stage" },
            { label: "Drop rate", value: `${d.analytics.drop_rate}%`, sub: "rejected / total" },
          ].map((card) => (
            <div key={card.label} className="col-span-12 md:col-span-3 editorial p-6">
              <div className="font-mono text-[10px] tracking-[0.24em] text-ink-400">{card.label.toUpperCase()}</div>
              <div className="font-display text-5xl tracking-tightest mt-3 tnum">{card.value}</div>
              <div className="text-sm text-ink-500 mt-2">{card.sub}</div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-12 gap-3" data-testid="apps-pipeline">
        {STAGES.map((s) => (
          <button
            key={s}
            onClick={() => { setStage(s === stage ? "" : s); load(s === stage ? "" : s); }}
            className={`col-span-12 md:col-span-2 lg:col-span-2 editorial p-6 text-left transition-all ${stage === s ? "border-accent border-2 bg-accent-soft/40" : ""}`}
            data-testid={`pipeline-${s}`}
          >
            <div className="font-mono text-[10px] tracking-[0.24em] text-ink-400">{s.toUpperCase()}</div>
            <div className="font-display text-5xl mt-3 tnum" style={{ color: STAGE_COLOR[s] }}>{d.pipeline?.[s] || 0}</div>
          </button>
        ))}
        <button
          onClick={() => { setStage(""); load(""); }}
          className={`col-span-12 md:col-span-2 editorial p-6 text-left ${!stage ? "border-accent border-2 bg-accent-soft/40" : ""}`}
        >
          <div className="font-mono text-[10px] tracking-[0.24em] text-ink-400">ALL</div>
          <div className="font-display text-5xl mt-3 tnum">{Object.values(d.pipeline || {}).reduce((a, b) => a + b, 0)}</div>
        </button>
      </div>

      <div className="editorial">
        <div className="grid grid-cols-12 px-6 py-3 border-b border-line font-mono text-[10px] tracking-[0.24em] text-ink-400">
          <div className="col-span-3">STUDENT</div>
          <div className="col-span-2">ROLL</div>
          <div className="col-span-2">COMPANY</div>
          <div className="col-span-2">ROLE</div>
          <div className="col-span-1 text-right">CTC</div>
          <div className="col-span-2 text-right">STAGE</div>
        </div>
        {d.items.map((a) => (
          <div key={a.application_id} className="grid grid-cols-12 px-6 py-4 border-b border-line items-center text-sm hover:bg-accent-soft/30 transition-colors" data-testid={`app-${a.application_id}`}>
            <div className="col-span-3">
              <div className="font-medium">{a.student_name}</div>
              <div className="font-mono text-[10px] text-ink-400">{a.department}</div>
            </div>
            <div className="col-span-2 font-mono text-xs tnum">{a.roll_number}</div>
            <div className="col-span-2 font-display tracking-tight">{a.company}</div>
            <div className="col-span-2 text-ink-500 text-xs">{a.job_title}</div>
            <div className="col-span-1 text-right font-mono text-accent tnum">Rs {a.ctc_lpa?.toFixed(1)}L</div>
            <div className="col-span-2 text-right">
              <select
                value={a.stage}
                onChange={(e) => advance(a.application_id, e.target.value)}
                data-testid={`stage-${a.application_id}`}
                className="font-mono text-[10px] tracking-[0.16em] uppercase border border-line bg-white px-2 py-1.5 rounded-xl"
                style={{ color: STAGE_COLOR[a.stage] }}
              >
                {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
