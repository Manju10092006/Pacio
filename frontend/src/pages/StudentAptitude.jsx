import React, { useEffect, useState } from "react";
import { api } from "../lib/api";
import { Badge, Progress, cn } from "../components/Primitives";
import { PageTransition, CounterAnimation, DashboardReveal } from "../components/Motion";
import { DataTable } from "../components/DataTable";

export default function StudentAptitude() {
  const [d, setD] = useState(null);
  const [activeSection, setActiveSection] = useState(null);

  const load = () =>
    api
      .get("/me/aptitude/questions")
      .then(({ data }) => setD(data))
      .catch(() => setD({ sections: [], overall: {} }));

  useEffect(() => { load(); }, []);

  if (!d) return <div className="font-mono text-xs text-ink-400 p-8">LOADING APTITUDE...</div>;

  const overall = d.overall || {};
  const sections = d.sections || [];
  const activeQuestions = activeSection
    ? (d.questions || []).filter((q) => q.section_code === activeSection)
    : [];

  const toggleQuestion = async (qid, solved) => {
    try {
      await api.patch(`/me/aptitude/questions/${qid}`, { solved: !solved });
      load();
    } catch {}
  };

  const columns = [
    {
      key: "solved",
      header: "Status",
      render: (solved, row) => (
        <button
          onClick={() => toggleQuestion(row.question_id, solved)}
          className={`w-5 h-5 border flex items-center justify-center transition-all ${
            solved
              ? "bg-ink border-ink text-bone font-bold"
              : "border-line-strong hover:border-ink"
          }`}
        >
          {solved ? "✓" : ""}
        </button>
      ),
    },
    { key: "title", header: "Question", sortable: true },
    { key: "topic", header: "Topic", sortable: true },
    {
      key: "difficulty",
      header: "Diff",
      sortable: true,
      render: (diff) => {
        const v =
          diff === "Hard"
            ? "danger"
            : diff === "Medium"
            ? "warning"
            : "success";
        return <Badge variant={v}>{diff}</Badge>;
      },
    },
    {
      key: "mastery_score",
      header: "Mastery",
      sortable: true,
      render: (score) => <span className="font-mono text-accent tnum">{score || 0}</span>,
    },
    {
      key: "accuracy",
      header: "Accuracy",
      sortable: true,
      render: (acc) => <span className="font-mono tnum">{acc || 0}%</span>,
    },
  ];

  return (
    <PageTransition className="space-y-10">
      <DashboardReveal className="grid grid-cols-12 gap-4">
        <div className="col-span-12 md:col-span-8 editorial p-10 dash-reveal">
          <div className="font-mono text-[10px] tracking-[0.28em] text-ink-400">§ YOUR APTITUDE TRACKER</div>
          <h1 className="font-display text-5xl md:text-6xl tracking-tightest mt-3">Speed. Accuracy. Mastery.</h1>
          <p className="font-serif text-lg text-ink-500 mt-2 max-w-xl">
            Track your performance across quantitative, reasoning, verbal, and data interpretation sections.
          </p>
        </div>
        <div className="col-span-12 md:col-span-4 editorial bg-ink text-bone p-10 flex flex-col justify-between dash-reveal">
          <div>
            <div className="font-mono text-[10px] tracking-[0.28em] text-bone/45">OVERALL SCORE</div>
            <div className="font-display text-[8vw] md:text-[6vw] tracking-tightest leading-[0.9] tnum text-accent">
              <CounterAnimation value={overall.score || 0} />%
            </div>
            <div className="text-bone/60 text-sm mt-1">{overall.solved || 0} / {overall.total || 0} questions solved</div>
          </div>
          <div className="mt-6">
            <Progress value={overall.score || 0} />
          </div>
        </div>
      </DashboardReveal>

      <DashboardReveal className="grid grid-cols-12 gap-4">
        {[
          { label: "Questions Solved", value: overall.solved || 0, sub: `of ${overall.total || 0} total` },
          { label: "Accuracy", value: `${overall.accuracy || 0}%`, sub: "correct rate" },
          { label: "Avg Speed", value: `${overall.avg_time || 0}s`, sub: "per question" },
          { label: "Mastery", value: `${overall.mastery || 0}%`, sub: "weighted score" },
        ].map((card) => (
          <div key={card.label} className="col-span-12 md:col-span-3 editorial p-6 dash-reveal">
            <div className="font-mono text-[10px] tracking-[0.24em] text-ink-400">{card.label.toUpperCase()}</div>
            <div className="font-display text-5xl tracking-tightest mt-4 tnum">{card.value}</div>
            <div className="text-sm text-ink-500 mt-2 font-serif">{card.sub}</div>
          </div>
        ))}
      </DashboardReveal>

      <DashboardReveal className="grid grid-cols-12 gap-4">
        {sections.map((sec) => {
          const isActive = activeSection === sec.section_code;
          return (
            <div
              key={sec.section_code}
              className={cn(
                "col-span-12 md:col-span-6 editorial p-8 cursor-pointer transition-colors dash-reveal",
                isActive ? "bg-ink text-bone" : "bg-paper hover:bg-bone-100/50"
              )}
              onClick={() => setActiveSection(isActive ? null : sec.section_code)}
            >
              <div className={cn("font-mono text-[10px] tracking-[0.2em]", isActive ? "text-bone/45" : "text-ink-400")}>
                SECTION / {sec.section_code}
              </div>
              <h3 className="font-display text-2xl tracking-tight mt-1.5 uppercase">{sec.section_name}</h3>
              <div className="grid grid-cols-4 gap-4 mt-6 pt-4 border-t border-line">
                <div>
                  <div className={cn("font-mono text-[9px] tracking-[0.15em]", isActive ? "text-bone/45" : "text-ink-400")}>SOLVED</div>
                  <div className="font-display text-2xl mt-1 tnum">{sec.solved}/{sec.total}</div>
                </div>
                <div>
                  <div className={cn("font-mono text-[9px] tracking-[0.15em]", isActive ? "text-bone/45" : "text-ink-400")}>ACC</div>
                  <div className="font-display text-2xl mt-1 tnum text-accent">{sec.accuracy || 0}%</div>
                </div>
                <div>
                  <div className={cn("font-mono text-[9px] tracking-[0.15em]", isActive ? "text-bone/45" : "text-ink-400")}>SPEED</div>
                  <div className="font-display text-2xl mt-1 tnum">{sec.avg_time || 0}s</div>
                </div>
                <div>
                  <div className={cn("font-mono text-[9px] tracking-[0.15em]", isActive ? "text-bone/45" : "text-ink-400")}>MASTERY</div>
                  <div className="font-display text-2xl mt-1 tnum">{sec.mastery || 0}%</div>
                </div>
              </div>
              <div className="mt-6">
                <Progress value={sec.total ? Math.round((sec.solved / sec.total) * 100) : 0} />
              </div>
            </div>
          );
        })}
      </DashboardReveal>

      {activeSection && (
        <div className="editorial p-8 bg-paper">
          <div className="border-b border-line pb-4 mb-6">
            <div className="font-mono text-[10px] tracking-[0.24em] text-ink-400">QUESTIONS / {activeSection}</div>
          </div>
          <DataTable
            data={activeQuestions}
            columns={columns}
            searchKey="title"
            searchPlaceholder="Search section questions..."
            initialPageSize={10}
          />
        </div>
      )}

      {(d.weak_topics || []).length > 0 && (
        <div className="editorial p-8 bg-paper">
          <div className="font-mono text-[10px] tracking-[0.24em] text-ink-400">WEAK TOPICS — FOCUS AREAS</div>
          <div className="mt-5 space-y-3">
            {d.weak_topics.map((topic) => (
              <div key={`${topic.section_code}-${topic.topic}`} className="border border-line-strong bg-bone-50 p-4 flex items-center justify-between">
                <div>
                  <div className="font-display text-lg tracking-tight uppercase">{topic.topic}</div>
                  <div className="text-xs text-ink-500 font-serif mt-1">{topic.section_code} / accuracy {topic.accuracy}%</div>
                </div>
                <div className="font-display text-3xl text-accent tnum">{topic.mastery_score}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </PageTransition>
  );
}
