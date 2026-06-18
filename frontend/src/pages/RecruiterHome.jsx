import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../App";

export default function RecruiterHome() {
  const { user } = useAuth();
  const [workspace, setWorkspace] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [apps, setApps] = useState(null);
  const [talent, setTalent] = useState([]);

  useEffect(() => {
    api.get("/workspace/me")
      .then(({ data }) => {
        setWorkspace(data);
        setJobs(data.sections?.jobs || []);
        setApps({ items: data.sections?.applications || [], pipeline: data.sections?.pipeline || {} });
        setTalent(data.sections?.talent || []);
      })
      .catch(() => {
        api.get("/jobs?status=open").then(({ data }) => setJobs(data.items || []));
        api.get("/applications").then(({ data }) => setApps(data));
        api.get("/recruiters/me/talent-pool").then(({ data }) => setTalent(data.items || []));
      });
    api.get("/recruiters/me/analytics").then(({ data }) => setAnalytics(data)).catch(() => {});
  }, []);

  const openJobs = jobs.filter((j) => j.status === "open");
  const pipelineTotal = Object.values(apps?.pipeline || {}).reduce((a, b) => a + b, 0);
  const selectedCount = apps?.pipeline?.Selected || 0;
  const packageValues = openJobs.map((j) => Number(j.ctc_lpa || 0)).filter(Boolean);
  const recruiterSummary = analytics?.summary || {
    conversion_rate: pipelineTotal ? Math.round((selectedCount / pipelineTotal) * 1000) / 10 : 0,
    selected: selectedCount,
    talent_ready: talent.filter((t) => Number(t.readiness_score || 0) >= 72).length,
    avg_package_lpa: packageValues.length ? Math.round((packageValues.reduce((a, b) => a + b, 0) / packageValues.length) * 10) / 10 : 0,
    top_package_lpa: packageValues.length ? Math.max(...packageValues) : 0,
    upcoming_interviews: workspace?.sections?.scheduled_interviews?.length || 0,
  };
  const actions = workspace?.actions?.length ? workspace.actions : (analytics?.action_queue?.length ? analytics.action_queue : [
    { label: "Review top-ready candidates", to: "/recruiter/talent", reason: "Talent ranked by readiness score" },
    { label: "Move shortlisted candidates forward", to: "/recruiter/applications", reason: "Pipeline stages need recruiter action" },
    { label: "Schedule interview slots", to: "/recruiter/schedule", reason: "Convert interview-ready candidates" },
  ]);

  return (
    <div className="space-y-10">
      <div className="editorial bg-ink-900 text-bone-100 p-10 lg:p-14">
        <div className="font-mono text-[10px] tracking-[0.28em] text-bone-100/40">
          {workspace?.eyebrow?.toUpperCase() || "RECRUITER / CONSOLE"}
        </div>
        <h1 className="font-display text-5xl md:text-6xl tracking-tightest mt-3" data-testid="rec-home-heading">
          {workspace?.headline || <>Hi {user?.name?.split(" ")[0]}, <span className="text-accent">your pipeline.</span></>}
        </h1>
        <p className="font-serif text-lg text-bone-100/70 mt-3 max-w-2xl">
          {workspace?.subtitle || "You see open drives, shortlisted candidates, and the talent pool across every partner institution."}
        </p>
      </div>

      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-12 md:col-span-4 editorial p-7">
          <div className="font-mono text-[10px] tracking-[0.24em] text-ink-400">OPEN DRIVES</div>
          <div className="font-display text-6xl tnum mt-2">{openJobs.length}</div>
        </div>
        <div className="col-span-12 md:col-span-4 editorial p-7">
          <div className="font-mono text-[10px] tracking-[0.24em] text-ink-400">IN PIPELINE</div>
          <div className="font-display text-6xl tnum mt-2 text-accent">{pipelineTotal}</div>
        </div>
        <div className="col-span-12 md:col-span-4 editorial p-7">
          <div className="font-mono text-[10px] tracking-[0.24em] text-ink-400">TALENT POOL</div>
          <div className="font-display text-6xl tnum mt-2">{talent.length}</div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-3" data-testid="recruiter-analytics">
        {[
          { label: "Conversion", value: `${recruiterSummary.conversion_rate}%`, sub: `${recruiterSummary.selected} selected` },
          { label: "Ready talent", value: recruiterSummary.talent_ready, sub: "readiness above 72" },
          { label: "Avg package", value: `${recruiterSummary.avg_package_lpa}L`, sub: `${recruiterSummary.top_package_lpa}L top` },
          { label: "Interviews", value: recruiterSummary.upcoming_interviews, sub: "upcoming scheduled" },
        ].map((card) => (
          <div key={card.label} className="col-span-12 md:col-span-3 editorial p-6">
            <div className="font-mono text-[10px] tracking-[0.24em] text-ink-400">{card.label.toUpperCase()}</div>
            <div className="font-display text-5xl tracking-tightest mt-3 tnum">{card.value}</div>
            <div className="text-sm text-ink-500 mt-2">{card.sub}</div>
          </div>
        ))}
      </div>

      {actions.length > 0 && (
        <div className="grid grid-cols-12 gap-3" data-testid="recruiter-decision-queue">
          {actions.slice(0, 3).map((action, i) => (
            <Link key={action.label} to={action.to} className="col-span-12 md:col-span-4 editorial p-6 hover:border-ink-900 transition-colors">
              <div className="font-mono text-[10px] tracking-[0.24em] text-ink-400">ACTION {String(i + 1).padStart(2, "0")}</div>
              <div className="font-display text-xl tracking-tight mt-3">{action.label}</div>
              <div className="text-sm text-ink-500 mt-2">{action.reason}</div>
            </Link>
          ))}
        </div>
      )}

      <div className="editorial p-8">
        <div className="font-mono text-[10px] tracking-[0.24em] text-ink-400">SHORTLISTED / NEXT 5</div>
        <h3 className="font-display text-2xl tracking-tight mt-1">Top of your pile</h3>
        <div className="mt-5 grid grid-cols-12 gap-3">
          {talent.slice(0, 6).map((t, i) => (
            <div key={t.student_id} className="col-span-12 md:col-span-6 lg:col-span-4 border border-line p-5 bg-bone-50" data-testid={`talent-${i}`}>
              <div className="font-display text-lg tracking-tight">{t.name}</div>
              <div className="font-mono text-[10px] tracking-[0.2em] text-ink-400 uppercase">{t.department} / {t.roll_number}</div>
              <div className="grid grid-cols-3 gap-3 mt-4 text-xs">
                <div><div className="font-mono text-[10px] text-ink-400">CGPA</div><div className="font-display text-xl tnum mt-0.5">{t.cgpa}</div></div>
                <div><div className="font-mono text-[10px] text-ink-400">READINESS</div><div className="font-display text-xl tnum mt-0.5 text-accent">{t.readiness_score}</div></div>
                <div><div className="font-mono text-[10px] text-ink-400">ATS</div><div className="font-display text-xl tnum mt-0.5">{t.ats_score}</div></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
