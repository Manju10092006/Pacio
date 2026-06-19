import React, { useEffect, useState } from "react";
import { api } from "../lib/api";

export default function StudentAptitude() {
  const [d, setD] = useState(null);
  const [activeSection, setActiveSection] = useState(null);
  const load = () => api.get("/me/aptitude/questions").then(({ data }) => setD(data)).catch(() => setD({ sections: [], overall: {} }));
  useEffect(() => { load(); }, []);
  if (!d) return <div className="font-mono text-xs text-ink-400">LOADING APTITUDE...</div>;

  const overall = d.overall || {};
  const sections = d.sections || [];
  const activeQuestions = activeSection
    ? (d.questions || []).filter(q => q.section_code === activeSection)
    : [];

  const toggleQuestion = async (qid, solved) => {
    try {
      await api.patch(`/me/aptitude/questions/${qid}`, { solved: !solved });
      load();
    } catch {}
  };

  return (
    <div className="space-y-10">
      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-12 md:col-span-8 editorial p-10">
          <div className="font-mono text-[10px] tracking-[0.28em] text-ink-400">YOUR APTITUDE TRACKER</div>
          <h1 className="font-display text-5xl md:text-6xl tracking-tightest mt-3">Speed. Accuracy. Mastery.</h1>
          <p className="font-serif text-lg text-ink-500 mt-2 max-w-xl">Track your performance across quantitative, reasoning, verbal, and data interpretation sections.</p>
        </div>
        <div className="col-span-12 md:col-span-4 editorial bg-ink-900 text-bone-100 p-10">
          <div className="font-mono text-[10px] tracking-[0.28em] text-bone-100/40">OVERALL SCORE</div>
          <div className="font-display text-[8vw] md:text-[6vw] tracking-tightest leading-[0.9] tnum text-accent">{overall.score || 0}%</div>
          <div className="text-bone-100/60 text-sm">{overall.solved || 0} / {overall.total || 0} questions solved</div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-3">
        {[
          { label: "Questions Solved", value: overall.solved || 0, sub: `of ${overall.total || 0} total` },
          { label: "Accuracy", value: `${overall.accuracy || 0}%`, sub: "correct rate" },
          { label: "Avg Speed", value: `${overall.avg_time || 0}s`, sub: "per question" },
          { label: "Mastery", value: `${overall.mastery || 0}%`, sub: "weighted score" },
        ].map(card => (
          <div key={card.label} className="col-span-12 md:col-span-3 editorial p-6">
            <div className="font-mono text-[10px] tracking-[0.24em] text-ink-400">{card.label.toUpperCase()}</div>
            <div className="font-display text-5xl tracking-tightest mt-3 tnum">{card.value}</div>
            <div className="text-sm text-ink-500 mt-2">{card.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-3">
        {sections.map(sec => (
          <div
            key={sec.section_code}
            className={`col-span-12 md:col-span-6 editorial p-8 cursor-pointer transition-colors ${
              activeSection === sec.section_code ? "bg-ink-900 text-bone-100" : "bg-bone-50 hover:bg-bone-200"
            }`}
            onClick={() => setActiveSection(activeSection === sec.section_code ? null : sec.section_code)}
          >
            <div className={`font-mono text-[10px] tracking-[0.2em] ${activeSection === sec.section_code ? "text-bone-100/40" : "text-ink-400"}`}>
              SECTION / {sec.section_code}
            </div>
            <h3 className="font-display text-2xl tracking-tight mt-1">{sec.section_name}</h3>
            <div className="grid grid-cols-4 gap-4 mt-6">
              <div>
                <div className={`font-mono text-[10px] tracking-[0.2em] ${activeSection === sec.section_code ? "text-bone-100/40" : "text-ink-400"}`}>SOLVED</div>
                <div className="font-display text-4xl mt-1 tnum">{sec.solved}/{sec.total}</div>
              </div>
              <div>
                <div className={`font-mono text-[10px] tracking-[0.2em] ${activeSection === sec.section_code ? "text-bone-100/40" : "text-ink-400"}`}>ACC</div>
                <div className="font-display text-4xl mt-1 tnum text-accent">{sec.accuracy || 0}%</div>
              </div>
              <div>
                <div className={`font-mono text-[10px] tracking-[0.2em] ${activeSection === sec.section_code ? "text-bone-100/40" : "text-ink-400"}`}>SPEED</div>
                <div className="font-display text-4xl mt-1 tnum">{sec.avg_time || 0}s</div>
              </div>
              <div>
                <div className={`font-mono text-[10px] tracking-[0.2em] ${activeSection === sec.section_code ? "text-bone-100/40" : "text-ink-400"}`}>MASTERY</div>
                <div className="font-display text-4xl mt-1 tnum">{sec.mastery || 0}%</div>
              </div>
            </div>
            <div className="mt-5 h-2 bg-bone-300 relative">
              <div className="absolute inset-y-0 left-0 bg-accent" style={{ width: `${sec.total ? Math.round(sec.solved / sec.total * 100) : 0}%` }} />
            </div>
          </div>
        ))}
      </div>

      {activeSection && (
        <div className="editorial">
          <div className="p-6 border-b border-line">
            <div className="font-mono text-[10px] tracking-[0.24em] text-ink-400">QUESTIONS / {activeSection}</div>
          </div>
          <div className="grid grid-cols-12 px-6 py-3 border-b border-line font-mono text-[10px] tracking-[0.24em] text-ink-400">
            <div className="col-span-1">STATUS</div>
            <div className="col-span-4">QUESTION</div>
            <div className="col-span-2">TOPIC</div>
            <div className="col-span-1">DIFF</div>
            <div className="col-span-2 text-right">MASTERY</div>
            <div className="col-span-2 text-right">ACCURACY</div>
          </div>
          {activeQuestions.map((q) => (
            <div key={q.question_id} className="grid grid-cols-12 px-6 py-3 border-b border-line items-center text-sm hover:bg-bone-200 transition-colors">
              <div className="col-span-1">
                <button
                  onClick={() => toggleQuestion(q.question_id, q.solved)}
                  className={`w-6 h-6 border-2 flex items-center justify-center transition-colors ${
                    q.solved ? "bg-ink-900 border-ink-900 text-bone-100" : "border-ink-300 hover:border-ink-600"
                  }`}
                >
                  {q.solved ? "✓" : ""}
                </button>
              </div>
              <div className="col-span-4 font-medium">{q.title}</div>
              <div className="col-span-2 font-mono text-xs text-ink-500">{q.topic}</div>
              <div className="col-span-1">
                <span className={`text-xs px-2 py-0.5 ${
                  q.difficulty === "Hard" ? "bg-red-100 text-red-700" :
                  q.difficulty === "Medium" ? "bg-yellow-100 text-yellow-700" :
                  "bg-green-100 text-green-700"
                }`}>{q.difficulty}</span>
              </div>
              <div className="col-span-2 text-right font-display text-accent tnum">{q.mastery_score || 0}</div>
              <div className="col-span-2 text-right font-mono tnum">{q.accuracy || 0}%</div>
            </div>
          ))}
        </div>
      )}

      {(d.weak_topics || []).length > 0 && (
        <div className="editorial p-8">
          <div className="font-mono text-[10px] tracking-[0.24em] text-ink-400">WEAK TOPICS — FOCUS AREAS</div>
          <div className="mt-5 space-y-3">
            {d.weak_topics.map(topic => (
              <div key={`${topic.section_code}-${topic.topic}`} className="border border-line bg-bone-50 p-4">
                <div className="flex justify-between">
                  <div>
                    <div className="font-display text-lg">{topic.topic}</div>
                    <div className="text-sm text-ink-500">{topic.section_code} / accuracy {topic.accuracy}%</div>
                  </div>
                  <div className="font-display text-2xl text-accent tnum">{topic.mastery_score}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
