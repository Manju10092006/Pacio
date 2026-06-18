import React, { useEffect, useState } from "react";
import { api } from "../lib/api";
import { CheckCircle2, Circle, Plus, Minus } from "lucide-react";

export default function StudentDSA() {
  const [d, setD] = useState(null);

  const load = async () => {
    const [{ data: dashboard }, { data: questionProgress }] = await Promise.all([
      api.get("/me/dashboard"),
      api.get("/me/dsa/questions"),
    ]);
    setD({ ...dashboard, dsa_question_progress: questionProgress });
  };
  useEffect(() => { load(); }, []);

  const adjust = async (topic_code, delta) => {
    try {
      await api.post("/me/dsa/toggle", { topic_code, delta });
      load();
    } catch {}
  };

  const toggleQuestion = async (question) => {
    try {
      await api.patch(`/me/dsa/questions/${question.question_id}`, {
        solved: !question.solved,
        attempted: true,
        mastery: question.solved ? Math.min(question.mastery || 35, 50) : Math.max(question.mastery || 0, 85),
      });
      load();
    } catch {}
  };

  if (!d) return <div className="font-mono text-xs text-ink-400">LOADING…</div>;
  const solved = d.dsa.reduce((a, t) => a + t.solved, 0);
  const pct = Math.round((solved / d.dsa_total) * 100);

  return (
    <div className="space-y-10">
      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-12 md:col-span-8 editorial p-10">
          <div className="font-mono text-[10px] tracking-[0.28em] text-ink-400">§ DSA · STRIVER A2Z</div>
          <h1 className="font-display text-5xl md:text-6xl tracking-tightest mt-3" data-testid="sdsa-heading">
            Your <span className="text-accent">solve sheet.</span>
          </h1>
          <p className="font-serif text-lg text-ink-500 mt-2 max-w-xl">
            Click + as you solve each problem. CareerOS updates your readiness in real time.
          </p>
        </div>
        <div className="col-span-12 md:col-span-4 editorial bg-ink-900 text-bone-100 p-10">
          <div className="font-mono text-[10px] tracking-[0.28em] text-bone-100/40">TOTAL · SOLVED</div>
          <div className="font-display text-[8vw] md:text-[6vw] tracking-tightest leading-[0.9] tnum">{solved}</div>
          <div className="text-bone-100/60 text-sm">/ {d.dsa_total} problems · {pct}%</div>
          <div className="mt-4 h-2 bg-bone-100/10 relative">
            <div className="absolute inset-y-0 left-0 bg-accent" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-3" data-testid="sdsa-topics">
        {d.dsa.map((t) => {
          const p = Math.round((t.solved / t.total) * 100);
          const topicDetail = d.dsa_question_progress?.topics?.find((row) => row.topic_code === t.topic_code);
          const questions = topicDetail?.questions || [];
          return (
            <div key={t.topic_code} className="col-span-12 md:col-span-6 lg:col-span-4 editorial p-6" data-testid={`sdsa-${t.topic_code}`}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-mono text-[10px] tracking-[0.2em] text-ink-400">{t.topic_code}</div>
                  <div className="font-display text-xl tracking-tight mt-1">{t.topic_name}</div>
                </div>
                <div className="font-display text-3xl tnum">{p}%</div>
              </div>
              <div className="mt-4 h-1.5 bg-bone-300 relative">
                <div className="absolute inset-y-0 left-0" style={{ width: `${p}%`, background: p >= 80 ? "#0a0a0a" : p >= 40 ? "#d4a017" : "#ff3b00" }} />
              </div>
              <div className="mt-5 flex items-center justify-between">
                <div className="font-mono text-sm tnum">{t.solved}<span className="text-ink-400">/{t.total}</span></div>
                <div className="flex items-center gap-1">
                  <button onClick={() => adjust(t.topic_code, -1)} data-testid={`sdsa-minus-${t.topic_code}`} className="w-9 h-9 border border-line bg-bone-50 hover:bg-ink-900 hover:text-bone-100 transition-colors grid place-items-center">
                    <Minus size={14} />
                  </button>
                  <button onClick={() => adjust(t.topic_code, 1)} data-testid={`sdsa-plus-${t.topic_code}`} className="w-9 h-9 bg-ink-900 text-bone-100 hover:bg-accent transition-colors grid place-items-center">
                    <Plus size={14} />
                  </button>
                </div>
              </div>
              <div className="mt-5 border-t border-line pt-4">
                <div className="flex items-center justify-between">
                  <div className="font-mono text-[10px] tracking-[0.18em] text-ink-400">QUESTION QUEUE</div>
                  <div className="font-mono text-[10px] text-ink-500 tnum">{topicDetail?.attempted || 0} attempted</div>
                </div>
                <div className="mt-3 max-h-64 overflow-y-auto pr-1 space-y-1" data-testid={`sdsa-questions-${t.topic_code}`}>
                  {questions.map((question) => (
                    <button
                      key={question.question_id}
                      onClick={() => toggleQuestion(question)}
                      className="w-full grid grid-cols-[20px_1fr_auto] gap-2 items-center text-left px-2 py-2 border border-transparent hover:border-line hover:bg-bone-100 transition-colors"
                      data-testid={`sdsa-question-${question.question_id}`}
                    >
                      {question.solved ? <CheckCircle2 size={16} className="text-accent" /> : <Circle size={16} className="text-ink-300" />}
                      <span className={`text-sm leading-snug ${question.solved ? "text-ink-900" : "text-ink-500"}`}>{question.title}</span>
                      <span className="font-mono text-[10px] text-ink-400">{question.difficulty}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
