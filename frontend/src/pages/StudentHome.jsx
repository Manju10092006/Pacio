import React, { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../App";
import { Code2, TrendingUp, Award, Briefcase, ChevronRight, User } from "lucide-react";
import { Link } from "react-router-dom";
import { Avatar, Badge, Progress, EmptyState } from "../components/Primitives";
import { PageTransition, DashboardReveal, CounterAnimation, RevealText } from "../components/Motion";

export default function StudentHome() {
  useAuth();
  const [d, setD] = useState(null);
  const [workspace, setWorkspace] = useState(null);

  useEffect(() => {
    api.get("/me/dashboard").then(({ data }) => setD(data)).catch(() => {});
    api.get("/workspace/me").then(({ data }) => setWorkspace(data)).catch(() => {});
  }, []);

  if (!d) return <div className="font-mono text-xs text-ink-400 p-8">LOADING…</div>;

  const s = d.student;
  const solved = d.dsa.reduce((a, t) => a + t.solved, 0);
  const dsaPct = Math.round((solved / d.dsa_total) * 100);
  const aptAvg = d.aptitude.length ? Math.round(d.aptitude.reduce((a, x) => a + x.score_pct, 0) / d.aptitude.length) : 0;
  const intAvg = d.interviews.length ? Math.round(d.interviews.reduce((a, x) => a + x.overall_score, 0) / d.interviews.length) : 0;
  const engine = d.readiness_engine;
  const readiness = Math.round(engine?.score ?? s.readiness_score);
  const atsScore = Math.round(engine?.components?.ats?.score ?? d.ats?.score ?? s.ats_score);
  const interviewScore = Math.round(engine?.components?.interview?.score ?? intAvg);

  return (
    <PageTransition className="space-y-10">
      {/* Editorial hero */}
      <DashboardReveal className="grid grid-cols-12 gap-4">
        <div className="col-span-12 md:col-span-7 editorial p-10 lg:p-14 relative overflow-hidden dash-reveal">
          <div className="absolute -right-10 -top-10 font-display text-[20vw] leading-none text-bone-200 select-none pointer-events-none">
            {s.name[0]}
          </div>
          <div className="relative font-mono text-[10px] tracking-[0.28em] text-ink-400">§ YOUR WORKSPACE</div>
          <h1 className="relative font-display text-5xl md:text-6xl tracking-tightest mt-3 leading-[0.95]" data-testid="student-heading">
            Hi <span className="text-accent">{s.name.split(" ")[0]}</span>.<br />Let's get you placed.
          </h1>
          <p className="relative font-serif text-lg text-ink-500 mt-3 max-w-xl">
            {s.placement?.placed
              ? `Placed at ${s.placement.company} (₹${s.placement.ctc_lpa}L). Now help your peers.`
              : `${dsaPct}% DSA done · ATS ${atsScore} · ${engine?.label || "readiness"} ${readiness}/100. Keep going.`}
          </p>
          <div className="relative mt-6 flex flex-wrap gap-2">
            <Badge variant="solid">{s.roll_number}</Badge>
            <Badge variant="accent">{s.department}</Badge>
            <Badge>CGPA {s.cgpa}</Badge>
            <Badge>{s.batch}</Badge>
          </div>
        </div>

        <div className="col-span-12 md:col-span-5 editorial bg-ink text-bone p-10 lg:p-12 flex flex-col justify-between dash-reveal">
          <div>
            <div className="font-mono text-[10px] tracking-[0.28em] text-bone/45">READINESS SCORE</div>
            <div className="font-display text-[14vw] md:text-[10vw] tracking-tightest leading-[0.9] tnum text-accent">
              <CounterAnimation value={readiness} />
            </div>
            <div className="text-bone/60 text-sm font-sans mt-2">{engine?.label || "composite"} (CGPA · DSA · ATS · Interview)</div>
          </div>
          <div className="grid grid-cols-3 gap-4 mt-8 pt-4 border-t border-bone/10">
            {[
              { l: "DSA PROGRESS", v: `${dsaPct}%` },
              { l: "ATS SCORE", v: atsScore },
              { l: "INT SCORE", v: `${interviewScore}` },
            ].map((x) => (
              <div key={x.l}>
                <div className="font-mono text-[9px] text-bone/45 tracking-[0.18em]">{x.l}</div>
                <div className="font-display text-2xl mt-1.5 tnum">{x.v}</div>
              </div>
            ))}
          </div>
        </div>
      </DashboardReveal>

      {/* 4 module rings */}
      <DashboardReveal className="grid grid-cols-12 gap-4" data-testid="student-modules">
        {[
          { to: "/student/dsa", icon: Code2, label: "DSA tracker", primary: `${dsaPct}%`, sub: `${solved}/${d.dsa_total} solved`, key: "dsa" },
          { to: "/student/jobs", icon: Briefcase, label: "Open drives", primary: d.recommended_jobs.length, sub: "matching your profile", key: "jobs" },
          { to: "/student/applications", icon: TrendingUp, label: "Applications", primary: d.applications.length, sub: `${d.applications.filter(a => a.stage === "Interview").length} interviews`, key: "apps" },
          { to: "/student/announcements", icon: Award, label: "Aptitude avg", primary: `${aptAvg}%`, sub: `${d.aptitude.length} sections`, key: "apt" },
        ].map((m) => (
          <Link key={m.key} to={m.to} className="col-span-12 md:col-span-3 editorial p-8 hover:border-ink transition-colors group dash-reveal" data-testid={`stmod-${m.key}`}>
            <div className="flex items-center justify-between text-ink-400">
              <div className="font-mono text-[10px] tracking-[0.24em] flex items-center gap-2">
                <m.icon size={14} /> {m.label.toUpperCase()}
              </div>
            </div>
            <div className="font-display text-5xl tracking-tightest mt-5 tnum group-hover:text-accent transition-colors">
              {m.primary}
            </div>
            <div className="text-sm text-ink-500 mt-2 font-serif">{m.sub}</div>
          </Link>
        ))}
      </DashboardReveal>

      {/* Decision queue */}
      {workspace?.actions?.length > 0 && (
        <DashboardReveal className="grid grid-cols-12 gap-4" data-testid="student-decision-queue">
          {workspace.actions.slice(0, 3).map((action, i) => (
            <Link key={action.label} to={action.to} className="col-span-12 md:col-span-4 editorial p-6 hover:border-ink transition-colors dash-reveal">
              <div className="font-mono text-[10px] tracking-[0.24em] text-ink-400">NEXT MOVE {String(i + 1).padStart(2, "0")}</div>
              <div className="font-display text-xl tracking-tight mt-3">{action.label}</div>
              <div className="text-sm text-ink-500 mt-2 font-serif">{action.reason}</div>
            </Link>
          ))}
        </DashboardReveal>
      )}

      {/* DSA breakdown + Recommended jobs */}
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 md:col-span-7 editorial p-8" data-testid="student-dsa-panel">
          <div className="font-mono text-[10px] tracking-[0.24em] text-ink-400">YOUR STRIVER A2Z · TOPIC PROGRESS</div>
          <h3 className="font-display text-2xl tracking-tight mt-1">Where you stand</h3>
          
          <div className="mt-6 grid grid-cols-2 md:grid-cols-3 gap-3">
            {d.dsa.slice(0, 9).map((t) => {
              const pct = Math.round((t.solved / t.total) * 100);
              return (
                <div key={t.topic_code} className="border border-line p-4 bg-bone-100/50">
                  <div className="font-mono text-[9px] tracking-[0.2em] text-ink-400">{t.topic_code}</div>
                  <div className="font-display text-sm tracking-tight mt-1 truncate">{t.topic_name}</div>
                  <div className="font-display text-2xl mt-3 tnum">{t.solved}<span className="text-ink-400 text-sm font-light">/{t.total}</span></div>
                  <div className="mt-3">
                    <Progress value={pct} />
                  </div>
                </div>
              );
            })}
          </div>
          <Link to="/student/dsa" className="mt-6 inline-flex items-center gap-1.5 ink-link text-xs font-mono uppercase tracking-wider">
            Open full tracker <ChevronRight size={14} />
          </Link>
        </div>

        <div className="col-span-12 md:col-span-5 editorial p-8 bg-bone-100/40 flex flex-col">
          <div className="font-mono text-[10px] tracking-[0.24em] text-ink-400">RECOMMENDED FOR YOU</div>
          <h3 className="font-display text-2xl tracking-tight mt-1">Open drives</h3>
          <div className="mt-6 space-y-3 flex-1">
            {d.recommended_jobs.map((j, i) => (
              <div key={j.job_id} className="border border-line-strong p-4 bg-paper hover:border-ink transition-colors" data-testid={`rec-job-${i}`}>
                <div className="flex items-baseline justify-between gap-2">
                  <div className="font-display text-lg tracking-tight uppercase">{j.company}</div>
                  <div className="font-mono text-accent tnum text-sm">₹{j.ctc_lpa}LPA</div>
                </div>
                <div className="text-xs text-ink-500 font-serif mt-1">{j.title} · {j.location} · {j.openings} openings</div>
              </div>
            ))}
            {d.recommended_jobs.length === 0 && (
              <EmptyState title="No active drives matching" description="We will notify you as soon as a new recruitment drive is posted by partners." />
            )}
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
