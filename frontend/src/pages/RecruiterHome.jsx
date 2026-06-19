import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../App";
import { toast } from "sonner";
import { Badge, EmptyState, TabsRoot, TabsList, TabsTrigger, TabsContent } from "../components/Primitives";
import { PageTransition, CounterAnimation, DashboardReveal } from "../components/Motion";
import { Kanban } from "../components/Kanban";
import { DataTable } from "../components/DataTable";

export default function RecruiterHome() {
  const { user } = useAuth();
  const [workspace, setWorkspace] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [apps, setApps] = useState(null);
  const [talent, setTalent] = useState([]);

  const loadData = () => {
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
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleStageChange = async (app, newStage) => {
    try {
      const appId = app.application_id || app.id || app._id;
      await api.patch(`/applications/${appId}`, { stage: newStage });
      toast.success(`Application updated to ${newStage}`);
      loadData();
    } catch {
      toast.error("Failed to update application stage");
    }
  };

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

  const talentColumns = [
    { key: "name", header: "Candidate", sortable: true, render: (name, row) => (
      <div>
        <div className="font-display font-semibold uppercase">{name}</div>
        <div className="text-[10px] text-ink/50 font-mono">{row.roll_number}</div>
      </div>
    )},
    { key: "department", header: "Department", sortable: true },
    { key: "cgpa", header: "CGPA", sortable: true, render: (cgpa) => <span className="font-mono">{cgpa}</span> },
    { key: "readiness_score", header: "Readiness Index", sortable: true, render: (score) => (
      <Badge variant={score >= 75 ? "success" : "default"}>{score}/100</Badge>
    )},
    { key: "ats_score", header: "Resume Match", sortable: true, render: (score) => (
      <span className="font-mono text-accent">{score}%</span>
    )},
  ];

  return (
    <PageTransition className="space-y-10">
      <div className="editorial bg-ink text-bone p-10 lg:p-14">
        <div className="font-mono text-[10px] tracking-[0.28em] text-bone/45">
          {workspace?.eyebrow?.toUpperCase() || "RECRUITER / CONSOLE"}
        </div>
        <h1 className="font-display text-5xl md:text-6xl tracking-tightest mt-3" data-testid="rec-home-heading">
          {workspace?.headline || <>Hi {user?.name?.split(" ")[0]}, <span className="text-accent">your pipeline.</span></>}
        </h1>
        <p className="font-serif text-lg text-bone/70 mt-3 max-w-2xl">
          {workspace?.subtitle || "You see open drives, shortlisted candidates, and the talent pool across every partner institution."}
        </p>
      </div>

      <DashboardReveal className="grid grid-cols-12 gap-4">
        <div className="col-span-12 md:col-span-4 editorial p-7 bg-paper dash-reveal">
          <div className="font-mono text-[10px] tracking-[0.24em] text-ink-400">ACTIVE DRIVES</div>
          <div className="font-display text-6xl tnum mt-2">
            <CounterAnimation value={openJobs.length} />
          </div>
        </div>
        <div className="col-span-12 md:col-span-4 editorial p-7 bg-paper dash-reveal">
          <div className="font-mono text-[10px] tracking-[0.24em] text-ink-400">IN PIPELINE</div>
          <div className="font-display text-6xl tnum mt-2 text-accent">
            <CounterAnimation value={pipelineTotal} />
          </div>
        </div>
        <div className="col-span-12 md:col-span-4 editorial p-7 bg-paper dash-reveal">
          <div className="font-mono text-[10px] tracking-[0.24em] text-ink-400">TALENT POOL</div>
          <div className="font-display text-6xl tnum mt-2">
            <CounterAnimation value={talent.length} />
          </div>
        </div>
      </DashboardReveal>

      <DashboardReveal className="grid grid-cols-12 gap-4" data-testid="recruiter-analytics">
        {[
          { label: "Conversion", value: `${recruiterSummary.conversion_rate}%`, sub: `${recruiterSummary.selected} selected` },
          { label: "Ready talent", value: recruiterSummary.talent_ready, sub: "readiness above 72" },
          { label: "Avg package", value: `${recruiterSummary.avg_package_lpa}L`, sub: `${recruiterSummary.top_package_lpa}L top` },
          { label: "Interviews", value: recruiterSummary.upcoming_interviews, sub: "upcoming scheduled" },
        ].map((card) => (
          <div key={card.label} className="col-span-12 md:col-span-3 editorial p-6 bg-paper dash-reveal">
            <div className="font-mono text-[10px] tracking-[0.24em] text-ink-400">{card.label.toUpperCase()}</div>
            <div className="font-display text-5xl tracking-tightest mt-4 tnum">{card.value}</div>
            <div className="text-sm text-ink-500 mt-2 font-serif">{card.sub}</div>
          </div>
        ))}
      </DashboardReveal>

      {actions.length > 0 && (
        <DashboardReveal className="grid grid-cols-12 gap-4" data-testid="recruiter-decision-queue">
          {actions.slice(0, 3).map((action, i) => (
            <Link key={action.label} to={action.to} className="col-span-12 md:col-span-4 editorial p-6 hover:border-ink transition-colors bg-paper dash-reveal">
              <div className="font-mono text-[10px] tracking-[0.24em] text-ink-400">ACTION {String(i + 1).padStart(2, "0")}</div>
              <div className="font-display text-xl tracking-tight mt-3">{action.label}</div>
              <div className="text-sm text-ink-500 mt-2 font-serif">{action.reason}</div>
            </Link>
          ))}
        </DashboardReveal>
      )}

      {/* Recruiter Workspace Tabs */}
      <TabsRoot defaultValue="pipeline">
        <TabsList>
          <TabsTrigger value="pipeline">HIRING PIPELINE KANBAN</TabsTrigger>
          <TabsTrigger value="talent">TALENT PREVIEW</TabsTrigger>
          <TabsTrigger value="shortlists">TOP OF THE PILE</TabsTrigger>
        </TabsList>

        <TabsContent value="pipeline">
          <div className="p-2">
            <Kanban 
              items={apps?.items || []} 
              onStageChange={handleStageChange}
              onItemClick={(item) => toast.info(`Review candidate: ${item.student_name} (${item.stage || "Applied"})`)}
            />
          </div>
        </TabsContent>

        <TabsContent value="talent">
          <div className="editorial p-8 bg-paper">
            <div className="border-b border-line pb-4 mb-6">
              <div className="font-mono text-[10px] tracking-[0.24em] text-ink-400">TALENT POOL · SCREENER</div>
            </div>
            <DataTable data={talent} columns={talentColumns} initialPageSize={10} searchKey="name" searchPlaceholder="Search talent pool..." />
          </div>
        </TabsContent>

        <TabsContent value="shortlists">
          <div className="editorial p-8 bg-paper">
            <div className="font-mono text-[10px] tracking-[0.24em] text-ink-400">SHORTLISTED / TOP CANDIDATES</div>
            <h3 className="font-display text-2xl tracking-tight mt-1 mb-6">Top candidates matching your requisites</h3>
            <div className="grid grid-cols-12 gap-4">
              {talent.slice(0, 6).map((t, i) => (
                <div key={t.student_id} className="col-span-12 md:col-span-6 lg:col-span-4 border border-line-strong p-5 bg-bone-100/50 hover:bg-paper hover:shadow-sm transition-all" data-testid={`talent-${i}`}>
                  <div className="font-display text-lg tracking-tight uppercase">{t.name}</div>
                  <div className="font-mono text-[9px] tracking-[0.2em] text-ink-400 uppercase mt-0.5">{t.department} / {t.roll_number}</div>
                  <div className="grid grid-cols-3 gap-3 mt-5 pt-3 border-t border-line text-xs font-mono">
                    <div>
                      <div className="text-[9px] text-ink-400">CGPA</div>
                      <div className="font-display text-lg mt-0.5 tnum">{t.cgpa}</div>
                    </div>
                    <div>
                      <div className="text-[9px] text-ink-400">READINESS</div>
                      <div className="font-display text-lg mt-0.5 text-accent tnum">{t.readiness_score}</div>
                    </div>
                    <div>
                      <div className="text-[9px] text-ink-400">ATS MATCH</div>
                      <div className="font-display text-lg mt-0.5 tnum">{t.ats_score}%</div>
                    </div>
                  </div>
                </div>
              ))}
              {talent.length === 0 && (
                <div className="col-span-12">
                  <EmptyState title="No shortlists logged" description="Start browsing the talent pool and shortlist candidates for your active recruitment drives." />
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </TabsRoot>
    </PageTransition>
  );
}
