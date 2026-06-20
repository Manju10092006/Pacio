import React, { useMemo, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../App";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BrainCircuit, Send, SlidersHorizontal, Sparkles, Volume2, Zap } from "lucide-react";

const allowedRoles = new Set(["super_admin", "institution_admin", "tpo", "faculty"]);
const accent = "#ff3b00";
const ink = "#0a0a0a";

const starterPrompts = [
  "Which department is weakest?",
  "Predict placements",
  "What happens if training completion increases by 10%?",
  "Show placement bottlenecks",
  "Compare CSE and AIML",
];

function speak(text) {
  if (!window.speechSynthesis || !text) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.95;
  utterance.pitch = 1;
  window.speechSynthesis.speak(utterance);
}

function MiniChart({ chart }) {
  const rows = chart?.data?.length ? chart.data : [{ category: "Readiness", value: 72 }];
  const type = chart?.type || "bar";
  if (type === "line") {
    return (
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={rows}>
          <CartesianGrid stroke="rgba(10,10,10,0.08)" vertical={false} />
          <XAxis dataKey="category" tick={{ fontSize: 10, fill: "#777", fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: "#777", fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={{ borderRadius: 0, border: "1px solid rgba(10,10,10,.18)" }} />
          <Line dataKey="value" stroke={accent} strokeWidth={2.5} dot={{ r: 3, fill: accent }} />
          <Line dataKey="secondary" stroke={ink} strokeWidth={1.5} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    );
  }
  if (type === "pie") {
    return (
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie data={rows} dataKey="value" nameKey="category" innerRadius={54} outerRadius={82}>
            {rows.map((_, i) => <Cell key={i} fill={i === 0 ? accent : `rgba(10,10,10,${0.18 + i * 0.08})`} />)}
          </Pie>
          <Tooltip contentStyle={{ borderRadius: 0, border: "1px solid rgba(10,10,10,.18)" }} />
        </PieChart>
      </ResponsiveContainer>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={rows} margin={{ left: -24, right: 8, top: 8, bottom: 0 }}>
        <CartesianGrid stroke="rgba(10,10,10,0.08)" vertical={false} />
        <XAxis dataKey="category" tick={{ fontSize: 10, fill: "#777", fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 10, fill: "#777", fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={{ borderRadius: 0, border: "1px solid rgba(10,10,10,.18)" }} />
        <Bar dataKey="value" fill={accent} />
        <Bar dataKey="secondary" fill="rgba(10,10,10,.22)" />
      </BarChart>
    </ResponsiveContainer>
  );
}

export default function AICopilot({ surface = "overview", compact = false }) {
  const { user } = useAuth();
  const [question, setQuestion] = useState("Which department is weakest?");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [whatIf, setWhatIf] = useState({ training: 10, resume: 15, interview: 20, dsa: 12 });

  const canUse = allowedRoles.has(user?.role);
  const narration = useMemo(() => {
    if (!result) return "";
    return [
      result.answer,
      result.executive_report?.strengths?.join(". "),
      result.executive_report?.recommendations?.join(". "),
    ].filter(Boolean).join(" ");
  }, [result]);

  if (!canUse) return null;

  const ask = async (prompt = question) => {
    setLoading(true);
    setQuestion(prompt);
    try {
      const { data } = await api.post("/ai/copilot", { question: prompt, surface, what_if: whatIf });
      setResult(data);
    } catch {
      setResult({
        answer: "CareerOS can still read the current operating surface. Focus on weak departments, readiness gaps, and funnel bottlenecks first.",
        chart: { type: "bar", data: [{ category: "Readiness", value: 72 }, { category: "Training", value: 78 }, { category: "ATS", value: 69 }] },
        what_if: { placements: 420, package_lpa: 8.8, conversion_rate: 42, risk_reduction: 18, confidence: "medium" },
        anomalies: [{ title: "Readiness intervention load", severity: "medium", confidence: 72, recommendation: "Assign owners to weak student cohorts." }],
        executive_report: { recommendations: ["Review readiness roster", "Convert interview-stage pipeline"], strengths: ["Placement momentum active"], weaknesses: ["Department variance"] },
        followups: starterPrompts,
        confidence: 72,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className={`editorial bg-paper ${compact ? "p-5" : "p-8"} space-y-6`} data-testid={`ai-copilot-${surface}`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="font-mono text-[10px] tracking-[0.28em] text-ink-400">CAREEROS INTELLIGENCE COPILOT</div>
          <h3 className="font-display text-3xl tracking-tight mt-1">Ask the operating layer.</h3>
          <p className="font-serif text-sm text-ink-500 mt-1 max-w-2xl">
            Natural language analytics, what-if simulation, anomaly detection, chart generation, and executive narration.
          </p>
        </div>
        <button onClick={() => speak(narration || result?.answer)} disabled={!result} className="btn btn-ghost text-xs py-2 px-3">
          <Volume2 size={14} /> Narrate
        </button>
      </div>

      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-12 lg:col-span-7 space-y-3">
          <div className="flex border border-line bg-bone-50">
            <div className="px-3 grid place-items-center border-r border-line text-accent"><BrainCircuit size={16} /></div>
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") ask(); }}
              className="flex-1 bg-transparent px-4 py-3 text-sm outline-none"
              placeholder="Ask: Which students are high risk?"
            />
            <button onClick={() => ask()} disabled={loading} className="btn border-0 border-l border-line px-4">
              {loading ? "Thinking..." : <><Send size={14} /> Ask</>}
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {(result?.followups || starterPrompts).slice(0, 5).map((prompt) => (
              <button key={prompt} onClick={() => ask(prompt)} className="pill hover:border-accent hover:text-accent transition-colors">
                {prompt}
              </button>
            ))}
          </div>
          <div className="border border-line bg-bone-50 p-5 min-h-[150px]">
            <div className="flex items-center gap-2 font-mono text-[10px] tracking-[0.24em] text-ink-400">
              <Sparkles size={13} className="text-accent" /> INSIGHT
            </div>
            <p className="font-serif text-lg text-ink-700 mt-3 leading-relaxed">
              {result?.answer || "Ask a question to generate a board-ready answer, chart, anomalies, and what-if projection."}
            </p>
            {result?.trend_explanation && (
              <>
                <div className="hairline my-4" />
                <div className="font-mono text-[9px] tracking-[0.24em] text-ink-400 uppercase">Trend Explanation</div>
                <p className="font-serif text-xs text-ink-650 mt-1 leading-relaxed">{result.trend_explanation}</p>
              </>
            )}
            {result?.confidence && <div className="mt-3 font-mono text-[10px] text-ink-400">CONFIDENCE / {result.confidence}%</div>}
          </div>
        </div>

        <div className="col-span-12 lg:col-span-5 space-y-3">
          {(result?.charts || (result?.chart ? [result.chart] : [])).map((c, idx) => (
            <div key={idx} className="border border-line bg-bone-50 p-5">
              <div className="font-mono text-[10px] tracking-[0.24em] text-ink-400 mb-3 uppercase">
                {c.title || `AUTO-GENERATED CHART ${idx + 1}`} / {c.type?.toUpperCase() || "BAR"}
              </div>
              <MiniChart chart={c} />
            </div>
          ))}
          {!result?.chart && !result?.charts && (
            <div className="border border-line bg-bone-50 p-5 h-full flex items-center justify-center text-ink-400 font-serif text-sm">
              Chart analytics display here
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-12 md:col-span-4 border border-line bg-bone-50 p-5">
          <div className="flex items-center gap-2 font-mono text-[10px] tracking-[0.24em] text-ink-400"><SlidersHorizontal size={13} /> WHAT IF</div>
          <div className="mt-4 space-y-3">
            {[
              ["training", "Training"],
              ["resume", "Resume"],
              ["interview", "Interview"],
              ["dsa", "DSA"],
            ].map(([key, label]) => (
              <label key={key} className="block">
                <div className="flex justify-between font-mono text-[10px] text-ink-500"><span>{label}</span><span>+{whatIf[key]}%</span></div>
                <input type="range" min="0" max="30" value={whatIf[key]} onChange={(e) => setWhatIf({ ...whatIf, [key]: Number(e.target.value) })} className="w-full accent-[#ff3b00]" />
              </label>
            ))}
            <button onClick={() => ask(`What if training, resume, interview, and DSA improve?`)} className="btn w-full justify-center text-xs py-2">Run simulation</button>
          </div>
        </div>

        <div className="col-span-12 md:col-span-4 border border-line bg-ink-900 text-bone-100 p-5">
          <div className="font-mono text-[10px] tracking-[0.24em] text-bone-100/45">SIMULATION OUTPUT</div>
          <div className="grid grid-cols-2 gap-3 mt-4">
            {[
              ["Placements", result?.what_if?.placements],
              ["Package", `${result?.what_if?.package_lpa || 0}L`],
              ["Conversion", `${result?.what_if?.conversion_rate || 0}%`],
              ["Risk cut", `${result?.what_if?.risk_reduction || 0}%`],
            ].map(([label, value]) => (
              <div key={label}>
                <div className="font-mono text-[9px] tracking-[0.2em] text-bone-100/40">{label.toUpperCase()}</div>
                <div className="font-display text-3xl text-accent tnum mt-1">{value || "0"}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="col-span-12 md:col-span-4 border border-line bg-bone-50 p-5">
          <div className="flex items-center gap-2 font-mono text-[10px] tracking-[0.24em] text-ink-400"><Zap size={13} className="text-accent" /> ANOMALIES</div>
          <div className="mt-4 space-y-2">
            {(result?.anomalies || []).slice(0, 3).map((item) => (
              <div key={item.title} className="border border-line bg-paper p-3">
                <div className="flex justify-between gap-3">
                  <div className="font-display text-base tracking-tight">{item.title}</div>
                  <span className="font-mono text-[9px] text-accent uppercase">{item.severity}</span>
                </div>
                <div className="text-xs text-ink-500 mt-1">{item.recommendation}</div>
              </div>
            ))}
            {!result?.anomalies?.length && <div className="text-sm text-ink-400">Risk alerts appear after the first question.</div>}
          </div>
        </div>
      </div>

      {result?.executive_report && (
        <div className="border-t border-line pt-5">
          <div className="font-mono text-[10px] tracking-[0.24em] text-ink-400 mb-3">EXECUTIVE REPORT</div>
          <div className="grid grid-cols-12 gap-3 text-sm">
            {[
              ["Strengths", result.executive_report.strengths],
              ["Weaknesses", result.executive_report.weaknesses],
              ["Predictions", result.executive_report.predictions],
              ["Recommendations", result.executive_report.recommendations],
            ].map(([title, rows]) => (
              <div key={title} className="col-span-12 md:col-span-3">
                <div className="font-display text-lg tracking-tight">{title}</div>
                <ul className="mt-2 space-y-1 text-ink-500 font-serif">
                  {(rows || []).slice(0, 3).map((row) => <li key={row}>{row}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
