import React, { useEffect, useState, useRef } from "react";
import { api } from "../lib/api";
import { toast } from "sonner";
import { Badge, Progress, Button, Select, EmptyState } from "../components/Primitives";
import { PageTransition, CounterAnimation, DashboardReveal } from "../components/Motion";
import { DataTable } from "../components/DataTable";

export default function StudentATS() {
  const [latest, setLatest] = useState(null);
  const [versions, setVersions] = useState([]);
  const [heatmap, setHeatmap] = useState([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  const [compareId1, setCompareId1] = useState("");
  const [compareId2, setCompareId2] = useState("");

  useEffect(() => {
    if (versions.length >= 2) {
      setCompareId1(versions[1].resume_id);
      setCompareId2(versions[0].resume_id);
    }
  }, [versions]);

  const load = async () => {
    try {
      const [latestRes, versionsRes, heatmapRes] = await Promise.allSettled([
        api.get("/ats/me/latest"),
        api.get("/ats/resume-versions"),
        api.get("/ats/heatmap"),
      ]);
      if (latestRes.status === "fulfilled") setLatest(latestRes.value.data);
      if (versionsRes.status === "fulfilled") setVersions(versionsRes.value.data?.items || []);
      if (heatmapRes.status === "fulfilled") setHeatmap(heatmapRes.value.data?.keywords || []);
    } catch {}
  };

  useEffect(() => { load(); }, []);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      await api.post("/ats/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success("Resume uploaded and scored");
      await load();
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const report = latest?.report || latest || {};
  const score = report.ats_score || report.score || 0;

  const verColumns = [
    {
      key: "version",
      header: "Ver",
      sortable: true,
      render: (v, row) => {
        const verNum = v || (versions.length - versions.indexOf(row));
        return <span className="font-display text-lg font-bold">v{verNum}</span>;
      },
    },
    {
      key: "upload_date",
      header: "Date",
      sortable: true,
      render: (date, row) => (
        <span className="font-mono text-xs text-ink/60">
          {date || row.created_at || "—"}
        </span>
      ),
    },
    {
      key: "ats_score",
      header: "ATS Score",
      sortable: true,
      render: (sc, row) => {
        const currentScore = sc || row.score || 0;
        return (
          <span
            className="font-display text-lg font-semibold tnum"
            style={{
              color:
                currentScore >= 80
                  ? "#0a0a0a"
                  : currentScore >= 60
                  ? "#d4a017"
                  : "#ff3b00",
            }}
          >
            {currentScore}
          </span>
        );
      },
    },
    {
      key: "keyword_score",
      header: "Keyword",
      sortable: true,
      render: (kw) => <span className="font-mono tnum">{kw || 0}%</span>,
    },
    {
      key: "format_score",
      header: "Format",
      sortable: true,
      render: (fmt) => <span className="font-mono tnum">{fmt || 0}%</span>,
    },
    {
      key: "delta",
      header: "Delta",
      render: (_, row) => {
        const idx = versions.indexOf(row);
        const prev = versions[idx + 1];
        const currentScore = row.ats_score || row.score || 0;
        const prevScore = prev ? (prev.ats_score || prev.score || 0) : 0;
        const delta = prev ? currentScore - prevScore : 0;
        return (
          <span
            className="font-mono tnum font-bold"
            style={{
              color: delta > 0 ? "#22c55e" : delta < 0 ? "#ff3b00" : "#888",
            }}
          >
            {delta > 0 ? "+" : ""}
            {delta}
          </span>
        );
      },
    },
  ];

  return (
    <PageTransition className="space-y-10">
      <DashboardReveal className="grid grid-cols-12 gap-4">
        <div className="col-span-12 md:col-span-8 editorial p-10 dash-reveal">
          <div className="font-mono text-[10px] tracking-[0.28em] text-ink-400">§ YOUR RESUME · ATS TRACKER</div>
          <h1 className="font-display text-5xl md:text-6xl tracking-tightest mt-3">Resume intelligence.</h1>
          <p className="font-serif text-lg text-ink-500 mt-2 max-w-xl">
            ATS score, keyword gaps, version history, and recruiter compatibility for your resume.
          </p>
        </div>
        <div className="col-span-12 md:col-span-4 editorial bg-ink text-bone p-10 flex flex-col justify-between dash-reveal">
          <div>
            <div className="font-mono text-[10px] tracking-[0.28em] text-bone/45">CURRENT ATS SCORE</div>
            <div className="font-display text-[8vw] md:text-[6vw] tracking-tightest leading-[0.9] tnum text-accent">
              <CounterAnimation value={score} />
            </div>
            <div className="text-bone/60 text-sm mt-1">{versions.length} version{versions.length !== 1 ? "s" : ""} tracked</div>
          </div>
          <div className="mt-6">
            <Progress value={score} />
          </div>
        </div>
      </DashboardReveal>

      <DashboardReveal className="grid grid-cols-12 gap-4">
        {[
          { label: "Keyword Match", value: `${report.keyword_score || 0}%`, sub: "role keyword coverage" },
          { label: "Format Score", value: `${report.format_score || 0}%`, sub: "ATS parser quality" },
          { label: "Versions", value: versions.length, sub: "resume iterations" },
          { label: "Missing Keywords", value: (report.missing_keywords || []).length, sub: "gaps detected" },
        ].map((card) => (
          <div key={card.label} className="col-span-12 md:col-span-3 editorial p-6 dash-reveal">
            <div className="font-mono text-[10px] tracking-[0.24em] text-ink-400">{card.label.toUpperCase()}</div>
            <div className="font-display text-5xl tracking-tightest mt-4 tnum">{card.value}</div>
            <div className="text-sm text-ink-500 mt-2 font-serif">{card.sub}</div>
          </div>
        ))}
      </DashboardReveal>

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 md:col-span-5 editorial p-8 bg-ink text-bone flex flex-col justify-between">
          <div>
            <div className="font-mono text-[10px] tracking-[0.24em] text-bone/45">UPLOAD NEW RESUME</div>
            <p className="text-sm text-bone/70 mt-3 font-serif">Upload a PDF resume to get an updated ATS score and keyword analysis.</p>
          </div>
          <label className={`mt-8 block border border-dashed border-bone/35 p-8 text-center cursor-pointer hover:border-accent hover:bg-bone/5 transition-all ${uploading ? "opacity-50 pointer-events-none" : ""}`}>
            <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={handleUpload} disabled={uploading} />
            <div className="font-mono text-xs uppercase tracking-wider text-bone/60">{uploading ? "SCORING IN PROGRESS..." : "DRAG RESUME PDF OR CLICK"}</div>
          </label>
        </div>

        <div className="col-span-12 md:col-span-7 editorial p-8 bg-paper">
          <div className="font-mono text-[10px] tracking-[0.24em] text-ink-400">MISSING KEYWORDS</div>
          <div className="mt-5 flex flex-wrap gap-2">
            {(report.missing_keywords || []).map((kw) => (
              <Badge key={kw} variant="outline" className="text-xs py-1 px-3">
                {kw}
              </Badge>
            ))}
            {(report.missing_keywords || []).length === 0 && (
              <EmptyState title="All keywords matched" description="Your resume has perfect keyword matching with open recruitment guidelines." />
            )}
          </div>

          {(report.recommendations || report.improvement_suggestions || []).length > 0 && (
            <div className="mt-8 pt-6 border-t border-line">
              <div className="font-mono text-[10px] tracking-[0.24em] text-ink-400">IMPROVEMENT SUGGESTIONS</div>
              <div className="mt-4 space-y-2.5">
                {(report.recommendations || report.improvement_suggestions || []).map((s, i) => (
                  <div key={i} className="text-sm text-ink/75 flex gap-2 font-serif">
                    <span className="text-accent">→</span> {typeof s === "string" ? s : s.text || s.suggestion}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {heatmap.length > 0 && (
        <div className="editorial p-8 bg-paper">
          <div className="font-mono text-[10px] tracking-[0.24em] text-ink-400 mb-6">KEYWORD HEATMAP</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {heatmap.slice(0, 10).map((k) => (
              <div key={k.keyword} className="space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="font-semibold">{k.keyword}</span>
                  <span className="font-mono text-ink-400">{k.coverage_gap_pct || k.gap || 0}% gap</span>
                </div>
                <Progress value={100 - (k.coverage_gap_pct || k.gap || 0)} />
              </div>
            ))}
          </div>
        </div>
      )}

      {versions.length > 1 && (
        <div className="editorial p-8 bg-paper" data-testid="ats-compare-section">
          <div className="font-mono text-[10px] tracking-[0.24em] text-ink-400">COMPARE VERSIONS</div>
          <h3 className="font-display text-2xl tracking-tight mt-1 mb-6">Side-by-Side Version Comparison</h3>

          <div className="flex flex-wrap gap-4 items-center mb-6 p-4 bg-bone-100/50 border border-line-strong">
            <div className="space-y-1">
              <label className="block font-mono text-[10px] text-ink-400">VERSION A (BASE)</label>
              <Select
                value={compareId1}
                onChange={(e) => setCompareId1(e.target.value)}
                className="py-1.5 px-3 text-xs w-64"
              >
                <option value="">Select version...</option>
                {versions.map((v, i) => (
                  <option key={v.resume_id} value={v.resume_id}>
                    v{v.version || versions.length - i} ({v.uploaded_filename || "Resume"})
                  </option>
                ))}
              </Select>
            </div>
            <div className="font-mono text-lg text-ink-400">VS</div>
            <div className="space-y-1">
              <label className="block font-mono text-[10px] text-ink-400">VERSION B (TARGET)</label>
              <Select
                value={compareId2}
                onChange={(e) => setCompareId2(e.target.value)}
                className="py-1.5 px-3 text-xs w-64"
              >
                <option value="">Select version...</option>
                {versions.map((v, i) => (
                  <option key={v.resume_id} value={v.resume_id}>
                    v{v.version || versions.length - i} ({v.uploaded_filename || "Resume"})
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {(() => {
            const ver1 = versions.find((v) => v.resume_id === compareId1);
            const ver2 = versions.find((v) => v.resume_id === compareId2);
            if (!ver1 || !ver2) {
              return <div className="text-sm text-ink-400 italic">Please select two different versions to compare.</div>;
            }
            let v1 = ver1;
            let v2 = ver2;
            if (ver1.version > ver2.version) {
              v1 = ver2;
              v2 = ver1;
            }

            const score1 = v1.ats_score || v1.score || 0;
            const score2 = v2.ats_score || v2.score || 0;
            const delta = score2 - score1;

            const kw1 = v1.missing_keywords || [];
            const kw2 = v2.missing_keywords || [];

            const resolvedKeywords = kw1.filter((kw) => !kw2.includes(kw));
            const stillMissingKeywords = kw2;
            const newlyMissingKeywords = kw2.filter((kw) => !kw1.includes(kw));

            return (
              <div className="grid grid-cols-12 gap-6 border-t border-line pt-6">
                <div className="col-span-12 md:col-span-4 border-r border-line pr-6 space-y-4">
                  <div>
                    <div className="font-mono text-[10px] tracking-[0.24em] text-ink-400">ATS SCORE DELTA</div>
                    <div className="flex items-baseline gap-3 mt-2">
                      <span className="font-display text-4xl tnum">{score1} → {score2}</span>
                      <span
                        className="font-mono text-xl font-bold tnum"
                        style={{
                          color: delta > 0 ? "#22c55e" : delta < 0 ? "#ff3b00" : "#888",
                        }}
                      >
                        ({delta > 0 ? "+" : ""}
                        {delta})
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm pt-2 border-t border-line/60">
                    <div>
                      <span className="text-ink-400 font-mono block text-xs">v{v1.version} KEYWORD</span>
                      <span className="font-mono font-semibold">{v1.keyword_score || 0}%</span>
                    </div>
                    <div>
                      <span className="text-ink-400 font-mono block text-xs">v{v2.version} KEYWORD</span>
                      <span className="font-mono font-semibold">{v2.keyword_score || 0}%</span>
                    </div>
                    <div className="mt-2">
                      <span className="text-ink-400 font-mono block text-xs">v{v1.version} FORMAT</span>
                      <span className="font-mono font-semibold">{v1.format_score || 0}%</span>
                    </div>
                    <div className="mt-2">
                      <span className="text-ink-400 font-mono block text-xs">v{v2.version} FORMAT</span>
                      <span className="font-mono font-semibold">{v2.format_score || 0}%</span>
                    </div>
                  </div>
                </div>

                <div className="col-span-12 md:col-span-4 border-r border-line px-2 md:px-6">
                  <div className="font-mono text-[10px] tracking-[0.24em] text-emerald-600 mb-3 uppercase font-semibold">
                    Resolved Keywords (Missing in v{v1.version} but found in v{v2.version})
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {resolvedKeywords.map((kw) => (
                      <Badge key={kw} variant="success">{kw}</Badge>
                    ))}
                    {resolvedKeywords.length === 0 && <span className="text-xs text-ink-400 italic">None</span>}
                  </div>
                </div>

                <div className="col-span-12 md:col-span-4 px-2 md:pl-6">
                  <div className="font-mono text-[10px] tracking-[0.24em] text-rose-600 mb-3 uppercase font-semibold">
                    Still Missing Keywords in v{v2.version}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {stillMissingKeywords.map((kw) => (
                      <Badge key={kw} variant="danger">{kw}</Badge>
                    ))}
                    {stillMissingKeywords.length === 0 && <span className="text-xs text-ink-400 italic">None</span>}
                  </div>

                  {newlyMissingKeywords.length > 0 && (
                    <div className="mt-6 pt-4 border-t border-line/60">
                      <div className="font-mono text-[10px] tracking-[0.24em] text-ink-400 mb-2 uppercase font-semibold">
                        Newly Missing in v{v2.version}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {newlyMissingKeywords.map((kw) => (
                          <Badge key={kw} variant="warning">{kw}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {versions.length > 0 && (
        <div className="editorial p-8 bg-paper">
          <div className="border-b border-line pb-4 mb-6">
            <div className="font-mono text-[10px] tracking-[0.24em] text-ink-400">RESUME VERSION HISTORY</div>
          </div>
          <DataTable data={versions} columns={verColumns} initialPageSize={5} />
        </div>
      )}
    </PageTransition>
  );
}
