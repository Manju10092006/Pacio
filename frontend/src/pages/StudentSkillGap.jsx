import React, { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../App";
import { AlertTriangle, CheckCircle, Briefcase } from "lucide-react";

const COMPONENT_LABELS = {
  dsa: "DSA",
  aptitude: "Aptitude",
  ats: "ATS Score",
  interview: "Interview",
  cgpa: "CGPA",
  consistency: "Consistency",
};

const RECOMMENDATIONS = {
  dsa: "Focus on array, string, and tree problems. Aim for 2 problems daily on the DSA module.",
  aptitude: "Practice quantitative reasoning and logical puzzles. Take weekly aptitude mock tests.",
  ats: "Improve resume keywords and formatting. Use the Resume Builder to optimise your ATS score.",
  interview: "Schedule mock interviews and review communication frameworks. Work on STAR responses.",
  cgpa: "Prioritise academic coursework and seek faculty guidance for weaker subjects.",
  consistency: "Maintain daily streaks on the platform. Small daily effort compounds significantly.",
};

function scoreColor(score) {
  if (score >= 75) return "bg-accent";
  if (score >= 50) return "bg-[#c1440e]";
  return "bg-ink-900";
}

function scoreLabel(score) {
  if (score >= 75) return "STRONG";
  if (score >= 50) return "DEVELOPING";
  return "NEEDS WORK";
}

export default function StudentSkillGap() {
  useAuth();
  const [readiness, setReadiness] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/me/readiness").then(({ data }) => setReadiness(data)).catch(() => {}),
      api.get("/jobs?status=open").then(({ data }) => setJobs(data.items || [])).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="font-mono text-xs text-ink-400 p-8">LOADING…</div>;

  const components = readiness?.components || {};
  const overallScore = Math.round(readiness?.score || 0);

  const entries = Object.entries(COMPONENT_LABELS)
    .map(([key, label]) => ({
      key,
      label,
      score: Math.round(components[key]?.score ?? 0),
    }))
    .sort((a, b) => a.score - b.score);

  const weakAreas = entries.filter((e) => e.score < 60);
  const mySkills = new Set(
    (readiness?.skills || []).map((s) => (typeof s === "string" ? s : s.name || "").toLowerCase())
  );

  return (
    <div className="space-y-10">
      {/* Header */}
      <div>
        <div className="font-mono text-[10px] tracking-[0.28em] text-ink-400">§ SKILL GAP</div>
        <h1 className="font-display text-5xl md:text-6xl tracking-tightest mt-3" data-testid="skill-gap-heading">
          Your Skill <span className="text-accent">Analysis</span>
        </h1>
        <p className="font-serif text-lg text-ink-500 mt-2 max-w-xl">Identify gaps, track improvement, and match against job requirements.</p>
      </div>

      <div className="grid grid-cols-12 gap-3">
        {/* Overall score */}
        <div className="col-span-12 md:col-span-4 editorial bg-ink-900 text-bone-100 p-8" data-testid="skill-gap-overall">
          <div className="font-mono text-[10px] tracking-[0.24em] text-bone-100/60">READINESS SCORE</div>
          <div className="font-display text-[12vw] md:text-[6vw] tracking-tightest leading-[0.85] mt-3 tnum text-accent">{overallScore}</div>
          <div className="text-sm text-bone-100/60 mt-2">{scoreLabel(overallScore)} — overall placement readiness</div>
          <div className="hairline my-6 border-bone-100/30" />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="font-mono text-[10px] tracking-[0.24em] text-bone-100/60">COMPONENTS</div>
              <div className="font-display text-2xl mt-1 tnum">{entries.length}</div>
            </div>
            <div>
              <div className="font-mono text-[10px] tracking-[0.24em] text-bone-100/60">GAPS</div>
              <div className="font-display text-2xl mt-1 tnum text-accent">{weakAreas.length}</div>
            </div>
          </div>
        </div>

        {/* Readiness bar chart */}
        <div className="col-span-12 md:col-span-8 editorial p-8" data-testid="skill-gap-bars">
          <div className="font-mono text-[10px] tracking-[0.24em] text-ink-400 mb-6">READINESS COMPONENTS</div>
          <div className="space-y-4">
            {entries.map((entry) => (
              <div key={entry.key} data-testid={`skill-bar-${entry.key}`}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-mono text-[10px] tracking-[0.2em] text-ink-500">{entry.label.toUpperCase()}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs tnum">{entry.score}</span>
                    <span className={`font-mono text-[9px] tracking-[0.2em] px-2 py-0.5 border border-line ${entry.score >= 75 ? "text-accent" : entry.score >= 50 ? "text-[#c1440e]" : "text-ink-900"}`}>
                      {scoreLabel(entry.score)}
                    </span>
                  </div>
                </div>
                <div className="h-2 bg-bone-300 relative">
                  <div className={`absolute inset-y-0 left-0 ${scoreColor(entry.score)} transition-all`} style={{ width: `${entry.score}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Gap areas with recommendations */}
      {weakAreas.length > 0 && (
        <div data-testid="skill-gap-recommendations">
          <div className="font-mono text-[10px] tracking-[0.24em] text-ink-400 mb-4">GAP AREAS · IMPROVEMENT PLAN</div>
          <div className="grid grid-cols-12 gap-3">
            {weakAreas.map((area) => (
              <div key={area.key} className="col-span-12 md:col-span-6 editorial p-6" data-testid={`skill-rec-${area.key}`}>
                <div className="flex items-start gap-3">
                  <AlertTriangle size={18} className={area.score < 50 ? "text-accent" : "text-[#c1440e]"} />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div className="font-display text-xl tracking-tight">{area.label}</div>
                      <div className="font-mono text-xs tnum">{area.score}/100</div>
                    </div>
                    <div className="h-1.5 bg-bone-300 mt-2 relative">
                      <div className={`absolute inset-y-0 left-0 ${scoreColor(area.score)}`} style={{ width: `${area.score}%` }} />
                    </div>
                    <p className="font-serif text-sm text-ink-600 mt-3">{RECOMMENDATIONS[area.key]}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {weakAreas.length === 0 && (
        <div className="editorial p-8 text-center" data-testid="skill-gap-no-gaps">
          <CheckCircle size={24} className="text-accent mx-auto" />
          <div className="font-display text-2xl tracking-tight mt-3">All components above threshold</div>
          <p className="font-serif text-sm text-ink-500 mt-2">Keep up the consistency to maintain your readiness score.</p>
        </div>
      )}

      {/* Job match section */}
      <div data-testid="skill-gap-jobs">
        <div className="font-mono text-[10px] tracking-[0.24em] text-ink-400 mb-4">JOB MATCH · SKILL COMPARISON</div>
        <div className="grid grid-cols-12 gap-3">
          {jobs.slice(0, 6).map((job, i) => {
            const required = (job.required_skills || []).map((s) => (typeof s === "string" ? s : s.name || "").toLowerCase());
            const matched = required.filter((s) => mySkills.has(s));
            const matchPct = required.length ? Math.round((matched.length / required.length) * 100) : 0;

            return (
              <div key={job.job_id || i} className="col-span-12 md:col-span-6 lg:col-span-4 editorial p-6 group hover:border-ink-900 transition-colors" data-testid={`skill-job-${i}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-mono text-[10px] tracking-[0.24em] text-ink-400">{job.company || "COMPANY"}</div>
                    <div className="font-display text-xl tracking-tight mt-1 group-hover:text-accent transition-colors">{job.title}</div>
                  </div>
                  <Briefcase size={16} className="text-ink-300" />
                </div>
                <div className="hairline my-4" />
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-[10px] tracking-[0.2em] text-ink-400">SKILL MATCH</span>
                  <span className="font-mono text-xs tnum">{matchPct}%</span>
                </div>
                <div className="h-1.5 bg-bone-300 relative">
                  <div className={`absolute inset-y-0 left-0 ${scoreColor(matchPct)}`} style={{ width: `${matchPct}%` }} />
                </div>
                {required.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {required.map((skill, si) => (
                      <span
                        key={si}
                        className={`font-mono text-[9px] tracking-[0.15em] px-1.5 py-0.5 border ${mySkills.has(skill) ? "border-accent text-accent" : "border-line text-ink-400"}`}
                      >
                        {skill.toUpperCase()}
                      </span>
                    ))}
                  </div>
                )}
                <div className="mt-3 text-xs text-ink-500">
                  {matched.length}/{required.length} skills matched
                  {job.ctc_lpa && <span className="ml-2">· {job.ctc_lpa} LPA</span>}
                </div>
              </div>
            );
          })}
          {jobs.length === 0 && (
            <div className="col-span-12 editorial p-8 text-center text-ink-400">
              No open positions to compare against.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
