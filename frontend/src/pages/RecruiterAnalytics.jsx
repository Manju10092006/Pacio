import React, { useEffect, useState } from "react";
import { api } from "../lib/api";
import { toast } from "sonner";
import AICopilot from "../components/AICopilot";

export default function RecruiterAnalytics() {
  const [analytics, setAnalytics] = useState(null);
  const [recs, setRecs] = useState([]);
  const [shortlists, setShortlists] = useState([]);

  const load = async () => {
    const [aRes, rRes, sRes] = await Promise.allSettled([
      api.get("/recruiters/me/analytics"),
      api.get("/recruiters/me/recommendations"),
      api.get("/recruiters/me/shortlists"),
    ]);
    if (aRes.status === "fulfilled") setAnalytics(aRes.value.data);
    else setAnalytics({ pipeline: {}, job_funnels: [], action_queue: [], summary: {} });
    if (rRes.status === "fulfilled") setRecs(rRes.value.data?.items || rRes.value.data?.recommendations || []);
    if (sRes.status === "fulfilled") setShortlists(sRes.value.data?.items || sRes.value.data?.shortlists || []);
  };
  useEffect(() => { load(); }, []);

  const shortlistCandidate = async (student_id, job_id) => {
    try {
      await api.post("/recruiters/me/shortlists", { student_id, job_id: job_id || "general" });
      toast.success("Shortlisted");
      load();
    } catch { toast.error("Failed to shortlist"); }
  };

  if (!analytics) return <div className="font-mono text-xs text-ink-400">LOADING RECRUITER INTELLIGENCE...</div>;

  const a = analytics;
  const pipeline = a.pipeline || {};
  const jobFunnels = a.job_funnels || a.per_job || [];
  const packages = a.package_intelligence || a.packages || {};
  const upcoming = a.upcoming_interviews || [];
  const actions = a.action_queue || a.actions || [];

  return (
    <div className="space-y-10">
      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-12 md:col-span-8 editorial p-10">
          <div className="font-mono text-[10px] tracking-[0.28em] text-ink-400">RECRUITER INTELLIGENCE</div>
          <h1 className="font-display text-5xl md:text-6xl tracking-tightest mt-3">Hiring intelligence.</h1>
          <p className="font-serif text-lg text-ink-500 mt-2 max-w-xl">Pipeline analytics, candidate matching, conversion tracking, and recommended next interviews.</p>
        </div>
        <div className="col-span-12 md:col-span-4 editorial bg-ink-900 text-bone-100 p-10">
          <div className="font-mono text-[10px] tracking-[0.28em] text-bone-100/40">TOTAL PIPELINE</div>
          <div className="font-display text-[8vw] md:text-[6vw] tracking-tightest leading-[0.9] tnum text-accent">{pipeline.total || a.total_candidates || 0}</div>
          <div className="text-bone-100/60 text-sm">{pipeline.conversion_rate || a.conversion_rate || 0}% conversion rate</div>
        </div>
      </div>

      <AICopilot surface="recruiter-analytics" />

      <div className="grid grid-cols-12 gap-3">
        {[
          { label: "Active Jobs", value: a.active_jobs || pipeline.active_jobs || 0, sub: "open positions" },
          { label: "Conversion Rate", value: `${pipeline.conversion_rate || a.conversion_rate || 0}%`, sub: "app → offer" },
          { label: "Avg Package", value: `${packages.avg_lpa || packages.avg || 0} LPA`, sub: "offered CTC" },
          { label: "Shortlisted", value: shortlists.length, sub: "candidates saved" },
        ].map(card => (
          <div key={card.label} className="col-span-12 md:col-span-3 editorial p-6">
            <div className="font-mono text-[10px] tracking-[0.24em] text-ink-400">{card.label.toUpperCase()}</div>
            <div className="font-display text-5xl tracking-tightest mt-3 tnum">{card.value}</div>
            <div className="text-sm text-ink-500 mt-2">{card.sub}</div>
          </div>
        ))}
      </div>

      {jobFunnels.length > 0 && (
        <div className="editorial p-8">
          <div className="font-mono text-[10px] tracking-[0.24em] text-ink-400">PER-JOB PIPELINE</div>
          <div className="mt-5 space-y-6">
            {jobFunnels.slice(0, 6).map((job, i) => (
              <div key={job.job_id || i} className="border border-line p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-display text-xl">{job.title || job.job_title}</div>
                    <div className="font-mono text-xs text-ink-400 mt-1">{job.company || ""}</div>
                  </div>
                  <div className="font-display text-2xl tnum text-accent">{job.conversion_rate || job.conversion || 0}%</div>
                </div>
                <div className="grid grid-cols-5 gap-3 mt-4">
                  {["Applied", "Shortlisted", "Interview", "Selected", "Rejected"].map(stage => (
                    <div key={stage}>
                      <div className="font-mono text-[9px] text-ink-400">{stage.toUpperCase()}</div>
                      <div className="font-display text-2xl tnum mt-1">{job[stage.toLowerCase()] || job.stages?.[stage.toLowerCase()] || 0}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {recs.length > 0 && (
        <div className="editorial p-8 bg-ink-900 text-bone-100">
          <div className="font-mono text-[10px] tracking-[0.24em] text-bone-100/40">WHO SHOULD YOU INTERVIEW NEXT?</div>
          <p className="text-sm text-bone-100/50 mt-2">AI-powered candidate recommendations ranked by interview-next score.</p>
          <div className="mt-6 divide-y divide-bone-100/10">
            {recs.slice(0, 8).map((rec, i) => (
              <div key={rec.student_id || i} className="grid grid-cols-12 gap-3 py-4">
                <div className="col-span-3">
                  <div className="font-medium">{rec.name || rec.student_name}</div>
                  <div className="text-xs text-bone-100/40">{rec.department} / {rec.roll_number || ""}</div>
                </div>
                <div className="col-span-2 font-display text-xl tnum text-accent">{rec.interview_next_score || rec.score || 0}</div>
                <div className="col-span-3">
                  <div className="flex flex-wrap gap-1">
                    {(rec.matched_skills || []).slice(0, 3).map(s => (
                      <span key={s} className="text-[10px] px-2 py-0.5 bg-bone-100/10">{s}</span>
                    ))}
                  </div>
                </div>
                <div className="col-span-2">
                  <span className={`text-xs px-2 py-1 ${
                    (rec.classification || rec.answer) === "Interview next" ? "bg-green-900/30 text-green-300" :
                    (rec.classification || rec.answer) === "Keep warm" ? "bg-yellow-900/30 text-yellow-300" :
                    "bg-bone-100/10 text-bone-100/60"
                  }`}>{rec.classification || rec.answer || rec.recommendation}</span>
                </div>
                <div className="col-span-2 text-right">
                  <button onClick={() => shortlistCandidate(rec.student_id, rec.job_id)} className="text-xs font-mono px-3 py-1 border border-bone-100/20 hover:bg-bone-100/10 transition-colors">SHORTLIST</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {upcoming.length > 0 && (
        <div className="editorial p-8">
          <div className="font-mono text-[10px] tracking-[0.24em] text-ink-400">UPCOMING INTERVIEWS</div>
          <div className="mt-5 divide-y divide-line">
            {upcoming.slice(0, 6).map((evt, i) => (
              <div key={evt.interview_id || i} className="grid grid-cols-12 gap-3 py-4 text-sm">
                <div className="col-span-3 font-medium">{evt.student_name || evt.candidate}</div>
                <div className="col-span-3 font-mono text-xs text-ink-500">{evt.starts_at || evt.date}</div>
                <div className="col-span-2">{evt.type || "Interview"}</div>
                <div className="col-span-2">{evt.company || ""}</div>
                <div className="col-span-2 text-right">
                  <span className="text-xs px-2 py-1 bg-bone-100 border border-line">{evt.status || "Scheduled"}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {actions.length > 0 && (
        <div className="editorial p-8 bg-bone-50">
          <div className="font-mono text-[10px] tracking-[0.24em] text-ink-400">ACTION QUEUE</div>
          <div className="mt-5 space-y-3">
            {actions.map((action, i) => (
              <div key={i} className="border border-line bg-white p-4 flex gap-3">
                <span className="text-accent font-display text-lg">→</span>
                <div>
                  <div className="font-medium">{action.title || action.label || action}</div>
                  {action.description && <div className="text-sm text-ink-500 mt-1">{action.description}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
