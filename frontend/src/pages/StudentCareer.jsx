import React, { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../App";
import { Briefcase, ChevronRight, Compass, Sparkles } from "lucide-react";

export default function StudentCareer() {
  useAuth();
  const [recs, setRecs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/api/me/career/recommendations")
      .then(({ data }) => setRecs(data.recommendations || []))
      .catch(() => setRecs([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="font-mono text-xs text-ink-400 p-8">LOADING…</div>;

  return (
    <div className="space-y-10">
      {/* Header */}
      <div>
        <div className="font-mono text-[10px] tracking-[0.28em] text-ink-400">§ CAREER PATHS</div>
        <h1 className="font-display text-5xl md:text-6xl tracking-tightest mt-3" data-testid="career-heading">
          Career <span className="text-accent">Pathways</span>
        </h1>
        <p className="font-serif text-lg text-ink-500 mt-2 max-w-xl">
          AI-powered career recommendations based on your academic performance, DSA mastery, and aptitude scores.
        </p>
      </div>

      <div className="grid grid-cols-12 gap-4">
        {recs.map((r, i) => (
          <div
            key={r.role}
            className="col-span-12 md:col-span-6 lg:col-span-4 editorial p-8 flex flex-col justify-between"
            data-testid={`career-card-${i}`}
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-xs font-mono bg-bone-100 text-ink-700">
                  <Briefcase size={12} /> {r.fit_percentage}% FIT
                </div>
                <Sparkles size={16} className="text-accent" />
              </div>

              <h3 className="font-display text-2xl tracking-tight mt-4">{r.role}</h3>
              <p className="font-serif text-sm text-ink-600 mt-2 leading-relaxed">{r.reason}</p>

              <div className="hairline my-5" />

              <div className="space-y-3">
                <div className="font-mono text-[10px] tracking-[0.18em] text-ink-400">RECOMMENDED ACTIONS</div>
                <ul className="space-y-2">
                  {r.actions.map((act, actIdx) => (
                    <li key={actIdx} className="flex items-start gap-2 text-xs text-ink-700">
                      <ChevronRight size={14} className="text-accent mt-0.5 flex-shrink-0" />
                      <span>{act}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-8">
              <button className="btn w-full text-xs py-2.5 flex items-center justify-center gap-2">
                Explore Pathways <Compass size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
